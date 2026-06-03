export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, ilike, and, isNotNull, asc } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60 })
  if (limited) return limited

  const sp        = req.nextUrl.searchParams
  const uf        = sp.get('uf')?.toUpperCase().trim()
  const municipio = sp.get('municipio')?.trim()

  if (!uf || !municipio) return NextResponse.json([])

  const rows = await db
    .selectDistinct({ bairro: farmacias.bairro })
    .from(farmacias)
    .where(and(
      eq(farmacias.uf, uf),
      ilike(farmacias.municipio, `%${municipio}%`),
      isNotNull(farmacias.bairro),
    ))
    .orderBy(asc(farmacias.bairro))
    .limit(100)

  const results = rows.map(r => r.bairro).filter(Boolean) as string[]
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
