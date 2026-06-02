/**
 * BNAFAR Open Data API client
 * Reads stock position data from the government open data API.
 * The API returns paginated records of medication stock at health establishments.
 *
 * Primary source: https://apidadosabertos.saude.gov.br/v1/bnafar/posicao-estoque
 * Data fields match the CSV export format from BNAFAR.
 */

const BASE_URL = process.env.BNAFAR_API_URL ?? 'https://apidadosabertos.saude.gov.br/v1'
const API_KEY  = process.env.BNAFAR_API_KEY ?? ''

export interface BnafarRecord {
  sg_uf:             string
  co_municipio_ibge: string
  no_municipio:      string
  co_cnes:           string
  no_razao_social:   string
  no_fantasia:       string | null
  co_cep:            string | null
  no_logradouro:     string | null
  nu_endereco:       string | null
  no_bairro:         string | null
  nu_telefone:       string | null
  nu_latitude:       string | null
  nu_longitude:      string | null
  no_email:          string | null
  dt_posicao_estoque: string
  co_catmat:         string
  ds_produto:        string
  qt_estoque:        string | number
  nu_lote:           string | null
  dt_validade:       string | null
  tp_produto:        string | null
  sg_programa_saude: string | null
  ds_programa_saude: string | null
  sg_origem:         string | null
}

interface ApiPage {
  items:      BnafarRecord[]
  total:      number
  page:       number
  size:       number
  totalPages: number
}

async function fetchPage(page: number, size = 500): Promise<ApiPage> {
  const headers: Record<string, string> = {
    'Accept':     'application/json',
    'User-Agent': 'Galenus/1.0 (galenusmed.com.br)',
  }
  if (API_KEY) headers['Authorization'] = API_KEY

  const url = `${BASE_URL}/bnafar/posicao-estoque?page=${page}&size=${size}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const res = await fetch(url, { headers, signal: controller.signal })
    if (!res.ok) throw new Error(`BNAFAR API error: ${res.status} ${res.statusText}`)
    const json = await res.json()

    // Handle different possible response formats from the government API
    if (Array.isArray(json)) {
      return {
        items:      json as BnafarRecord[],
        total:      json.length,
        page,
        size,
        totalPages: json.length < size ? page + 1 : page + 2,
      }
    }

    // Standard paginated response
    const items: BnafarRecord[] = json.items ?? json.content ?? json.data ?? json.results ?? []
    const total     = json.total ?? json.totalElements ?? json.total_elements ?? items.length
    const totalPages = json.totalPages ?? json.total_pages ?? json.pages ?? Math.ceil(total / size)

    return { items, total, page, size, totalPages }
  } finally {
    clearTimeout(timeout)
  }
}

export async function* fetchAllRecords(pageSize = 500): AsyncGenerator<BnafarRecord[]> {
  let page = 0
  let totalPages = 1

  do {
    const result = await fetchPage(page, pageSize)
    totalPages = result.totalPages

    if (result.items.length === 0) break

    yield result.items

    console.log(`  Página ${page + 1}/${totalPages} — ${result.items.length} registros`)
    page++

    // Polite delay between requests
    if (page < totalPages) await new Promise(r => setTimeout(r, 200))
  } while (page < totalPages)
}
