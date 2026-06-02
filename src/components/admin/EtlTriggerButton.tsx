'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export function EtlTriggerButton() {
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')

  async function trigger() {
    setLoading(true)
    setMsg('')
    const res = await fetch('/api/admin/etl/trigger', {
      method:  'POST',
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_ETL_ADMIN_KEY ?? ''}` },
    })
    setLoading(false)
    setMsg(res.ok ? 'Sincronização iniciada!' : 'Erro ao iniciar sincronização.')
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-[14px] text-[#2B7A5A]">{msg}</span>}
      <Button variant="primary" size="sm" loading={loading} onClick={trigger}>
        Sincronizar agora
      </Button>
    </div>
  )
}
