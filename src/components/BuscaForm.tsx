'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'
import type { BuscaParams } from '@/types'

interface BuscaFormProps {
  onSearch: (params: BuscaParams) => void
  loading?: boolean
}

const RADIUS_OPTIONS = [5, 10, 20, 50]

interface Suggestion {
  label: string
  value: string
}

export function BuscaForm({ onSearch, loading }: BuscaFormProps) {
  // Medicamento
  const [medTerm,      setMedTerm]      = useState('')
  const [suggestions,  setSuggestions]  = useState<Suggestion[]>([])
  const [showSuggest,  setShowSuggest]  = useState(false)
  const [medSelected,  setMedSelected]  = useState(false)
  const suggestTimer                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Localização
  const [uf,           setUf]           = useState('')
  const [municipio,    setMunicipio]    = useState('')
  const [municipios,   setMunicipios]   = useState<string[]>([])
  const [loadingMun,   setLoadingMun]   = useState(false)

  // Endereço + raio
  const [endereco,     setEndereco]     = useState('')
  const [raio,         setRaio]         = useState<number>(SEARCH_DEFAULTS.RADIUS_KM)
  const [geocodedLat,  setGeocodedLat]  = useState<number | undefined>()
  const [geocodedLng,  setGeocodedLng]  = useState<number | undefined>()

  // Erros
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  // ── Autocomplete de medicamentos ──────────────────────────────────────────
  useEffect(() => {
    if (medSelected) return
    if (suggestTimer.current) clearTimeout(suggestTimer.current)

    if (medTerm.length < 3) {
      setSuggestions([])
      setShowSuggest(false)
      return
    }

    suggestTimer.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/medicamentos/autocomplete?q=${encodeURIComponent(medTerm)}`)
        const data = await res.json() as Suggestion[]
        setSuggestions(data)
        setShowSuggest(data.length > 0)
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current) }
  }, [medTerm, medSelected])

  function handleSelectSuggestion(s: Suggestion) {
    setMedTerm(s.value)
    setMedSelected(true)
    setShowSuggest(false)
    setSuggestions([])
    setErrors(e => { const n = { ...e }; delete n.q; return n })
  }

  function handleMedChange(v: string) {
    setMedTerm(v)
    setMedSelected(false)
    setErrors(e => { const n = { ...e }; delete n.q; return n })
  }

  // ── Carga de municípios ao selecionar UF ──────────────────────────────────
  useEffect(() => {
    if (!uf) { setMunicipios([]); setMunicipio(''); return }
    setLoadingMun(true)
    setMunicipio('')
    fetch(`/api/farmacias/municipios?uf=${encodeURIComponent(uf)}`)
      .then(r => r.json())
      .then((data: string[]) => setMunicipios(data))
      .catch(() => setMunicipios([]))
      .finally(() => setLoadingMun(false))
  }, [uf])

  // ── Geocodificação do endereço (quando preenchido + UF + município) ───────
  useEffect(() => {
    setGeocodedLat(undefined)
    setGeocodedLng(undefined)
    if (!endereco.trim() || !municipio || !uf) return

    const timer = setTimeout(async () => {
      try {
        const query = `${endereco}, ${municipio}, ${uf}, Brasil`
        const res   = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
          { headers: { 'User-Agent': 'Galenus/1.0' } }
        )
        const data = await res.json()
        if (data.length > 0) {
          setGeocodedLat(parseFloat(data[0].lat))
          setGeocodedLng(parseFloat(data[0].lon))
        }
      } catch {
        // sem geocode — busca só por texto
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [endereco, municipio, uf])

  // ── Submissão ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (medTerm.trim().length < 3) newErrors.q         = 'Informe pelo menos 3 letras do medicamento.'
    if (!uf)                        newErrors.uf        = 'Selecione uma UF.'
    if (!municipio)                 newErrors.municipio = 'Selecione um município.'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    onSearch({
      q:         medTerm.trim(),
      uf,
      municipio,
      endereco:  endereco.trim() || undefined,
      lat:       geocodedLat,
      lng:       geocodedLng,
      raio:      endereco.trim() ? raio : undefined,
    })
  }, [medTerm, uf, municipio, endereco, geocodedLat, geocodedLng, raio, onSearch])

  const enderecoPreenchido = endereco.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* ── Medicamento com autocomplete ── */}
      <div className="relative">
        <Input
          label="Medicamento *"
          type="search"
          placeholder="Ex: metformina, losartana, captopril..."
          value={medTerm}
          onChange={e => handleMedChange(e.target.value)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
          onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
          error={errors.q}
          autoComplete="off"
          aria-label="Nome do medicamento"
          aria-autocomplete="list"
          aria-expanded={showSuggest}
        />
        {showSuggest && (
          <ul
            className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-[#D4E8DF] rounded-[10px] shadow-[0_4px_16px_rgba(26,77,58,.12)] max-h-56 overflow-y-auto"
            role="listbox"
          >
            {suggestions.map((s, i) => (
              <li
                key={i}
                role="option"
                aria-selected={medTerm === s.value}
                className="px-4 py-3 text-[16px] text-[#2D4A3E] cursor-pointer hover:bg-[#EAF3EE] first:rounded-t-[10px] last:rounded-b-[10px]"
                onMouseDown={() => handleSelectSuggestion(s)}
              >
                {s.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── UF ── */}
      <div className="space-y-1.5">
        <label htmlFor="uf" className="text-[16px] font-medium text-[#1A4D3A]">
          UF *
        </label>
        <select
          id="uf"
          value={uf}
          onChange={e => { setUf(e.target.value); setErrors(er => { const n={...er}; delete n.uf; return n }) }}
          className={`h-12 w-full rounded-[10px] border bg-white px-4 text-[18px] text-[#2D4A3E] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20 ${errors.uf ? 'border-[#C04848]' : 'border-[#D4E8DF] focus:border-[#1A4D3A]'}`}
          aria-label="Selecione a UF"
        >
          <option value="">Selecione a UF</option>
          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
        {errors.uf && <p className="text-[14px] text-[#C04848]" role="alert">{errors.uf}</p>}
      </div>

      {/* ── Município ── */}
      <div className="space-y-1.5">
        <label htmlFor="municipio" className="text-[16px] font-medium text-[#1A4D3A]">
          Município *
        </label>
        <select
          id="municipio"
          value={municipio}
          onChange={e => { setMunicipio(e.target.value); setErrors(er => { const n={...er}; delete n.municipio; return n }) }}
          disabled={!uf || loadingMun}
          className={`h-12 w-full rounded-[10px] border bg-white px-4 text-[18px] text-[#2D4A3E] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20 disabled:opacity-50 disabled:cursor-not-allowed ${errors.municipio ? 'border-[#C04848]' : 'border-[#D4E8DF] focus:border-[#1A4D3A]'}`}
          aria-label="Selecione o município"
        >
          <option value="">
            {!uf ? 'Selecione a UF primeiro' : loadingMun ? 'Carregando...' : `Selecione o município (${municipios.length})`}
          </option>
          {municipios.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {errors.municipio && <p className="text-[14px] text-[#C04848]" role="alert">{errors.municipio}</p>}
      </div>

      {/* ── Endereço ── */}
      <div className="space-y-1.5">
        <Input
          label="Endereço (opcional)"
          type="text"
          placeholder="Ex: Rua das Flores, Av. Brasil..."
          value={endereco}
          onChange={e => setEndereco(e.target.value)}
          hint="Informe um trecho do nome da rua para refinar a busca"
          aria-label="Endereço ou nome da rua"
        />
        {enderecoPreenchido && geocodedLat && (
          <p className="text-[13px] text-[#2B7A5A]">✓ Localização encontrada — raio aplicável</p>
        )}
      </div>

      {/* ── Raio (apenas quando endereço preenchido) ── */}
      {enderecoPreenchido && (
        <div className="space-y-2">
          <p className="text-[16px] font-medium text-[#1A4D3A]">
            Raio de busca: <strong>{raio} km</strong>
            {!geocodedLat && <span className="ml-2 text-[13px] font-normal text-[#9CB8B0]">(aguardando geocodificação do endereço)</span>}
          </p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map(r => (
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
      )}

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
