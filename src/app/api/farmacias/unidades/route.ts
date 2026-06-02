export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { eq, ilike, and, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams
  const uf        = sp.get('uf')?.toUpperCase().trim()
  const municipio = sp.get('municipio')?.trim()
  const q         = sp.get('q')?.trim()

  if (!uf || !municipio || !q || q.length < 3) return NextResponse.json([])

  const rows = await db
    .selectDistinct({ nome: farmacias.nome })
    .from(farmacias)
    .where(and(
      eq(farmacias.uf, uf),
      ilike(farmacias.municipio, `%${municipio}%`),
      ilike(farmacias.nome, `%${q}%`),
    ))
    .orderBy(sql`LENGTH(${farmacias.nome}) ASC`)
    .limit(10)

  const results = rows.map(r => r.nome).filter(Boolean) as string[]
  return NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
  })
}
