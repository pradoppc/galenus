/**
 * Script pontual: popula farmacias.bairro a partir do CSV sem re-importar estoques.
 * Uso: npm run etl:bairro -- /caminho/arquivo.csv
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { neon } from '@neondatabase/serverless'

const DB  = process.env.DATABASE_URL!
const sql = neon(DB)

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase()).trim()
}

async function updateBairros(csvPath: string) {
  console.log(`[Bairro] Lendo: ${csvPath}`)

  const bairroMap = new Map<string, string>()  // cnes → bairro
  let lines = 0
  let headers: string[] = []
  let first = true

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
    const bairro = row.no_bairro?.trim()
    if (cnes && bairro && !bairroMap.has(cnes)) {
      bairroMap.set(cnes, toTitleCase(bairro))
    }
  }

  console.log(`\n  Farmácias com bairro: ${bairroMap.size.toLocaleString()}`)

  // Update em lotes de 50 (UPDATE ... SET bairro = CASE WHEN cnes = ... THEN ... END)
  const entries = [...bairroMap.entries()]
  const CHUNK   = 50
  let done = 0

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK)
    const cnesList = chunk.map(([c]) => c)
    // Usa UPDATE ... SET via VALUES
    for (const [cnes, bairro] of chunk) {
      await sql`UPDATE farmacias SET bairro = ${bairro} WHERE cnes = ${cnes}`
    }
    done += chunk.length
    process.stdout.write(`\r  Atualizando: ${done.toLocaleString()}/${bairroMap.size.toLocaleString()}`)
  }

  console.log('\n[Bairro] Concluído!')
}

const csvPath = process.argv[2]
if (!csvPath) { console.error('Uso: npm run etl:bairro -- /caminho/arquivo.csv'); process.exit(1) }
updateBairros(csvPath).catch(e => { console.error(e.message); process.exit(1) })
