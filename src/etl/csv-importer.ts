/**
 * Lógica de importação de CSV BNAFAR para PostgreSQL (postgres.js).
 * Módulo reutilizável — usado pelo CLI (import-csv.ts) e pelo ETL
 * automatizado de download (download-import.ts).
 *
 * Encoding esperado: Latin-1 (ISO-8859-1), separador ";".
 * Lógica de quantidade: mesmo par (cnes, catmat) na mesma data SOMA os lotes;
 * data mais recente substitui. Corrige o bug de estoques zerados.
 */
import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import postgres from 'postgres'

function toTitleCase(s: string) {
  return s.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase()).trim()
}
function parseCoord(v: string): number | null {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? null : Number(n.toFixed(7))
}
function parseQty(v: string) {
  const n = parseFloat(v.replace(',', '.'))
  return isNaN(n) ? 0 : Math.floor(n)
}

const FARM_CHUNK = 1000
const MED_CHUNK  = 1000
const EST_CHUNK  = 2000

export interface ImportResult {
  farmacias:    number
  medicamentos: number
  estoques:     number
}

/**
 * Importa um arquivo CSV BNAFAR para o banco. Cria e encerra a própria conexão.
 * @param csvPath caminho do arquivo CSV
 * @param fonte   valor gravado em etl_logs.fonte (ex.: 'csv', 'cron', 'manual')
 */
