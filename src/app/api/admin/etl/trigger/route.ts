export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { etlLogs } from '@/db/schema'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const expected = `Bearer ${process.env.ETL_SECRET_KEY}`

  if (!process.env.ETL_SECRET_KEY || auth !== expected) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const [log] = await db.insert(etlLogs).values({
    status: 'running',
    fonte:  'manual',
  }).returning()

  // Run ETL asynchronously — fire and forget
  import('@/etl/sync-runner').then((m) => m.runSync(log.id)).catch(console.error)

  return NextResponse.json({ message: 'ETL iniciado', log_id: log.id }, { status: 202 })
}
