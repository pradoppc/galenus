import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'user' | 'admin'
    } & DefaultSession['user']
  }
}

export interface MedicamentoResult {
  farmacia_id: string
  farmacia_nome: string
  farmacia_endereco: string
  farmacia_municipio: string
  farmacia_uf: string
  farmacia_lat: number | null
  farmacia_lng: number | null
  medicamento_produto: string
  medicamento_principio_ativo: string
  medicamento_apresentacao: string | null
  programa: string | null
  quantidade: number
  distancia_km: number | null
  atualizado_em: string
}

export interface BuscaParams {
  q: string
  lat?: number
  lng?: number
  raio?: number
  programa?: string
  page?: number
  limit?: number
}

export interface BuscaResponse {
  data: MedicamentoResult[]
  total: number
  page: number
  limit: number
  ultima_sincronizacao: string | null
}

export interface EtlLog {
  id: string
  iniciado_em: Date
  finalizado_em: Date | null
  status: 'running' | 'success' | 'error'
  farmacias_processadas: number
  medicamentos_processados: number
  estoques_processados: number
  erro_mensagem: string | null
  fonte: string
}
