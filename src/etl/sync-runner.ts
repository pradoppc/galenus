/**
 * Wrapper so the ETL can be triggered from the API route without process.exit().
 * The sync.ts script is the standalone CLI version.
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../db/schema'
import { fetchAllRecords } from './bnafar-client'

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase()).trim()
}

function parseQuantity(v: string | number | null | undefined) {
  if (v === null || v === undefined) return 0
  const n = parseFloat(String(v))
  return isNaN(n) ? 0 : Math.floor(n)
}

function parseCoord(v: string | null | undefined): string | null {
  if (!v) return null
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n.toFixed(7)
}

function buildAddress(r: Parameters<typeof fetchAllRecords>[0] extends never ? never : Awaited<ReturnType<ReturnType<typeof fetchAllRecords>['next']>>['value'][number]): string | null {
  const parts = [r.no_logradouro, r.nu_endereco, r.no_bairro, r.no_municipio, r.sg_uf].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}

export async function runSync(logId: string) {
  const conn = neon(process.env.DATABASE_URL!)
  const db   = drizzle(conn, { schema })

  const farmaciaCache    = new Map<string, string>()
  const medicamentoCache = new Map<string, string>()

  let farmaciasN     = 0
  let medicamentosN  = 0
  let estoquesN      = 0

  try {
    for await (const page of fetchAllRecords(500)) {
      const fMap = new Map<string, typeof schema.farmacias.$inferInsert>()
      const mMap = new Map<string, typeof schema.medicamentos.$inferInsert>()

      for (const r of page) {
        if (!r.co_cnes || !r.co_catmat || !r.ds_produto) continue
        fMap.set(r.co_cnes, {
          cnes: r.co_cnes.trim(), nome: toTitleCase(r.no_razao_social ?? ''),
          municipio: toTitleCase(r.no_municipio ?? ''), uf: (r.sg_uf ?? '').toUpperCase().trim(),
          endereco: buildAddress(r), latitude: parseCoord(r.nu_latitude),
          longitude: parseCoord(r.nu_longitude), programa: r.ds_programa_saude ?? null,
          updatedAt: new Date(),
        })
        mMap.set(r.co_catmat, {
          principioAtivo: r.ds_produto.substring(0, 500),
          produto: toTitleCase(r.ds_produto.substring(0, 500)),
          codigoCatmat: r.co_catmat.trim(), programa: r.sg_programa_saude ?? null,
        })
      }

      if (fMap.size) {
        await db.insert(schema.farmacias).values([...fMap.values()])
          .onConflictDoUpdate({ target: schema.farmacias.cnes, set: { nome: sql`excluded.nome`, municipio: sql`excluded.municipio`, uf: sql`excluded.uf`, endereco: sql`excluded.endereco`, latitude: sql`excluded.latitude`, longitude: sql`excluded.longitude`, updatedAt: sql`now()` } })
        farmaciasN += fMap.size
      }
      if (mMap.size) {
        await db.insert(schema.medicamentos).values([...mMap.values()])
          .onConflictDoUpdate({ target: schema.medicamentos.codigoCatmat, set: { principioAtivo: sql`excluded.principio_ativo`, produto: sql`excluded.produto`, programa: sql`excluded.programa` } })
        medicamentosN += mMap.size
      }

      for (const r of page) {
        if (!r.co_cnes || !r.co_catmat) continue
        if (!farmaciaCache.has(r.co_cnes)) {
          const rows = await db.select({ id: schema.farmacias.id }).from(schema.farmacias).where(eq(schema.farmacias.cnes, r.co_cnes)).limit(1)
          if (rows[0]) farmaciaCache.set(r.co_cnes, rows[0].id)
        }
        if (!medicamentoCache.has(r.co_catmat)) {
          const rows = await db.select({ id: schema.medicamentos.id }).from(schema.medicamentos).where(eq(schema.medicamentos.codigoCatmat, r.co_catmat)).limit(1)
          if (rows[0]) medicamentoCache.set(r.co_catmat, rows[0].id)
        }
        const fId = farmaciaCache.get(r.co_cnes)
        const mId = medicamentoCache.get(r.co_catmat)
        if (!fId || !mId) continue
        const posDate = r.dt_posicao_estoque ? new Date(r.dt_posicao_estoque.replace(/\//g, '-')) : new Date()
        await db.insert(schema.estoques).values({ farmaciaId: fId, medicamentoId: mId, quantidade: parseQuantity(r.qt_estoque), atualizadoEm: isNaN(posDate.getTime()) ? new Date() : posDate, sincronizadoEm: new Date() })
          .onConflictDoUpdate({ target: [schema.estoques.farmaciaId, schema.estoques.medicamentoId], set: { quantidade: sql`excluded.quantidade`, atualizadoEm: sql`excluded.atualizado_em`, sincronizadoEm: sql`now()` } })
        estoquesN++
      }
    }

    await db.update(schema.etlLogs).set({ finalizadoEm: new Date(), status: 'success', farmaciaProcessadas: farmaciasN, medicamentosProcessados: medicamentosN, estoquesProcessados: estoquesN }).where(eq(schema.etlLogs.id, logId))
  } catch (err) {
    await db.update(schema.etlLogs).set({ finalizadoEm: new Date(), status: 'error', erroMensagem: String(err) }).where(eq(schema.etlLogs.id, logId))
    throw err
  }
}
