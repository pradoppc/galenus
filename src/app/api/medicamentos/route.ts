export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { farmacias, medicamentos, estoques, etlLogs } from '@/db/schema'
import { eq, ilike, or, desc, sql, and } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIP } from '@/lib/utils'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'

const querySchema = z.object({
  q:         z.string().min(3, 'Mínimo 3 caracteres no medicamento'),
  uf:        z.string().length(2, 'UF inválida').toUpperCase(),
  municipio: z.string().min(2, 'Município obrigatório'),
  endereco:  z.string().optional(),
  unidade:   z.string().optional(),
  // lat/lng opcionais — usados quando endereço é geocodificado no cliente
  lat:       z.coerce.number().min(-90).max(90).optional(),
  lng:       z.coerce.number().min(-180).max(180).optional(),
  raio:      z.coerce.number().min(1).max(50).default(SEARCH_DEFAULTS.RADIUS_KM),
  programa:  z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(20).default(SEARCH_DEFAULTS.PAGE_SIZE),
})

export async function GET(req: NextRequest) {
  const ip = getClientIP(req)
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde um minuto.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  const params = Object.fromEntries(req.nextUrl.searchParams)
  const parsed = querySchema.safeParse(params)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { q, uf, municipio, endereco, unidade, lat, lng, raio, programa, page, limit } = parsed.data
  const offset = (page - 1) * limit

  try {
    const [lastSync] = await db
      .select({ iniciadoEm: etlLogs.iniciadoEm })
      .from(etlLogs)
      .where(eq(etlLogs.status, 'success'))
      .orderBy(desc(etlLogs.iniciadoEm))
      .limit(1)

    // Expressão de distância (só quando endereço foi geocodificado)
    const hasCoords = lat !== undefined && lng !== undefined
    const distanciaExpr = hasCoords
      ? sql<number>`(6371 * acos(
          LEAST(1, cos(radians(${lat})) * cos(radians(CAST(${farmacias.latitude} AS float))) *
          cos(radians(CAST(${farmacias.longitude} AS float)) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(CAST(${farmacias.latitude} AS float))))
        ))`
      : sql<number>`NULL`

    // Condições WHERE
    const conds = [
      // Medicamento (nome ou princípio ativo)
      or(
        ilike(medicamentos.produto,        `%${q}%`),
        ilike(medicamentos.principioAtivo, `%${q}%`)
      )!,
      // UF e município obrigatórios
      eq(farmacias.uf, uf),
      ilike(farmacias.municipio, `%${municipio}%`),
    ]

    // Endereço: busca textual parcial
    if (endereco?.trim()) {
      conds.push(ilike(farmacias.endereco, `%${endereco.trim()}%`))
    }

    // Unidade de saúde: busca pelo nome da farmácia
    if (unidade?.trim()) {
      conds.push(ilike(farmacias.nome, `%${unidade.trim()}%`))
    }

    // Programa de saúde (filtro opcional)
    if (programa) {
      conds.push(ilike(medicamentos.programa, `%${programa}%`))
    }

    // Raio de distância (só quando geocodificado)
    if (hasCoords) {
      conds.push(
        sql`(6371 * acos(
          LEAST(1, cos(radians(${lat})) * cos(radians(CAST(${farmacias.latitude} AS float))) *
          cos(radians(CAST(${farmacias.longitude} AS float)) - radians(${lng})) +
          sin(radians(${lat})) * sin(radians(CAST(${farmacias.latitude} AS float))))
        )) <= ${raio}`
      )
    }

    const rows = await db
      .select({
        farmacia_id:                 farmacias.id,
        farmacia_nome:               farmacias.nome,
        farmacia_endereco:           farmacias.endereco,
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
        distancia_km:                distanciaExpr,
      })
      .from(estoques)
      .innerJoin(farmacias,    eq(estoques.farmaciaId,    farmacias.id))
      .innerJoin(medicamentos, eq(estoques.medicamentoId, medicamentos.id))
      .where(and(...conds))
      .orderBy(
        hasCoords
          ? sql`distancia_km ASC NULLS LAST`
          : desc(estoques.quantidade)
      )
      .limit(limit + 1)
      .offset(offset)

    const hasMore = rows.length > limit
    const data    = rows.slice(0, limit).map(r => ({
      ...r,
      farmacia_lat:  r.farmacia_lat  ? parseFloat(String(r.farmacia_lat))  : null,
      farmacia_lng:  r.farmacia_lng  ? parseFloat(String(r.farmacia_lng))  : null,
      distancia_km:  r.distancia_km != null ? parseFloat(String(r.distancia_km)) : null,
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
