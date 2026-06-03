/**
 * Corrige estoques importados com qty=0 por causa do bug de múltiplos lotes.
 * Lógica correta: para cada par (cnes, catmat) na mesma data, SOMA as quantidades.
 * Só atualiza registros onde o valor correto difere do valor atual no banco.
 * Uso: npm run etl:fix-estoques -- /caminho/arquivo.csv
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'
import * as schema from '../db/schema'

const conn = neon(process.env.DATABASE_URL!)
const db   = drizzle(conn, { schema })

function parseQty(v: string): number {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : Math.floor(n)
}

async function fixEstoques(csvPath: string) {
  console.log('[Fix Estoques] Lendo CSV e calculando quantidades corretas...')

  // Passo 1: Reconstruir o mapa correto a partir do CSV (soma mesma data)
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

    const qty    = parseQty(row.qt_estoque || '0')
    const date   = (row.dt_posicao_estoque || '').replace(/\//g, '-')
    const key    = `${cnes}|${catmat}`
    const exist  = correctMap.get(key)

    if (!exist) {
      correctMap.set(key, { qty, date })
    } else if (date > exist.date) {
      correctMap.set(key, { qty, date })
    } else if (date === exist.date) {
      exist.qty += qty  // mesma data = lotes diferentes → soma
    }
  }

  console.log(`\n  Pares únicos: ${correctMap.size.toLocaleString()}`)

  // Passo 2: Buscar todos os IDs de farmácias e medicamentos
  process.stdout.write('  Carregando IDs do banco...')
  const farmaciaIdMap    = new Map<string, string>()
  const medicamentoIdMap = new Map<string, string>()

  const allF = await db.select({ id: schema.farmacias.id, cnes: schema.farmacias.cnes }).from(schema.farmacias)
  allF.forEach(r => { if (r.cnes) farmaciaIdMap.set(r.cnes, r.id) })

  const allM = await db.select({ id: schema.medicamentos.id, catmat: schema.medicamentos.codigoCatmat }).from(schema.medicamentos)
  allM.forEach(r => { if (r.catmat) medicamentoIdMap.set(r.catmat, r.id) })
  console.log(` ✓ ${farmaciaIdMap.size} farmácias, ${medicamentoIdMap.size} medicamentos`)

  // Passo 3: Inverte os mapas de ID para lookup
  const farmIdToCnes  = new Map<string, string>()
  farmaciaIdMap.forEach((id, cnes)   => farmIdToCnes.set(id, cnes))
  const medIdToCatmat = new Map<string, string>()
  medicamentoIdMap.forEach((id, cat) => medIdToCatmat.set(id, cat))

  // Passo 4: Para cada par do correctMap com qty>0, atualiza diretamente via
  // farmacia_id + medicamento_id para evitar buscar 1M+ rows
  let updated = 0, skipped = 0
  let total   = 0

  for (const [key, { qty }] of correctMap) {
    if (qty === 0) continue
    total++
    const [cnes, catmat] = key.split('|')
    const fId = farmaciaIdMap.get(cnes)
    const mId = medicamentoIdMap.get(catmat)
    if (!fId || !mId) { skipped++; continue }

    // Atualiza só se o valor atual for 0 (evita tocar em registros já corretos)
    const res = await conn`
      UPDATE estoques
      SET quantidade = ${qty}
      WHERE farmacia_id = ${fId}
        AND medicamento_id = ${mId}
        AND quantidade = 0
    `
    if ((res as { count?: number }).count) updated++
    else skipped++

    if ((updated + skipped) % 500 === 0)
      process.stdout.write(`\r  Processados: ${(updated+skipped).toLocaleString()}/${total.toLocaleString()} | Corrigidos: ${updated.toLocaleString()}`)
  }

  console.log(`\n\n[Fix Estoques] Concluído!`)
  console.log(`  Corrigidos: ${updated.toLocaleString()}`)
  console.log(`  Sem alteração (já corretos ou não encontrados): ${skipped.toLocaleString()}`)
}

const csvPath = process.argv[2]
if (!csvPath) { console.error('Uso: npm run etl:fix-estoques -- /caminho/arquivo.csv'); process.exit(1) }
fixEstoques(csvPath).catch(e => { console.error('[Fix Estoques] Erro:', e.message); process.exit(1) })
