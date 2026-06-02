'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { z } from 'zod'

const schema = z.object({
  name:     z.string().min(2, 'Nome muito curto'),
  email:    z.string().email('Email inválido'),
  phone:    z.string().optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm:  z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'As senhas não coincidem',
  path:    ['confirm'],
})

export default function CadastroPage() {
  const router  = useRouter()
  const [form,    setForm]    = useState({ name: '', email: '', phone: '', password: '', confirm: '' })
  const [errors,  setErrors]  = useState<Record<string, string>>({})
  const [apiError,setApiError]= useState('')
  const [loading, setLoading] = useState(false)

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError('')

    const parsed = schema.safeParse(form)
    if (!parsed.success) {
      const map: Record<string, string> = {}
      parsed.error.issues.forEach(i => { map[i.path[0] as string] = i.message })
      setErrors(map)
      return
    }

    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name: form.name, email: form.email, phone: form.phone, password: form.password }),
    })

    setLoading(false)
    if (res.ok) {
      router.push('/login?registered=1')
    } else {
      const data = await res.json().catch(() => ({}))
      setApiError(data.error ?? 'Erro ao criar conta. Tente novamente.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAFCFB] px-5 py-10">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center">
          <Link href="/" className="text-[36px] font-medium text-[#1A4D3A]" style={{ fontFamily: 'var(--font-display)' }}>
            Galenus
          </Link>
          <p className="mt-1 text-[18px] text-[#5B8C7A]">Criar conta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-[14px] border border-[#D4E8DF] p-6 shadow-[0_1px_4px_rgba(26,77,58,.08)]">
          <Input label="Nome completo" value={form.name}     onChange={(e) => setField('name', e.target.value)}     error={errors.name}     required />
          <Input label="Email"         type="email" value={form.email}    onChange={(e) => setField('email', e.target.value)}    error={errors.email}    required autoComplete="email" />
          <Input label="Telefone (opcional)" type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} hint="Somente números" />
          <Input label="Senha"         type="password" value={form.password}  onChange={(e) => setField('password', e.target.value)}  error={errors.password}  hint="Mínimo 8 caracteres" required />
          <Input label="Confirmar senha" type="password" value={form.confirm}  onChange={(e) => setField('confirm', e.target.value)}  error={errors.confirm}   required />

          {apiError && <p className="text-[14px] text-[#C04848] text-center" role="alert">{apiError}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            Criar conta
          </Button>
        </form>

        <p className="text-center text-[16px] text-[#5B8C7A]">
          Já tem conta?{' '}
          <Link href="/login" className="text-[#1A4D3A] underline hover:no-underline">Entrar</Link>
        </p>
      </div>
    </main>
  )
}
