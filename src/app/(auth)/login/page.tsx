'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function LoginPage() {
  const router   = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (res?.error) {
      setError('Email ou senha incorretos.')
    } else {
      router.push('/admin')
    }
  }

  async function handleGoogle() {
    await signIn('google', { callbackUrl: '/admin' })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFCFB] px-5">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <Link href="/" className="text-[36px] font-medium text-[#1A4D3A]" style={{ fontFamily: 'var(--font-display)' }}>
            Galenus
          </Link>
          <p className="mt-1 text-[18px] text-[#5B8C7A]">Entrar na sua conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-[14px] border border-[#D4E8DF] p-6 shadow-[0_1px_4px_rgba(26,77,58,.08)]">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          {error && (
            <p className="text-[14px] text-[#C04848] text-center" role="alert">{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Entrar
          </Button>
        </form>

        <div className="text-center space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[#D4E8DF]" />
            <span className="text-[14px] text-[#9CB8B0]">ou</span>
            <div className="flex-1 h-px bg-[#D4E8DF]" />
          </div>
          <Button variant="outline" size="md" className="w-full" onClick={handleGoogle}>
            Entrar com Google
          </Button>
          <p className="text-[16px] text-[#5B8C7A]">
            Não tem conta?{' '}
            <Link href="/cadastro" className="text-[#1A4D3A] underline hover:no-underline">
              Cadastrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
