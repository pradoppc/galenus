export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, ilike, and, isNotNull, asc } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const uf        = sp.get('uf')?.toUpperCase().trim()
  const municipio = sp.get('municipio')?.trim()
  const q         = sp.get('q')?.trim()

  if (!uf || !municipio || !q || q.length < 3) return NextResponse.json([])

  const rows = await db
    .selectDistinct({ endereco: farmacias.endereco })
    .from(farmacias)
    .where(and(
      eq(farmacias.uf, uf),
      ilike(farmacias.municipio, `%${municipio}%`),
      ilike(farmacias.endereco, `%${q}%`),
      isNotNull(farmacias.endereco),
    ))
    .orderBy(asc(farmacias.endereco))
    .limit(10)

  const results = rows.map(r => r.endereco).filter(Boolean) as string[]
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
