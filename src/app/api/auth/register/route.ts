export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const schema = z.object({
  name:     z.string().min(2).max(255),
  email:    z.string().email().max(255),
  phone:    z.string().max(20).optional(),
  password: z.string().min(8).max(128),
})

export async function POST(req: NextRequest) {
  const body   = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { name, email, phone, password } = parsed.data

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing.length > 0) {
    return NextResponse.json({ error: 'Este email já está em uso.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await db.insert(users).values({ name, email, phone, passwordHash, role: 'user' })

  return NextResponse.json({ ok: true }, { status: 201 })
}
