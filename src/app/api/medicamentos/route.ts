export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { farmacias, medicamentos, estoques, etlLogs } from '@/db/schema'
import { eq, ilike, or, desc, sql, and } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'

const querySchema = z.object({
  q:         z.string().min(3, 'Mínimo 3 caracteres no medicamento'),
  uf:        z.string().length(2, 'UF inválida').toUpperCase(),
  municipio: z.string().min(2, 'Município obrigatório'),
  bairro:    z.string().optional(),
  unidade:   z.string().optional(),
  programa:  z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(20).default(SEARCH_DEFAULTS.PAGE_SIZE),
})

export async function GET(req: NextRequest) {
  // Busca principal: 30 req/min por IP
  const limited = rateLimit(req, { limit: 30 })
  if (limited) return limited

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = querySchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { q, uf, municipio, bairro, unidade, programa, page, limit } = parsed.data
  const offset = (page - 1) * limit

  try {
    const [lastSync] = await db
      .select({ iniciadoEm: etlLogs.iniciadoEm })
      .from(etlLogs)
      .where(eq(etlLogs.status, 'success'))
      .orderBy(desc(etlLogs.iniciadoEm))
      .limit(1)

    const conds = [
      or(
        ilike(medicamentos.produto,        `%${q}%`),
        ilike(medicamentos.principioAtivo, `%${q}%`)
      )!,
      eq(farmacias.uf, uf),
      ilike(farmacias.municipio, `%${municipio}%`),
    ]

    if (bairro?.trim())   conds.push(ilike(farmacias.bairro,   `%${bairro.trim()}%`))
    if (unidade?.trim())  conds.push(ilike(farmacias.nome,     `%${unidade.trim()}%`))
    if (programa?.trim()) conds.push(ilike(medicamentos.programa, `%${programa.trim()}%`))

    const rows = await db
      .select({
        farmacia_id:                 farmacias.id,
        farmacia_nome:               farmacias.nome,
        farmacia_fantasia:           farmacias.fantasia,
        farmacia_endereco:           farmacias.endereco,
        farmacia_bairro:             farmacias.bairro,
        farmacia_municipio:          farmacias.municipio,
        farmacia_uf:                 farmacias.uf,
        farmacia_lat:                farmacias.latitude,
        farmacia_lng:                farmacias.longitude,
        medicamento_produto:         medicamentos.produto,
        medicamento_principio_ativo: medicamentos.principioAtivo,
        medicamento_apresentacao:    medicamentos.apresentacao,
        programa:                    medicamentos.programa,
        quantidade:                  estoques.quantidade,
        atualizado_em:               estoques.atualizadoEm,
      })
      .from(estoques)
      .innerJoin(farmacias,    eq(estoques.farmaciaId,    farmacias.id))
      .innerJoin(medicamentos, eq(estoques.medicamentoId, medicamentos.id))
      .where(and(...conds))
      .orderBy(desc(estoques.quantidade))
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    const data    = rows.slice(0, limit).map(r => ({
      ...r,
      farmacia_lat:  r.farmacia_lat  ? parseFloat(String(r.farmacia_lat))  : null,
      farmacia_lng:  r.farmacia_lng  ? parseFloat(String(r.farmacia_lng))  : null,
      atualizado_em: r.atualizado_em?.toISOString() ?? new Date().toISOString(),
    }))

    return NextResponse.json(
      { data, total: data.length, page, limit, hasMore, ultima_sincronizacao: lastSync?.iniciadoEm?.toISOString() ?? null },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    )
  } catch (err) {
    console.error('[/api/medicamentos]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
