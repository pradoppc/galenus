import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/db'
import { users, accounts, sessions, verificationTokens } from '@/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable:              users,
    accountsTable:           accounts,
    sessionsTable:           sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt' },
  pages:   { signIn: '/login' },
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db.select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1)

        if (!user || !user.passwordHash || !user.active) return null

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as { role?: string }).role ?? 'user'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.role = (token.role as 'user' | 'admin') ?? 'user'
      }
      return session
    },
  },
})
