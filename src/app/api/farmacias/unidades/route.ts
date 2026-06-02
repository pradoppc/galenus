export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, ilike, and, isNotNull, or, asc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const uf        = sp.get('uf')?.toUpperCase().trim()
  const municipio = sp.get('municipio')?.trim()
  const q         = sp.get('q')?.trim()

  if (!uf || !municipio) return NextResponse.json([])

  const baseConds = [
    eq(farmacias.uf, uf),
    ilike(farmacias.municipio, `%${municipio}%`),
  ]

  // Busca preferencial pelo nome fantasia (nome real da unidade)
  // Fallback para razão social quando fantasia não existe
  const searchCond = q && q.length >= 2
    ? or(
        ilike(farmacias.fantasia, `%${q}%`),
        ilike(farmacias.nome,     `%${q}%`),
      )
    : undefined

  const conds = searchCond ? [...baseConds, searchCond] : baseConds

  // Busca unidades com fantasia primeiro
  const rowsFantasia = await db
    .selectDistinct({ label: farmacias.fantasia })
    .from(farmacias)
    .where(and(...conds, isNotNull(farmacias.fantasia)))
    .orderBy(asc(farmacias.fantasia))
    .limit(40)

  // Complementa com razão social para unidades sem fantasia
  const rowsNome = await db
    .selectDistinct({ label: farmacias.nome })
    .from(farmacias)
    .where(and(...conds))
    .orderBy(asc(farmacias.nome))
    .limit(20)

  const seen    = new Set<string>()
  const results: string[] = []

  for (const r of [...rowsFantasia, ...rowsNome]) {
    const v = r.label
    if (v && !seen.has(v)) { seen.add(v); results.push(v) }
    if (results.length >= 50) break
  }

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
