/**
 * ETL automatizado BNAFAR — baixa o arquivo de Posição de Estoque mais recente
 * do servidor oficial de dados abertos e importa para o banco.
 *
 * Fonte: https://arquivosdadosabertos.saude.gov.br/dados/bnafar/
 * Padrão de nome observado: Posicao_Estoque[_csv]_DD-MM-YYYY.(zip|csv)
 *
 * Comportamento:
 *  - Procura o arquivo mais recente testando datas (hoje voltando N dias) e os
 *    padrões de nome conhecidos.
 *  - Baixa, descompacta (se zip) e importa via csv-importer.
 *  - Se a fonte estiver indisponível (ex.: portal em manutenção), registra em
 *    etl_logs com status 'skipped' e encerra com exit 0 — assim o workflow
 *    agendado NÃO falha durante manutenções do Ministério da Saúde.
 *
 * Override: defina BNAFAR_FILE_URL para forçar uma URL específica.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config()

import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, existsSync, readdirSync, rmSync, statSync } from 'fs'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import postgres from 'postgres'
import { importCsvFile } from './csv-importer'

const execFileP = promisify(execFile)

const BASE_URL      = process.env.BNAFAR_FILES_URL ?? 'https://arquivosdadosabertos.saude.gov.br/dados/bnafar'
const MAX_DAYS_BACK = Number(process.env.BNAFAR_MAX_DAYS_BACK ?? 35)
const WORK_DIR      = join(tmpdir(), 'galenus-bnafar')

function fmtDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

/** Gera as URLs candidatas para uma data (mais prováveis primeiro). */
function candidateUrls(dateStr: string): string[] {
  return [
    `${BASE_URL}/Posicao_Estoque_csv_${dateStr}.zip`,
    `${BASE_URL}/Posicao_Estoque_${dateStr}.zip`,
    `${BASE_URL}/Posicao_Estoque_csv_${dateStr}.csv`,
    `${BASE_URL}/Posicao_Estoque_${dateStr}.csv`,
  ]
}

async function urlExists(url: string): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch(url, { method: 'HEAD', signal: ctrl.signal, headers: { 'User-Agent': 'Galenus/1.0' } })
    clearTimeout(t)
    return res.ok
  } catch { return false }
}

/** Procura a URL do arquivo mais recente disponível. */
async function findLatestFile(): Promise<string | null> {
  if (process.env.BNAFAR_FILE_URL) {
    console.log(`[ETL] Usando BNAFAR_FILE_URL: ${process.env.BNAFAR_FILE_URL}`)
    return process.env.BNAFAR_FILE_URL
  }
  console.log(`[ETL] Procurando arquivo mais recente em ${BASE_URL} (até ${MAX_DAYS_BACK} dias atrás)...`)
  const today = new Date()
  for (let i = 0; i < MAX_DAYS_BACK; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = fmtDate(d)
    for (const url of candidateUrls(dateStr)) {
      if (await urlExists(url)) {
        console.log(`[ETL] Arquivo encontrado: ${url}`)
        return url
      }
    }
  }
  return null
}

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`[ETL] Baixando ${url} ...`)
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 600_000)
  const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Galenus/1.0' } })
  clearTimeout(t)
  if (!res.ok || !res.body) throw new Error(`Download falhou: HTTP ${res.status}`)
  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(dest))
  const mb = (statSync(dest).size / 1_048_576).toFixed(1)
  console.log(`[ETL] Download concluído: ${mb} MB`)
}

/** Se for zip, descompacta e retorna o caminho do .csv extraído. */
async function resolveCsvPath(filePath: string): Promise<string> {
  if (!filePath.toLowerCase().endsWith('.zip')) return filePath
  console.log('[ETL] Descompactando ZIP...')
  await execFileP('unzip', ['-o', filePath, '-d', WORK_DIR])
  const csv = readdirSync(WORK_DIR).find(f => f.toLowerCase().endsWith('.csv'))
  if (!csv) throw new Error('Nenhum .csv encontrado dentro do ZIP')
  return join(WORK_DIR, csv)
}

async function registerSkip(motivo: string) {
  try {
    const sql = postgres(process.env.DATABASE_URL!, { max: 1, connect_timeout: 15, prepare: false })
    await sql`INSERT INTO etl_logs (status, fonte, finalizado_em, erro_mensagem)
              VALUES ('skipped', ${process.env.ETL_SOURCE ?? 'cron'}, now(), ${motivo})`
    await sql.end()
  } catch (e) {
    console.error('[ETL] Não foi possível registrar skip:', (e as Error).message)
  }
}

async function main() {
  // Limpa e recria diretório de trabalho
  if (existsSync(WORK_DIR)) rmSync(WORK_DIR, { recursive: true, force: true })
  await execFileP('mkdir', ['-p', WORK_DIR])

  const fileUrl = await findLatestFile()

  if (!fileUrl) {
    const motivo = 'Fonte BNAFAR indisponível (nenhum arquivo encontrado nos últimos ' + MAX_DAYS_BACK + ' dias). Portal possivelmente em manutenção.'
    console.warn(`[ETL] ${motivo}`)
    console.warn('[ETL] Encerrando sem erro — dados atuais permanecem no banco.')
    await registerSkip(motivo)
    process.exit(0)   // não falha o workflow durante manutenção do governo
  }

  const isZip   = fileUrl.toLowerCase().endsWith('.zip')
  const dlPath  = join(WORK_DIR, isZip ? 'bnafar.zip' : 'bnafar.csv')

  await downloadFile(fileUrl, dlPath)
  const csvPath = await resolveCsvPath(dlPath)
  await importCsvFile(csvPath, process.env.ETL_SOURCE ?? 'cron')

  // Limpeza
  rmSync(WORK_DIR, { recursive: true, force: true })
  console.log('[ETL] Sincronização concluída com sucesso.')
  process.exit(0)
}

main().catch(async (err) => {
  console.error('[ETL] Erro fatal:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
