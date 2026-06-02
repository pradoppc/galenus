'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { AutocompleteInput } from '@/components/ui/AutocompleteInput'
import { SEARCH_DEFAULTS } from '@/lib/design-tokens'
import type { BuscaParams } from '@/types'

interface BuscaFormProps {
  onSearch:  (params: BuscaParams) => void
  onLimpar?: () => void
  loading?:  boolean
}

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
const RADIUS_OPTIONS = [5, 10, 20, 50]

function useDebounce<T>(value: T, delay = 300): T {
  const [deb, setDeb] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return deb
}

export function BuscaForm({ onSearch, onLimpar, loading }: BuscaFormProps) {
  // ── Medicamento ───────────────────────────────────────────────────────────
  const [medTerm,     setMedTerm]     = useState('')
  const [medSugg,     setMedSugg]     = useState<string[]>([])
  const [medLoading,  setMedLoading]  = useState(false)
  const debouncedMed                  = useDebounce(medTerm, 300)

  // ── UF ────────────────────────────────────────────────────────────────────
  const [uf,          setUf]          = useState('')

  // ── Município — busca interna na lista pré-carregada ──────────────────────
  const [munInput,    setMunInput]    = useState('')   // o que está no campo
  const [munSelected, setMunSelected] = useState('')   // o que foi selecionado
  const [allMuns,     setAllMuns]     = useState<string[]>([])
  const [munLoading,  setMunLoading]  = useState(false)
  const filteredMuns = allMuns
    .filter(m => !munInput || m.toLowerCase().includes(munInput.toLowerCase()))
    .slice(0, 20)

  // ── Unidade de saúde — pré-carregada e filtrada localmente ────────────────
  const [unitInput,   setUnitInput]   = useState('')
  const [unitSelected,setUnitSelected]= useState('')
  const [allUnits,    setAllUnits]    = useState<string[]>([])
  const [unitLoading, setUnitLoading] = useState(false)
  const filteredUnits = allUnits
    .filter(u => !unitInput || u.toLowerCase().includes(unitInput.toLowerCase()))
    .slice(0, 20)

  // ── Endereço — autocomplete via API ───────────────────────────────────────
  const [endInput,    setEndInput]    = useState('')
  const [endSelected, setEndSelected] = useState('')
  const [endSugg,     setEndSugg]     = useState<string[]>([])
  const [endLoading,  setEndLoading]  = useState(false)
  const debouncedEnd                  = useDebounce(endInput, 400)

  // ── Raio + geocode ────────────────────────────────────────────────────────
  const [raio,        setRaio]        = useState<number>(SEARCH_DEFAULTS.RADIUS_KM)
  const [geocodedLat, setGeocodedLat] = useState<number | undefined>()
  const [geocodedLng, setGeocodedLng] = useState<number | undefined>()

  // ── Erros de validação ────────────────────────────────────────────────────
  const [errors,      setErrors]      = useState<Record<string, string>>({})
  function clearError(k: string) { setErrors(e => { const n = { ...e }; delete n[k]; return n }) }

  // ── Carrega municípios ao selecionar UF ───────────────────────────────────
  useEffect(() => {
    if (!uf) { setAllMuns([]); setMunInput(''); setMunSelected(''); return }
    setMunLoading(true)
    setMunInput(''); setMunSelected('')
    fetch(`/api/farmacias/municipios?uf=${encodeURIComponent(uf)}`)
      .then(r => r.json())
      .then((d: string[]) => setAllMuns(d))
      .catch(() => setAllMuns([]))
      .finally(() => setMunLoading(false))
  }, [uf])

  // ── Carrega todas as unidades ao selecionar município ─────────────────────
  useEffect(() => {
    if (!munSelected || !uf) { setAllUnits([]); setUnitInput(''); setUnitSelected(''); return }
    setUnitLoading(true)
    setUnitInput(''); setUnitSelected('')
    const sp = new URLSearchParams({ uf, municipio: munSelected })
    fetch(`/api/farmacias/unidades?${sp}`)
      .then(r => r.json())
      .then((d: string[]) => setAllUnits(d))
      .catch(() => setAllUnits([]))
      .finally(() => setUnitLoading(false))
  }, [munSelected, uf])

  // ── Autocomplete medicamento ───────────────────────────────────────────────
  useEffect(() => {
    if (debouncedMed.length < 3) { setMedSugg([]); return }
    setMedLoading(true)
    fetch(`/api/medicamentos/autocomplete?q=${encodeURIComponent(debouncedMed)}`)
      .then(r => r.json())
      .then((d: { value: string }[]) => setMedSugg(d.map(x => x.value)))
      .catch(() => setMedSugg([]))
      .finally(() => setMedLoading(false))
  }, [debouncedMed])

  // ── Autocomplete endereço (via API, depende de munSelected) ───────────────
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

  // ── Geocode quando endereço for selecionado ───────────────────────────────
  useEffect(() => {
    setGeocodedLat(undefined); setGeocodedLng(undefined)
    if (!endSelected || !munSelected || !uf) return
    const t = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${endSelected}, ${munSelected}, ${uf}, Brasil`)}&format=json&limit=1&countrycodes=br`,
          { headers: { 'User-Agent': 'Galenus/1.0' } }
        )
        const d = await res.json()
        if (d.length > 0) { setGeocodedLat(parseFloat(d[0].lat)); setGeocodedLng(parseFloat(d[0].lon)) }
      } catch { /* sem geocode */ }
    }, 500)
    return () => clearTimeout(t)
  }, [endSelected, munSelected, uf])

  // ── Submissão ─────────────────────────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (medTerm.trim().length < 3) errs.q         = 'Informe pelo menos 3 letras.'
    if (!uf)                        errs.uf        = 'Selecione uma UF.'
    if (!munSelected)               errs.municipio = 'Selecione um município.'
    if (Object.keys(errs).length)  { setErrors(errs); return }
    setErrors({})
    onSearch({
      q:         medTerm.trim(),
      uf,
      municipio: munSelected,
      unidade:   unitSelected || undefined,
      endereco:  endSelected  || undefined,
      lat:       geocodedLat,
      lng:       geocodedLng,
      raio:      endSelected ? raio : undefined,
    })
  }, [medTerm, uf, munSelected, unitSelected, endSelected, geocodedLat, geocodedLng, raio, onSearch])

  const handleLimpar = useCallback(() => {
    setMedTerm('');     setMedSugg([])
    setUf('')
    setMunInput('');    setMunSelected('');  setAllMuns([])
    setUnitInput('');   setUnitSelected(''); setAllUnits([])
    setEndInput('');    setEndSelected('');  setEndSugg([])
    setGeocodedLat(undefined); setGeocodedLng(undefined)
    setRaio(SEARCH_DEFAULTS.RADIUS_KM)
    setErrors({})
    onLimpar?.()
  }, [onLimpar])

  const hasFilters = !!(medTerm || uf || munSelected || unitSelected || endSelected)

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* ── Medicamento ── */}
      <AutocompleteInput
        label="Medicamento" required
        placeholder="Ex: metformina, losartana..."
        value={medTerm}
        onChange={v => { setMedTerm(v); clearError('q') }}
        suggestions={medSugg}
        loading={medLoading}
        error={errors.q}
        id="medicamento"
      />

      {/* ── UF ── */}
      <div className="space-y-1.5">
        <label htmlFor="uf" className="text-[16px] font-medium text-[#1A4D3A]">UF *</label>
        <select
          id="uf" value={uf}
          onChange={e => { setUf(e.target.value); clearError('uf') }}
          className={`h-12 w-full rounded-[10px] border bg-white px-4 text-[18px] text-[#2D4A3E] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20 ${errors.uf ? 'border-[#C04848]' : 'border-[#D4E8DF] focus:border-[#1A4D3A]'}`}
        >
          <option value="">Selecione a UF</option>
          {UFS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        {errors.uf && <p className="text-[14px] text-[#C04848]" role="alert">{errors.uf}</p>}
      </div>

      {/* ── Município — busca na lista local ── */}
      <AutocompleteInput
        label="Município" required
        placeholder={!uf ? 'Selecione a UF primeiro' : munLoading ? 'Carregando...' : `Buscar entre ${allMuns.length} municípios...`}
        value={munInput}
        onChange={v => { setMunInput(v); setMunSelected(''); clearError('municipio') }}
        onSelect={v => {
          setMunInput(v)      // ← fix #1: mostra o valor selecionado no campo
          setMunSelected(v)
          clearError('municipio')
        }}
        suggestions={filteredMuns}
        loading={munLoading}
        error={errors.municipio}
        disabled={!uf || munLoading}
        showOnFocus={allMuns.length > 0}
        id="municipio"
        hint={munSelected ? `✓ ${munSelected} selecionado` : undefined}
      />

      {/* ── Unidade de saúde — pré-carregada, filtra localmente ── */}
      <AutocompleteInput
        label="Unidade de Saúde / Hospital (opcional)"
        placeholder={!munSelected ? 'Selecione o município primeiro' : unitLoading ? 'Carregando...' : `Buscar entre ${allUnits.length} unidades...`}
        value={unitInput}
        onChange={v => { setUnitInput(v); setUnitSelected('') }}
        onSelect={v => {
          setUnitInput(v)     // ← mostra o valor selecionado
          setUnitSelected(v)
        }}
        suggestions={filteredUnits}
        loading={unitLoading}
        disabled={!munSelected}
        showOnFocus={allUnits.length > 0}
        id="unidade"
        hint={unitSelected ? `✓ ${unitSelected}` : !munSelected ? 'Selecione o município primeiro' : undefined}
      />

      {/* ── Endereço — autocomplete via API ── */}
      <AutocompleteInput
        label="Endereço (opcional)"
        placeholder={!munSelected ? 'Selecione o município primeiro' : 'Ex: Rua das Flores, Av. Brasil...'}
        value={endInput}
        onChange={v => { setEndInput(v); setEndSelected('') }}
        onSelect={v => {
          setEndInput(v)      // ← mostra o valor selecionado
          setEndSelected(v)
        }}
        suggestions={endSugg}
        loading={endLoading}
        disabled={!munSelected}
        id="endereco"
        hint={
          endSelected && geocodedLat
            ? '✓ Localização geocodificada — raio aplicável'
            : endSelected
            ? 'Geocodificando...'
            : !munSelected
            ? 'Selecione o município primeiro'
            : 'Digite o nome da rua para filtrar'
        }
      />

      {/* ── Raio (só quando endereço selecionado) ── */}
      {endSelected && (
        <div className="space-y-2">
          <p className="text-[16px] font-medium text-[#1A4D3A]">
            Raio: <strong>{raio} km</strong>
            {!geocodedLat && <span className="ml-2 text-[13px] font-normal text-[#9CB8B0]">(aguardando geocode)</span>}
          </p>
          <div className="flex gap-2">
            {RADIUS_OPTIONS.map(r => (
              <button key={r} type="button" onClick={() => setRaio(r)} aria-pressed={raio === r}
                className={`flex-1 h-10 rounded-[10px] text-[16px] font-medium border transition-colors ${raio === r ? 'bg-[#1A4D3A] text-[#EAF3EE] border-[#1A4D3A]' : 'bg-white text-[#1A4D3A] border-[#D4E8DF] hover:border-[#1A4D3A]'}`}>
                {r} km
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" className="flex-1" loading={loading}>
          Buscar
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleLimpar}
            aria-label="Limpar todos os filtros"
          >
            Limpar
          </Button>
        )}
      </div>
    </form>
  )
}
