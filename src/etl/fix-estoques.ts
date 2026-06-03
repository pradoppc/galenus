/**
 * Corrige estoques com qty=0 causados pelo bug de múltiplos lotes.
 * Usa UNNEST para UPDATE em lote — muito mais eficiente que individual.
 * Uso: npm run etl:fix-estoques -- /caminho/arquivo.csv
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '../db/schema'

const conn = neon(process.env.DATABASE_URL!)
const db   = drizzle(conn, { schema })

function parseQty(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : Math.floor(n)
}

const CHUNK = 500  // linhas por UPDATE UNNEST

async function batchUpdate(fIds: string[], mIds: string[], qtys: number[]) {
  await conn`
    UPDATE estoques AS e
    SET quantidade = v.qty
    FROM (
      SELECT
        UNNEST(${fIds}::uuid[])   AS fid,
        UNNEST(${mIds}::uuid[])   AS mid,
        UNNEST(${qtys}::bigint[]) AS qty
    ) AS v
    WHERE e.farmacia_id    = v.fid
      AND e.medicamento_id = v.mid
      AND e.quantidade     = 0
  `
}

async function fixEstoques(csvPath: string) {
  console.log('[Fix Estoques] Lendo CSV (lógica correta: soma lotes mesma data)...')

  // Passo 1: Reconstruir mapa correto a partir do CSV
  const correctMap = new Map<string, { qty: number; date: string }>()
  let lines = 0, first = true
  let headers: string[] = []

  const rl = createInterface({ input: createReadStream(csvPath, { encoding: 'latin1' }), crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    const cols = line.split(';').map(c => c.trim().replace(/^"(.*)"$/s, '$1').replace(/""/g, '"'))
    if (first) { headers = cols.map(h => h.replace(/"/g, '').toLowerCase().trim()); first = false; continue }
    lines++
    if (lines % 500_000 === 0) process.stdout.write(`\r  Lendo... ${(lines/1000).toFixed(0)}k`)

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    const cnes   = row.co_cnes?.trim()
    const catmat = row.co_catmat?.trim()
    if (!cnes || !catmat) continue

    const qty   = parseQty(row.qt_estoque || '0')
    const date  = (row.dt_posicao_estoque || '').replace(/\//g, '-')
    const key   = `${cnes}|${catmat}`
    const exist = correctMap.get(key)

    if (!exist)                         correctMap.set(key, { qty, date })
    else if (date > exist.date)         correctMap.set(key, { qty, date })
    else if (date === exist.date)       exist.qty += qty
  }
  console.log(`\n  Pares únicos: ${correctMap.size.toLocaleString()}`)

  // Passo 2: Carregar IDs
  process.stdout.write('  Carregando IDs...')
  const farmaciaIdMap    = new Map<string, string>()
  const medicamentoIdMap = new Map<string, string>()
  const allF = await db.select({ id: schema.farmacias.id, cnes: schema.farmacias.cnes }).from(schema.farmacias)
  allF.forEach(r => { if (r.cnes) farmaciaIdMap.set(r.cnes, r.id) })
  const allM = await db.select({ id: schema.medicamentos.id, catmat: schema.medicamentos.codigoCatmat }).from(schema.medicamentos)
  allM.forEach(r => { if (r.catmat) medicamentoIdMap.set(r.catmat, r.id) })
  console.log(` ✓ ${farmaciaIdMap.size} farmácias + ${medicamentoIdMap.size} medicamentos`)

  // Passo 3: Seleciona apenas pares onde qty_correto > 0 (os que precisam de UPDATE)
  const toUpdate: { fId: string; mId: string; qty: number }[] = []
  for (const [key, { qty }] of correctMap) {
    if (qty === 0) continue
    const [cnes, catmat] = key.split('|')
    const fId = farmaciaIdMap.get(cnes)
    const mId = medicamentoIdMap.get(catmat)
    if (fId && mId) toUpdate.push({ fId, mId, qty })
  }
  console.log(`  Pares com estoque > 0 para verificar: ${toUpdate.length.toLocaleString()}`)

  // Passo 4: UPDATE em lote via UNNEST
  let done = 0
  for (let i = 0; i < toUpdate.length; i += CHUNK) {
    const chunk = toUpdate.slice(i, i + CHUNK)
    const fIds  = chunk.map(r => r.fId)
    const mIds  = chunk.map(r => r.mId)
    const qtys  = chunk.map(r => r.qty)
    await batchUpdate(fIds, mIds, qtys)
    done += chunk.length
    process.stdout.write(`\r  Atualizado: ${done.toLocaleString()}/${toUpdate.length.toLocaleString()}`)
  }

  // Verificação final
  const result = await conn`SELECT COUNT(*) AS c FROM estoques WHERE quantidade = 0`
  console.log(`\n\n[Fix Estoques] Concluído!`)
  console.log(`  Pares processados: ${toUpdate.length.toLocaleString()}`)
  console.log(`  Estoques com qty=0 restantes: ${(result[0] as { c: string }).c}`)
}

const csvPath = process.argv[2]
if (!csvPath) { console.error('Uso: npm run etl:fix-estoques -- /caminho/arquivo.csv'); process.exit(1) }
fixEstoques(csvPath).catch(e => { console.error('[Fix Estoques] Erro:', e.message); process.exit(1) })
