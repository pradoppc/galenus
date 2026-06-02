/**
 * Importador de CSV BNAFAR — usa UNNEST para bulk inserts eficientes
 * Uso: npm run etl:csv -- /caminho/arquivo.csv
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../db/schema'

const DB = process.env.DATABASE_URL!
const sqlClient = neon(DB)
const db = drizzle(sqlClient, { schema })

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase()).trim()
}
function parseCoord(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : n
}
function parseQty(v: string) {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : Math.floor(n)
}

async function bulkUpsertFarmacias(rows: typeof schema.farmacias.$inferInsert[]) {
  if (!rows.length) return
  // Chunked to stay under Neon's HTTP payload limit (~50 rows safe)
  const CHUNK = 50
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    await db.insert(schema.farmacias).values(chunk).onConflictDoUpdate({
      target: schema.farmacias.cnes,
      set: { nome: sql`excluded.nome`, municipio: sql`excluded.municipio`, uf: sql`excluded.uf`, endereco: sql`excluded.endereco`, latitude: sql`excluded.latitude`, longitude: sql`excluded.longitude`, updatedAt: sql`now()` },
    })
    process.stdout.write(`\r  Farmácias: ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}`)
  }
  console.log(' ✓')
}

async function bulkUpsertMedicamentos(rows: typeof schema.medicamentos.$inferInsert[]) {
  if (!rows.length) return
  const CHUNK = 50
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    await db.insert(schema.medicamentos).values(chunk).onConflictDoUpdate({
      target: schema.medicamentos.codigoCatmat,
      set: { principioAtivo: sql`excluded.principio_ativo`, produto: sql`excluded.produto`, programa: sql`excluded.programa` },
    })
    process.stdout.write(`\r  Medicamentos: ${Math.min(i + CHUNK, rows.length).toLocaleString()}/${rows.length.toLocaleString()}`)
  }
  console.log(' ✓')
}

async function bulkUpsertEstoques(rows: { fId: string; mId: string; qty: number; posDate: Date }[]) {
  if (!rows.length) return
  // Use UNNEST for super-efficient bulk upsert — single SQL call per chunk
  const CHUNK = 1000
  let done = 0
  const total = rows.length

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)

    const fIds   = chunk.map(r => r.fId)
    const mIds   = chunk.map(r => r.mId)
    const qtds   = chunk.map(r => r.qty)
    const dates  = chunk.map(r => r.posDate.toISOString())
    const now    = new Date().toISOString()

    await sqlClient`
      INSERT INTO estoques (farmacia_id, medicamento_id, quantidade, atualizado_em, sincronizado_em)
      SELECT
        UNNEST(${fIds}::uuid[]),
        UNNEST(${mIds}::uuid[]),
        UNNEST(${qtds}::bigint[]),
        UNNEST(${dates}::timestamptz[]),
        now()
      ON CONFLICT (farmacia_id, medicamento_id)
      DO UPDATE SET
        quantidade      = EXCLUDED.quantidade,
        atualizado_em   = EXCLUDED.atualizado_em,
        sincronizado_em = now()
    `
    done += chunk.length
    process.stdout.write(`\r  Estoques: ${done.toLocaleString()}/${total.toLocaleString()}`)
  }
  console.log(' ✓')
}

async function importCsv(csvPath: string) {
  console.log(`[ETL CSV] Lendo: ${csvPath}`)

  const [log] = await db.insert(schema.etlLogs).values({ status: 'running', fonte: 'csv' }).returning()

  const farmaciaMap    = new Map<string, typeof schema.farmacias.$inferInsert>()
  const medicamentoMap = new Map<string, typeof schema.medicamentos.$inferInsert>()
  const estoqueMap     = new Map<string, { cnes: string; catmat: string; qty: number; posDate: Date }>()

  let totalLines = 0, skipped = 0
  let headers: string[] = []
  let firstLine = true

  const rl = createInterface({ input: createReadStream(csvPath, { encoding: 'latin1' }), crlfDelay: Infinity })

  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = line.split(';').map(c => c.trim().replace(/^"([\s\S]*)"$/, '$1').replace(/""/g, '"'))

    if (firstLine) { headers = cols.map(h => h.replace(/"/g, '').toLowerCase().trim()); firstLine = false; continue }

    totalLines++
    if (totalLines % 500_000 === 0) process.stdout.write(`\r  Lendo... ${(totalLines / 1_000).toFixed(0)}k linhas`)

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })

    const cnes = row.co_cnes?.trim(), catmat = row.co_catmat?.trim()
    if (!cnes || !catmat || !row.ds_produto) { skipped++; continue }

    if (!farmaciaMap.has(cnes)) {
      farmaciaMap.set(cnes, {
        cnes,
        nome:      toTitleCase(row.no_razao_social || row.no_fantasia || 'Estabelecimento'),
        municipio: toTitleCase(row.no_municipio || ''),
        uf:        (row.sg_uf || '').toUpperCase().trim(),
        endereco:  [row.no_logradouro, row.nu_endereco, row.no_bairro, row.no_municipio, row.sg_uf].filter(Boolean).join(', ') || null,
        latitude:  parseCoord(row.nu_latitude || '') as unknown as string,
        longitude: parseCoord(row.nu_longitude || '') as unknown as string,
        programa:  row.ds_programa_saude || null,
        updatedAt: new Date(),
      })
    }

    if (!medicamentoMap.has(catmat)) {
      medicamentoMap.set(catmat, {
        principioAtivo: row.ds_produto.substring(0, 500),
        produto:        toTitleCase(row.ds_produto.substring(0, 500)),
        codigoCatmat:   catmat,
        programa:       row.sg_programa_saude || null,
      })
    }

    const rawDate = (row.dt_posicao_estoque || '').replace(/\//g, '-')
    const posDate = rawDate ? new Date(rawDate) : new Date()
    const key = `${cnes}|${catmat}`
    const existing = estoqueMap.get(key)
    if (!existing || posDate > existing.posDate) {
      estoqueMap.set(key, { cnes, catmat, qty: parseQty(row.qt_estoque || '0'), posDate: isNaN(posDate.getTime()) ? new Date() : posDate })
    }
  }

  console.log(`\n  Lidas: ${totalLines.toLocaleString()} | Ignoradas: ${skipped}`)
  console.log(`  Farmácias: ${farmaciaMap.size.toLocaleString()} | Medicamentos: ${medicamentoMap.size.toLocaleString()} | Estoques únicos: ${estoqueMap.size.toLocaleString()}`)

  try {
    await bulkUpsertFarmacias([...farmaciaMap.values()])
    await bulkUpsertMedicamentos([...medicamentoMap.values()])

    process.stdout.write('  Carregando IDs...')
    const farmaciaIdMap    = new Map<string, string>()
    const medicamentoIdMap = new Map<string, string>()
    const allF = await db.select({ id: schema.farmacias.id, cnes: schema.farmacias.cnes }).from(schema.farmacias)
    allF.forEach(r => { if (r.cnes) farmaciaIdMap.set(r.cnes, r.id) })
    const allM = await db.select({ id: schema.medicamentos.id, catmat: schema.medicamentos.codigoCatmat }).from(schema.medicamentos)
    allM.forEach(r => { if (r.catmat) medicamentoIdMap.set(r.catmat, r.id) })
    console.log(` ✓ ${farmaciaIdMap.size} + ${medicamentoIdMap.size}`)

    const estoqueRows = [...estoqueMap.values()]
      .map(({ cnes, catmat, qty, posDate }) => ({
        fId: farmaciaIdMap.get(cnes)!, mId: medicamentoIdMap.get(catmat)!, qty, posDate,
      }))
      .filter(r => r.fId && r.mId)

    await bulkUpsertEstoques(estoqueRows)

    await db.update(schema.etlLogs).set({
      finalizadoEm: new Date(), status: 'success',
      farmaciaProcessadas: farmaciaMap.size, medicamentosProcessados: medicamentoMap.size, estoquesProcessados: estoqueRows.length,
    }).where(eq(schema.etlLogs.id, log.id))

    console.log('\n[ETL CSV] Concluído!')
    console.log(`  Farmácias: ${farmaciaMap.size.toLocaleString()} | Medicamentos: ${medicamentoMap.size.toLocaleString()} | Estoques: ${estoqueRows.length.toLocaleString()}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('\n[ETL CSV] Erro:', msg.substring(0, 500))
    await db.update(schema.etlLogs).set({ finalizadoEm: new Date(), status: 'error', erroMensagem: msg.substring(0, 2000) }).where(eq(schema.etlLogs.id, log.id))
    process.exit(1)
  }
}

const csvPath = process.argv[2]
if (!csvPath) { console.error('Uso: npm run etl:csv -- /caminho/arquivo.csv'); process.exit(1) }
importCsv(csvPath)
