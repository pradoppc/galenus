export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { sql } from 'drizzle-orm'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60 })
  if (limited) return limited

  const rows = await db
    .selectDistinct({ uf: farmacias.uf })
    .from(farmacias)
    .where(sql`${farmacias.uf} IS NOT NULL AND ${farmacias.uf} != ''`)
    .orderBy(farmacias.uf)

  const ufs = rows.map(r => r.uf).filter(Boolean)
  return NextResponse.json(ufs, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
