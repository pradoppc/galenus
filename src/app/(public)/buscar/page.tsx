'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { BuscaForm } from '@/components/BuscaForm'
import { ListaMedicamentos } from '@/components/ListaMedicamentos'
import { AccessibilityToggle } from '@/components/AccessibilityToggle'
import type { BuscaParams, MedicamentoResult, BuscaResponse } from '@/types'

const MapaFarmacias = dynamic(
  () => import('@/components/MapaFarmacias').then((m) => m.MapaFarmacias),
  { ssr: false, loading: () => <div className="w-full rounded-[14px] bg-[#EAF3EE] animate-pulse" style={{ minHeight: 300 }} /> }
)

export default function BuscarPage() {
  const [results,   setResults]   = useState<MedicamentoResult[]>([])
  const [loading,   setLoading]   = useState(false)
  const [hasMore,   setHasMore]   = useState(false)
  const [page,      setPage]      = useState(1)
  const [lastParams,setLastParams]= useState<BuscaParams | null>(null)
  const [showMap,   setShowMap]   = useState(false)
  const [selected,  setSelected]  = useState<MedicamentoResult | null>(null)
  const [userLat,   setUserLat]   = useState<number | undefined>()
  const [userLng,   setUserLng]   = useState<number | undefined>()

  const fetchResults = useCallback(async (params: BuscaParams, append = false) => {
    setLoading(true)
    try {
      const sp = new URLSearchParams({
        q:     params.q,
        page:  String(params.page ?? 1),
        limit: '20',
      })
      if (params.lat) { sp.set('lat', String(params.lat)); sp.set('lng', String(params.lng)) }
      if (params.raio)    sp.set('raio',    String(params.raio))
      if (params.programa) sp.set('programa', params.programa)

      const res  = await fetch(`/api/medicamentos?${sp}`)
      const data = await res.json() as BuscaResponse & { hasMore: boolean }

      setResults(prev => append ? [...prev, ...data.data] : data.data)
      setHasMore(data.hasMore ?? false)
      if (params.lat) { setUserLat(params.lat); setUserLng(params.lng) }
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearch = useCallback((params: BuscaParams) => {
    setPage(1)
    setResults([])
    setLastParams(params)
    fetchResults({ ...params, page: 1 }, false)
  }, [fetchResults])

  const handleLoadMore = useCallback(() => {
    if (!lastParams) return
    const nextPage = page + 1
    setPage(nextPage)
    fetchResults({ ...lastParams, page: nextPage }, true)
  }, [lastParams, page, fetchResults])

  return (
    <main className="max-w-[640px] mx-auto px-5 pb-10">
      {/* Header */}
      <header className="flex items-center justify-between py-4 sticky top-0 bg-[#FAFCFB] z-10">
        <Link href="/" className="text-[#1A4D3A] text-[18px] font-medium" aria-label="Voltar para início">
          ← Galenus
        </Link>
        <AccessibilityToggle />
      </header>

      <h1 className="text-[28px] font-medium text-[#1A4D3A] mb-6">Buscar medicamentos</h1>

      <BuscaForm onSearch={handleSearch} loading={loading} />

      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[16px] text-[#5B8C7A]">{results.length} resultado{results.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setShowMap(v => !v)}
              className="text-[16px] text-[#1A4D3A] underline hover:no-underline"
              aria-expanded={showMap}
            >
              {showMap ? 'Ocultar mapa' : 'Ver no mapa'}
            </button>
          </div>

          {showMap && (
            <MapaFarmacias
              items={results}
              userLat={userLat}
              userLng={userLng}
              selected={selected}
            />
          )}

          <ListaMedicamentos
            items={results}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onVerMapa={(item) => { setSelected(item); setShowMap(true) }}
          />
        </div>
      )}

      {!loading && results.length === 0 && lastParams && (
        <div className="mt-10 text-center text-[#5B8C7A]">
          <p className="text-[20px]">Nenhuma farmácia encontrada</p>
          <p className="mt-2 text-[16px]">Tente ampliar o raio ou verificar o nome do medicamento.</p>
        </div>
      )}
    </main>
  )
}
