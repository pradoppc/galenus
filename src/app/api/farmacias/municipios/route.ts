export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60 })
  if (limited) return limited

  const uf = req.nextUrl.searchParams.get('uf')?.toUpperCase().trim()
  if (!uf) return NextResponse.json({ error: 'UF obrigatória' }, { status: 400 })

  const rows = await db
    .selectDistinct({ municipio: farmacias.municipio })
    .from(farmacias)
    .where(eq(farmacias.uf, uf))
    .orderBy(farmacias.municipio)

  const municipios = rows.map(r => r.municipio).filter(Boolean)
  return NextResponse.json(municipios, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
