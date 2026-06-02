export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, ilike, and, asc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const uf        = sp.get('uf')?.toUpperCase().trim()
  const municipio = sp.get('municipio')?.trim()
  const q         = sp.get('q')?.trim()

  if (!uf || !municipio) return NextResponse.json([])

  const conds = [
    eq(farmacias.uf, uf),
    ilike(farmacias.municipio, `%${municipio}%`),
  ]

  // q opcional — quando presente filtra por nome, senão retorna todos do município
  if (q && q.length >= 2) {
    conds.push(ilike(farmacias.nome, `%${q}%`))
  }

  const rows = await db
    .selectDistinct({ nome: farmacias.nome })
    .from(farmacias)
    .where(and(...conds))
    .orderBy(asc(farmacias.nome))
    .limit(50)

  const results = rows.map(r => r.nome).filter(Boolean) as string[]
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
