export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
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
