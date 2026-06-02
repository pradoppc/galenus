export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { farmacias } from '@/db/schema'
import { sql } from 'drizzle-orm'

export async function GET() {
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
