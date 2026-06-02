import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminPage = pathname.startsWith('/admin')
  const isAdminApi  = pathname.startsWith('/api/admin') && !pathname.startsWith('/api/admin/etl')

  if (!isAdminPage && !isAdminApi) return NextResponse.next()

  const session = await auth()

  if (isAdminPage && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAdminApi) {
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const role = (session.user as { role?: string })?.role
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
