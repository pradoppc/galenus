export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

const schema = z.object({
  active: z.boolean().optional(),
  role:   z.enum(['user', 'admin']).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id }  = await params
  const body    = await req.json().catch(() => null)
  const parsed  = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  await db.update(users).set(parsed.data).where(eq(users.id, id))
  return NextResponse.json({ ok: true })
}