export async function importCsvFile(csvPath: string, fonte = 'csv'): Promise<ImportResult> {
  const sql = postgres(process.env.DATABASE_URL!, { max: 10, idle_timeout: 30, connect_timeout: 20, prepare: false })

  console.log(`[ETL] Importando: ${csvPath} (fonte=${fonte})`)
  const [log] = await sql`INSERT INTO etl_logs (status, fonte) VALUES ('running', ${fonte}) RETURNING id`

  interface FarmRow { cnes: string; nome: string; fantasia: string | null; municipio: string; uf: string; bairro: string | null; endereco: string | null; latitude: number | null; longitude: number | null; programa: string | null }
  interface MedRow  { principio_ativo: string; produto: string; codigo_catmat: string; programa: string | null }

  const farmaciaMap    = new Map<string, FarmRow>()
  const medicamentoMap = new Map<string, MedRow>()
  const estoqueMap     = new Map<string, { cnes: string; catmat: string; qty: number; date: string }>()

  let totalLines = 0, skipped = 0
  let headers: string[] = []
  let firstLine = true

  try {
    const rl = createInterface({ input: createReadStream(csvPath, { encoding: 'latin1' }), crlfDelay: Infinity })

    for await (const line of rl) {
      if (!line.trim()) continue
      const cols = line.split(';').map(c => c.trim().replace(/^"(.*)"$/s, '$1').replace(/""/g, '"'))
      if (firstLine) { headers = cols.map(h => h.replace(/"/g, '').toLowerCase().trim()); firstLine = false; continue }

      totalLines++
      if (totalLines % 500_000 === 0) process.stdout.write(`\r  Lendo... ${(totalLines/1000).toFixed(0)}k linhas`)

      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = cols[i] ?? '' })

      const cnes   = row.co_cnes?.trim()
      const catmat = row.co_catmat?.trim()
      if (!cnes || !catmat || !row.ds_produto) { skipped++; continue }

      if (!farmaciaMap.has(cnes)) {
        farmaciaMap.set(cnes, {
          cnes,
          nome:      toTitleCase(row.no_razao_social || row.no_fantasia || 'Estabelecimento'),
          fantasia:  row.no_fantasia ? toTitleCase(row.no_fantasia) : null,
          municipio: toTitleCase(row.no_municipio || ''),
          uf:        (row.sg_uf || '').toUpperCase().trim(),
          bairro:    row.no_bairro ? toTitleCase(row.no_bairro) : null,
          endereco:  [row.no_logradouro, row.nu_endereco, row.no_bairro, row.no_municipio, row.sg_uf].filter(Boolean).join(', ') || null,
          latitude:  parseCoord(row.nu_latitude || ''),
          longitude: parseCoord(row.nu_longitude || ''),
          programa:  row.ds_programa_saude || null,
        })
      }

      if (!medicamentoMap.has(catmat)) {
        medicamentoMap.set(catmat, {
          principio_ativo: row.ds_produto.substring(0, 500),
          produto:         toTitleCase(row.ds_produto.substring(0, 500)),
          codigo_catmat:   catmat,
          programa:        row.sg_programa_saude || null,
        })
      }

      const date  = (row.dt_posicao_estoque || '').replace(/\//g, '-')
      const qty   = parseQty(row.qt_estoque || '0')
      const key   = `${cnes}|${catmat}`
      const exist = estoqueMap.get(key)
      if (!exist)                   estoqueMap.set(key, { cnes, catmat, qty, date })
      else if (date > exist.date)   estoqueMap.set(key, { cnes, catmat, qty, date })
      else if (date === exist.date) exist.qty += qty
    }

    console.log(`\n  Lidas: ${totalLines.toLocaleString()} | Ignoradas: ${skipped}`)
    console.log(`  Farmácias: ${farmaciaMap.size.toLocaleString()} | Medicamentos: ${medicamentoMap.size.toLocaleString()} | Estoques: ${estoqueMap.size.toLocaleString()}`)

    if (totalLines === 0) throw new Error('Arquivo CSV vazio ou em formato inesperado')

    // ── Farmácias ──
    const farmArr = [...farmaciaMap.values()]
    for (let i = 0; i < farmArr.length; i += FARM_CHUNK) {
      const chunk = farmArr.slice(i, i + FARM_CHUNK)
      await sql`
        INSERT INTO farmacias ${sql(chunk, 'cnes','nome','fantasia','municipio','uf','bairro','endereco','latitude','longitude','programa')}
        ON CONFLICT (cnes) DO UPDATE SET
          nome=EXCLUDED.nome, fantasia=EXCLUDED.fantasia, municipio=EXCLUDED.municipio,
          uf=EXCLUDED.uf, bairro=EXCLUDED.bairro, endereco=EXCLUDED.endereco,
          latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude, updated_at=now()
      `
      process.stdout.write(`\r  Farmácias: ${Math.min(i+FARM_CHUNK, farmArr.length).toLocaleString()}/${farmArr.length.toLocaleString()}`)
    }
    console.log(' ✓')

    // ── Medicamentos ──
    const medArr = [...medicamentoMap.values()]
    for (let i = 0; i < medArr.length; i += MED_CHUNK) {
      const chunk = medArr.slice(i, i + MED_CHUNK)
      await sql`
        INSERT INTO medicamentos ${sql(chunk, 'principio_ativo','produto','codigo_catmat','programa')}
        ON CONFLICT (codigo_catmat) DO UPDATE SET
          principio_ativo=EXCLUDED.principio_ativo, produto=EXCLUDED.produto, programa=EXCLUDED.programa
      `
      process.stdout.write(`\r  Medicamentos: ${Math.min(i+MED_CHUNK, medArr.length).toLocaleString()}/${medArr.length.toLocaleString()}`)
    }
    console.log(' ✓')

    // ── IDs ──
    process.stdout.write('  Carregando IDs...')
    const fIdMap = new Map<string, string>()
    const mIdMap = new Map<string, string>()
    const fRows = await sql`SELECT id, cnes FROM farmacias`
    fRows.forEach(r => { if (r.cnes) fIdMap.set(r.cnes, r.id) })
    const mRows = await sql`SELECT id, codigo_catmat FROM medicamentos`
    mRows.forEach(r => { if (r.codigo_catmat) mIdMap.set(r.codigo_catmat, r.id) })
    console.log(` ✓ ${fIdMap.size} + ${mIdMap.size}`)

    // ── Estoques ──
    const estArr: { farmacia_id: string; medicamento_id: string; quantidade: number; atualizado_em: string }[] = []
    for (const { cnes, catmat, qty, date } of estoqueMap.values()) {
      const fId = fIdMap.get(cnes), mId = mIdMap.get(catmat)
      if (!fId || !mId) continue
      const d = date ? new Date(date) : new Date()
      estArr.push({ farmacia_id: fId, medicamento_id: mId, quantidade: qty, atualizado_em: (isNaN(d.getTime()) ? new Date() : d).toISOString() })
    }

    let done = 0
    for (let i = 0; i < estArr.length; i += EST_CHUNK) {
      const chunk = estArr.slice(i, i + EST_CHUNK)
      await sql`
        INSERT INTO estoques ${sql(chunk, 'farmacia_id','medicamento_id','quantidade','atualizado_em')}
        ON CONFLICT (farmacia_id, medicamento_id) DO UPDATE SET
          quantidade=EXCLUDED.quantidade, atualizado_em=EXCLUDED.atualizado_em, sincronizado_em=now()
      `
      done += chunk.length
      process.stdout.write(`\r  Estoques: ${done.toLocaleString()}/${estArr.length.toLocaleString()}`)
    }
    console.log(' ✓')

    await sql`
      UPDATE etl_logs SET finalizado_em=now(), status='success',
        farmacias_processadas=${farmaciaMap.size}, medicamentos_processados=${medicamentoMap.size}, estoques_processados=${estArr.length}
      WHERE id=${log.id}
    `
    console.log(`\n[ETL] Concluído! Farmácias: ${farmaciaMap.size.toLocaleString()} | Medicamentos: ${medicamentoMap.size.toLocaleString()} | Estoques: ${estArr.length.toLocaleString()}`)

    const result: ImportResult = { farmacias: farmaciaMap.size, medicamentos: medicamentoMap.size, estoques: estArr.length }
    await sql.end()
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('\n[ETL] Erro:', msg.substring(0, 500))
    await sql`UPDATE etl_logs SET finalizado_em=now(), status='error', erro_mensagem=${msg.substring(0,2000)} WHERE id=${log.id}`.catch(() => {})
    await sql.end()
    throw err
  }
}
