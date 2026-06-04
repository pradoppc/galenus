export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Dispara o workflow de ETL no GitHub Actions (workflow_dispatch).
 * O ETL real (download ~600MB + import de ~1,9M registros) roda no runner do
 * GitHub, não na Vercel — funções serverless têm timeout/memória insuficientes.
 *
 * Requer GITHUB_DISPATCH_TOKEN (PAT fine-grained com permissão Actions: write)
 * e GITHUB_REPO (ex.: "pradoppc/galenus") nas variáveis de ambiente.
 */
export async function POST(req: NextRequest) {
  const auth     = req.headers.get('authorization')
  const expected = `Bearer ${process.env.ETL_SECRET_KEY}`

  if (!process.env.ETL_SECRET_KEY || auth !== expected) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const token = process.env.GITHUB_DISPATCH_TOKEN
  const repo  = process.env.GITHUB_REPO ?? 'pradoppc/galenus'

  if (!token) {
    return NextResponse.json({
      message: 'A sincronização roda automaticamente às 08:00, 12:00 e 18:00 (Brasília). Para habilitar o disparo manual, configure GITHUB_DISPATCH_TOKEN.',
    }, { status: 200 })
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/etl.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept:        'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  })

  if (res.status === 204) {
    return NextResponse.json({ message: 'Sincronização disparada no GitHub Actions. Acompanhe em Actions.' }, { status: 202 })
  }

  const detail = await res.text().catch(() => '')
  return NextResponse.json({ error: `Falha ao disparar workflow (HTTP ${res.status})`, detail: detail.slice(0, 200) }, { status: 502 })
}
