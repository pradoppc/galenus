/**
 * ETL sync script — BNAFAR → Galenus database
 * Run via: npm run etl:sync
 * Scheduled: 08:00, 12:00, 18:00 Brasília time (11:00, 15:00, 21:00 UTC)
 */

import { config } from 'dotenv'
// Next.js usa .env.local; carrega também em execução standalone do ETL
config({ path: '.env.local' })
config() // fallback para .env se existir
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { fetchAllRecords, type BnafarRecord } from './bnafar-client'

const conn = neon(process.env.DATABASE_URL!)
const db   = drizzle(conn, { schema })

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, c => c.toUpperCase())
    .trim()
}

function normalizeUF(uf: string): string {
  return uf.trim().toUpperCase()
}

function parseQuantity(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  const n = parseFloat(String(val))
  return isNaN(n) ? 0 : Math.floor(n)
}

function parseCoord(val: string | null | undefined): string | null {
  if (!val) return null
  const n = parseFloat(val.replace(',', '.'))
  return isNaN(n) ? null : n.toFixed(7)
}

function buildAddress(record: BnafarRecord): string | null {
  const parts = [
    record.no_logradouro,
    record.nu_endereco,
    record.no_bairro,
    record.no_municipio,
    record.sg_uf,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

async function sync() {
  console.log('[Galenus ETL] Iniciando sincronização BNAFAR...')

  // Create ETL log entry
  const [log] = await db.insert(schema.etlLogs).values({
    status: 'running',
    fonte:  process.env.ETL_SOURCE ?? 'cron',
  }).returning()

  const logId = log.id

  let farmaciaCount     = 0
  let medicamentoCount  = 0
  let estoqueCount      = 0

  // Caches to avoid redundant DB lookups within a single run
  const farmaciaCache     = new Map<string, string>()  // cnes → id
  const medicamentoCache  = new Map<string, string>()  // catmat → id

  try {
    for await (const page of fetchAllRecords(500)) {
      // Batch upserts per page
      const farmaciaUpserts  = new Map<string, typeof schema.farmacias.$inferInsert>()
      const medicamentoUpserts = new Map<string, typeof schema.medicamentos.$inferInsert>()

      for (const record of page) {
        if (!record.co_cnes || !record.co_catmat || !record.ds_produto) continue

        // Normalize farmácia
        farmaciaUpserts.set(record.co_cnes, {
          cnes:      record.co_cnes.trim(),
          nome:      toTitleCase(record.no_razao_social ?? record.no_fantasia ?? 'Estabelecimento'),
          municipio: toTitleCase(record.no_municipio ?? ''),
          uf:        normalizeUF(record.sg_uf ?? ''),
          endereco:  buildAddress(record),
          latitude:  parseCoord(record.nu_latitude),
          longitude: parseCoord(record.nu_longitude),
          programa:  record.ds_programa_saude ?? null,
          updatedAt: new Date(),
        })

        // Normalize medicamento — use full product description as principio_ativo
        medicamentoUpserts.set(record.co_catmat, {
          principioAtivo: (record.ds_produto ?? '').substring(0, 500),
          produto:        toTitleCase((record.ds_produto ?? '').substring(0, 500)),
          codigoCatmat:   record.co_catmat.trim(),
          programa:       record.sg_programa_saude ?? null,
        })
      }

      // Upsert farmacias
      if (farmaciaUpserts.size > 0) {
        const values = Array.from(farmaciaUpserts.values())
        await db.insert(schema.farmacias)
          .values(values)
          .onConflictDoUpdate({
            target: schema.farmacias.cnes,
            set: {
              nome:      sql`excluded.nome`,
              municipio: sql`excluded.municipio`,
              uf:        sql`excluded.uf`,
              endereco:  sql`excluded.endereco`,
              latitude:  sql`excluded.latitude`,
              longitude: sql`excluded.longitude`,
              updatedAt: sql`now()`,
            },
          })
        farmaciaCount += values.length
      }

      // Upsert medicamentos
      if (medicamentoUpserts.size > 0) {
        const values = Array.from(medicamentoUpserts.values())
        await db.insert(schema.medicamentos)
          .values(values)
          .onConflictDoUpdate({
            target: schema.medicamentos.codigoCatmat,
            set: {
              principioAtivo: sql`excluded.principio_ativo`,
              produto:        sql`excluded.produto`,
              programa:       sql`excluded.programa`,
            },
          })
        medicamentoCount += values.length
      }

      // Build estoque records — need farmacia_id and medicamento_id
      for (const record of page) {
        if (!record.co_cnes || !record.co_catmat) continue

        // Fetch IDs (with cache)
        if (!farmaciaCache.has(record.co_cnes)) {
          const rows = await db.select({ id: schema.farmacias.id })
            .from(schema.farmacias)
            .where(eq(schema.farmacias.cnes, record.co_cnes))
            .limit(1)
          if (rows.length > 0) farmaciaCache.set(record.co_cnes, rows[0].id)
        }

        if (!medicamentoCache.has(record.co_catmat)) {
          const rows = await db.select({ id: schema.medicamentos.id })
            .from(schema.medicamentos)
            .where(eq(schema.medicamentos.codigoCatmat, record.co_catmat))
            .limit(1)
          if (rows.length > 0) medicamentoCache.set(record.co_catmat, rows[0].id)
        }

        const farmaciaId    = farmaciaCache.get(record.co_cnes)
        const medicamentoId = medicamentoCache.get(record.co_catmat)
        if (!farmaciaId || !medicamentoId) continue

        const posDate = record.dt_posicao_estoque
          ? new Date(record.dt_posicao_estoque.replace(/\//g, '-'))
          : new Date()

        await db.insert(schema.estoques)
          .values({
            farmaciaId,
            medicamentoId,
            quantidade:     parseQuantity(record.qt_estoque),
            atualizadoEm:   isNaN(posDate.getTime()) ? new Date() : posDate,
            sincronizadoEm: new Date(),
          })
          .onConflictDoUpdate({
            target: [schema.estoques.farmaciaId, schema.estoques.medicamentoId],
            set: {
              quantidade:     sql`excluded.quantidade`,
              atualizadoEm:   sql`excluded.atualizado_em`,
              sincronizadoEm: sql`now()`,
            },
          })
        estoqueCount++
      }
    }

    await db.update(schema.etlLogs)
      .set({
        finalizadoEm:            new Date(),
        status:                  'success',
        farmaciaProcessadas:     farmaciaCount,
        medicamentosProcessados: medicamentoCount,
        estoquesProcessados:     estoqueCount,
      })
      .where(eq(schema.etlLogs.id, logId))

    console.log(`[Galenus ETL] Concluído com sucesso.`)
    console.log(`  Farmácias: ${farmaciaCount}`)
    console.log(`  Medicamentos: ${medicamentoCount}`)
    console.log(`  Estoques: ${estoqueCount}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[Galenus ETL] Erro:', msg)

    await db.update(schema.etlLogs)
      .set({
        finalizadoEm: new Date(),
        status:       'error',
        erroMensagem: msg,
      })
      .where(eq(schema.etlLogs.id, logId))

    process.exit(1)
  }
}

sync()
