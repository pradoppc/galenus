export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { medicamentos } from '@/db/schema'
import { ilike, or, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) return NextResponse.json([])

  const rows = await db
    .selectDistinct({ produto: medicamentos.produto, principioAtivo: medicamentos.principioAtivo })
    .from(medicamentos)
    .where(or(
      ilike(medicamentos.produto,        `%${q}%`),
      ilike(medicamentos.principioAtivo, `%${q}%`)
    ))
    .orderBy(sql`LENGTH(${medicamentos.produto}) ASC`)
    .limit(10)

  // Retorna lista de labels únicos (produto + principio se diferente)
  const seen = new Set<string>()
  const suggestions: { label: string; value: string }[] = []

  for (const r of rows) {
    if (r.produto && !seen.has(r.produto)) {
      seen.add(r.produto)
      suggestions.push({ label: r.produto, value: r.produto })
    }
    if (r.principioAtivo && !seen.has(r.principioAtivo) && r.principioAtivo !== r.produto) {
      seen.add(r.principioAtivo)
      suggestions.push({ label: r.principioAtivo, value: r.principioAtivo })
    }
  }

  return NextResponse.json(suggestions.slice(0, 10), {
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
  })
}
