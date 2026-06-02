'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'
import type { BuscaParams } from '@/types'

interface BuscaFormProps {
  onSearch: (params: BuscaParams) => void
  loading?: boolean
}

const RADIUS_OPTIONS = [5, 10, 20, 50]

const PROGRAMAS = [
  { value: '',          label: 'Todos os programas' },
  { value: 'FARMPOPUL', label: 'Farmácia Popular' },
  { value: 'RENAME',    label: 'RENAME' },
  { value: 'CEAF',      label: 'Componente Especializado' },
  { value: 'SAUDMULHER',label: 'Saúde da Mulher' },
]

export function BuscaForm({ onSearch, loading }: BuscaFormProps) {
  const [medicamento, setMedicamento] = useState('')
  const [raio,        setRaio]        = useState<number>(SEARCH_DEFAULTS.RADIUS_KM)
  const [programa,    setPrograma]    = useState('')
  const [lat,         setLat]         = useState<number | undefined>()
  const [lng,         setLng]         = useState<number | undefined>()
  const [endereco,    setEndereco]    = useState('')
  const [geoError,    setGeoError]    = useState('')
  const [geoLoading,  setGeoLoading]  = useState(false)
  const [inputError,  setInputError]  = useState('')

  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não disponível neste navegador.')
      return
    }
    setGeoLoading(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude)
        setLng(pos.coords.longitude)
        setEndereco('Sua localização atual')
        setGeoLoading(false)
      },
      () => {
        setGeoError('Não foi possível obter sua localização. Verifique as permissões do navegador.')
        setGeoLoading(false)
      },
      { timeout: 10_000 }
    )
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (medicamento.trim().length < 3) {
      setInputError('Digite pelo menos 3 letras do medicamento.')
      return
    }
    setInputError('')

    let searchLat = lat
    let searchLng = lng

    // Geocode address if no coords yet
    if (!searchLat && endereco && endereco !== 'Sua localização atual') {
      try {
        const res  = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco + ', Brasil')}&format=json&limit=1`)
        const data = await res.json()
        if (data.length > 0) {
          searchLat = parseFloat(data[0].lat)
          searchLng = parseFloat(data[0].lon)
          setLat(searchLat)
          setLng(searchLng)
        }
      } catch {
        // search without coords
      }
    }

    onSearch({
      q:        medicamento.trim(),
      lat:      searchLat,
      lng:      searchLng,
      raio,
      programa: programa || undefined,
    })
  }, [medicamento, lat, lng, endereco, raio, programa, onSearch])

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Input
        label="Medicamento"
        type="search"
        placeholder="Ex: metformina, losartana, captopril..."
        value={medicamento}
        onChange={(e) => { setMedicamento(e.target.value); setInputError('') }}
        error={inputError}
        autoComplete="off"
        autoFocus
        aria-label="Nome do medicamento"
      />

      <div className="space-y-2">
        <p className="text-[16px] font-medium text-[#1A4D3A]">Localização</p>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="w-full"
          loading={geoLoading}
          onClick={handleGeolocate}
          aria-label="Usar minha localização GPS"
        >
          📍 Usar minha localização
        </Button>
        <p className="text-[14px] text-[#5B8C7A] text-center">ou</p>
        <Input
          type="text"
          placeholder="Ex: Av. Paulista, São Paulo, SP"
          value={endereco === 'Sua localização atual' ? '' : endereco}
          onChange={(e) => { setEndereco(e.target.value); setLat(undefined); setLng(undefined) }}
          aria-label="Endereço para busca"
        />
        {geoError && <p className="text-[14px] text-[#C04848]" role="alert">{geoError}</p>}
        {lat && lng && <p className="text-[14px] text-[#2B7A5A]">✓ {endereco}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-[16px] font-medium text-[#1A4D3A]">
          Raio de busca: <strong>{raio} km</strong>
        </label>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRaio(r)}
              className={`flex-1 h-10 rounded-[10px] text-[16px] font-medium border transition-colors ${
                raio === r
                  ? 'bg-[#1A4D3A] text-[#EAF3EE] border-[#1A4D3A]'
                  : 'bg-white text-[#1A4D3A] border-[#D4E8DF] hover:border-[#1A4D3A]'
              }`}
              aria-label={`Raio de ${r} km`}
              aria-pressed={raio === r}
            >
              {r} km
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="programa" className="text-[16px] font-medium text-[#1A4D3A]">
          Programa de saúde
        </label>
        <select
          id="programa"
          value={programa}
          onChange={(e) => setPrograma(e.target.value)}
          className="h-12 w-full rounded-[10px] border border-[#D4E8DF] bg-white px-4 text-[18px] text-[#2D4A3E] focus:border-[#1A4D3A] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20"
          aria-label="Filtrar por programa de saúde"
        >
          {PROGRAMAS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={loading}
        aria-label="Buscar medicamentos"
      >
        Buscar medicamento
      </Button>
    </form>
  )
}
