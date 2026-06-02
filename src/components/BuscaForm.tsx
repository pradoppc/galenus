'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { AutocompleteInput } from '@/components/ui/AutocompleteInput'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'
import type { BuscaParams } from '@/types'

interface BuscaFormProps {
  onSearch: (params: BuscaParams) => void
  loading?: boolean
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const RADIUS_OPTIONS = [5, 10, 20, 50]

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export function BuscaForm({ onSearch, loading }: BuscaFormProps) {
  // ── Medicamento ─────────────────────────────────────────────────────────
  const [medTerm,      setMedTerm]      = useState('')
  const [medSugg,      setMedSugg]      = useState<string[]>([])
  const [medLoading,   setMedLoading]   = useState(false)
  const debouncedMed                    = useDebounce(medTerm, 300)

  // ── UF ──────────────────────────────────────────────────────────────────
  const [uf,           setUf]           = useState('')

  // ── Município com busca interna ─────────────────────────────────────────
  const [munTerm,      setMunTerm]      = useState('')
  const [munSelected,  setMunSelected]  = useState('')
  const [allMuns,      setAllMuns]      = useState<string[]>([])
  const [munLoading,   setMunLoading]   = useState(false)
  const filteredMuns = allMuns.filter(m =>
    munTerm.length === 0 || m.toLowerCase().includes(munTerm.toLowerCase())
  ).slice(0, 15)

  // ── Endereço (autocomplete na base) ─────────────────────────────────────
  const [endTerm,      setEndTerm]      = useState('')
  const [endSugg,      setEndSugg]      = useState<string[]>([])
  const [endLoading,   setEndLoading]   = useState(false)
  const debouncedEnd                    = useDebounce(endTerm, 400)

  // ── Unidade de saúde ────────────────────────────────────────────────────
  const [unitTerm,     setUnitTerm]     = useState('')
  const [unitSugg,     setUnitSugg]     = useState<string[]>([])
  const [unitLoading,  setUnitLoading]  = useState(false)
  const debouncedUnit                   = useDebounce(unitTerm, 400)

  // ── Raio ────────────────────────────────────────────────────────────────
  const [raio,         setRaio]         = useState<number>(SEARCH_DEFAULTS.RADIUS_KM)
  const [geocodedLat,  setGeocodedLat]  = useState<number | undefined>()
  const [geocodedLng,  setGeocodedLng]  = useState<number | undefined>()

  // ── Erros ────────────────────────────────────────────────────────────────
  const [errors,       setErrors]       = useState<Record<string, string>>({})

  function clearError(key: string) {
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  // ── Carregar municípios ao selecionar UF ─────────────────────────────────
  useEffect(() => {
    if (!uf) { setAllMuns([]); setMunTerm(''); setMunSelected(''); return }
    setMunLoading(true)
    setMunTerm('')
    setMunSelected('')
    fetch(`/api/farmacias/municipios?uf=${encodeURIComponent(uf)}`)
      .then(r => r.json())
      .then((data: string[]) => setAllMuns(data))
      .catch(() => setAllMuns([]))
      .finally(() => setMunLoading(false))
  }, [uf])

  // ── Autocomplete: medicamento ─────────────────────────────────────────────
  useEffect(() => {
    if (debouncedMed.length < 3) { setMedSugg([]); return }
    setMedLoading(true)
    fetch(`/api/medicamentos/autocomplete?q=${encodeURIComponent(debouncedMed)}`)
      .then(r => r.json())
      .then((d: { value: string }[]) => setMedSugg(d.map(x => x.value)))
      .catch(() => setMedSugg([]))
      .finally(() => setMedLoading(false))
  }, [debouncedMed])

  // ── Autocomplete: endereço ────────────────────────────────────────────────
  useEffect(() => {
    if (!munSelected || !uf || debouncedEnd.length < 3) { setEndSugg([]); return }
    setEndLoading(true)
    const sp = new URLSearchParams({ uf, municipio: munSelected, q: debouncedEnd })
    fetch(`/api/farmacias/enderecos?${sp}`)
      .then(r => r.json())
      .then((d: string[]) => setEndSugg(d))
      .catch(() => setEndSugg([]))
      .finally(() => setEndLoading(false))
  }, [debouncedEnd, munSelected, uf])

  // ── Autocomplete: unidade de saúde ────────────────────────────────────────
  useEffect(() => {
    if (!munSelected || !uf || debouncedUnit.length < 3) { setUnitSugg([]); return }
    setUnitLoading(true)
    const sp = new URLSearchParams({ uf, municipio: munSelected, q: debouncedUnit })
    fetch(`/api/farmacias/unidades?${sp}`)
      .then(r => r.json())
      .then((d: string[]) => setUnitSugg(d))
      .catch(() => setUnitSugg([]))
      .finally(() => setUnitLoading(false))
  }, [debouncedUnit, munSelected, uf])

  // ── Geocodificar endereço quando selecionado ──────────────────────────────
  useEffect(() => {
    setGeocodedLat(undefined)
    setGeocodedLng(undefined)
    if (!endTerm.trim() || !munSelected || !uf) return
    const t = setTimeout(async () => {
      try {
        const query = `${endTerm}, ${munSelected}, ${uf}, Brasil`
        const res   = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=br`,
          { headers: { 'User-Agent': 'Galenus/1.0' } }
        )
        const data = await res.json()
        if (data.length > 0) {
          setGeocodedLat(parseFloat(data[0].lat))
          setGeocodedLng(parseFloat(data[0].lon))
        }
      } catch { /* sem geocode */ }
    }, 800)
    return () => clearTimeout(t)
  }, [endTerm, munSelected, uf])

  // ── Submissão ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (medTerm.trim().length < 3) newErrors.q         = 'Informe pelo menos 3 letras do medicamento.'
    if (!uf)                        newErrors.uf        = 'Selecione uma UF.'
    if (!munSelected)               newErrors.municipio = 'Selecione um município.'
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return }
    setErrors({})

    onSearch({
      q:         medTerm.trim(),
      uf,
      municipio: munSelected,
      endereco:  endTerm.trim()  || undefined,
      unidade:   unitTerm.trim() || undefined,
      lat:       geocodedLat,
      lng:       geocodedLng,
      raio:      endTerm.trim() ? raio : undefined,
    })
  }, [medTerm, uf, munSelected, endTerm, unitTerm, geocodedLat, geocodedLng, raio, onSearch])

  const enderecoPreenchido = endTerm.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Medicamento */}
      <AutocompleteInput
        label="Medicamento"
        required
        placeholder="Ex: metformina, losartana..."
        value={medTerm}
        onChange={v => { setMedTerm(v); clearError('q') }}
        suggestions={medSugg}
        loading={medLoading}
        error={errors.q}
        id="medicamento"
      />

      {/* UF */}
      <div className="space-y-1.5">
        <label htmlFor="uf" className="text-[16px] font-medium text-[#1A4D3A]">UF *</label>
        <select
          id="uf"
          value={uf}
          onChange={e => { setUf(e.target.value); clearError('uf') }}
          className={`h-12 w-full rounded-[10px] border bg-white px-4 text-[18px] text-[#2D4A3E] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20 ${errors.uf ? 'border-[#C04848]' : 'border-[#D4E8DF] focus:border-[#1A4D3A]'}`}
        >
          <option value="">Selecione a UF</option>
          {UFS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {errors.uf && <p className="text-[14px] text-[#C04848]" role="alert">{errors.uf}</p>}
      </div>

      {/* Município com busca interna */}
      <AutocompleteInput
        label="Município"
        required
        placeholder={!uf ? 'Selecione a UF primeiro' : munLoading ? 'Carregando...' : `Buscar entre ${allMuns.length} municípios...`}
        value={munTerm}
        onChange={v => { setMunTerm(v); setMunSelected(''); clearError('municipio') }}
        onSelect={v => { setMunSelected(v); clearError('municipio') }}
        suggestions={filteredMuns}
        loading={munLoading}
        error={errors.municipio}
        disabled={!uf || munLoading}
        id="municipio"
        hint={munSelected ? `✓ ${munSelected}` : undefined}
      />

      {/* Endereço com autocomplete */}
      <AutocompleteInput
        label="Endereço (opcional)"
        placeholder="Ex: Rua das Flores, Av. Brasil..."
        value={endTerm}
        onChange={v => setEndTerm(v)}
        onSelect={v => setEndTerm(v)}
        suggestions={endSugg}
        loading={endLoading}
        disabled={!munSelected}
        id="endereco"
        hint={
          !munSelected
            ? 'Selecione o município primeiro'
            : enderecoPreenchido && geocodedLat
            ? '✓ Localização encontrada — raio aplicável'
            : 'Informe um trecho do nome da rua'
        }
      />

      {/* Raio (só quando endereço preenchido) */}
      {enderecoPreenchido && (
        <div className="space-y-2">
          <p className="text-[16px] font-medium text-[#1A4D3A]">
            Raio: <strong>{raio} km</strong>
            {!geocodedLat && (
              <span className="ml-2 text-[13px] font-normal text-[#9CB8B0]">(geocodificando endereço...)</span>
            )}
          </p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setRaio(r)}
                className={`flex-1 h-10 rounded-[10px] text-[16px] font-medium border transition-colors ${raio === r ? 'bg-[#1A4D3A] text-[#EAF3EE] border-[#1A4D3A]' : 'bg-white text-[#1A4D3A] border-[#D4E8DF] hover:border-[#1A4D3A]'}`}
                aria-pressed={raio === r}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Unidade de saúde */}
      <AutocompleteInput
        label="Unidade de Saúde / Hospital (opcional)"
        placeholder="Ex: UBS, Hospital, CAPS..."
        value={unitTerm}
        onChange={v => setUnitTerm(v)}
        onSelect={v => setUnitTerm(v)}
        suggestions={unitSugg}
        loading={unitLoading}
        disabled={!munSelected}
        id="unidade"
        hint={!munSelected ? 'Selecione o município primeiro' : undefined}
      />

      <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
        Buscar medicamento
      </Button>
    </form>
  )
}
