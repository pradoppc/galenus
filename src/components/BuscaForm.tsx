'use client'

import { useState, useCallback, useEffect } from 'react'
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

  // ── Município ─────────────────────────────────────────────────────────────
  const [munInput,    setMunInput]    = useState('')
  const [munSelected, setMunSelected] = useState('')
  const [allMuns,     setAllMuns]     = useState<string[]>([])
  const [munLoading,  setMunLoading]  = useState(false)
  const filteredMuns = allMuns
    .filter(m => !munInput || m.toLowerCase().includes(munInput.toLowerCase()))
    .slice(0, 20)

  // ── Bairro ────────────────────────────────────────────────────────────────
  const [bairroInput,    setBairroInput]    = useState('')
  const [bairroSelected, setBairroSelected] = useState('')
  const [allBairros,     setAllBairros]     = useState<string[]>([])
  const [bairroLoading,  setBairroLoading]  = useState(false)
  const filteredBairros = allBairros
    .filter(b => !bairroInput || b.toLowerCase().includes(bairroInput.toLowerCase()))
    .slice(0, 20)

  // ── Unidade de saúde ──────────────────────────────────────────────────────
  const [unitInput,    setUnitInput]    = useState('')
  const [unitSelected, setUnitSelected] = useState('')
  const [allUnits,     setAllUnits]     = useState<string[]>([])
  const [unitLoading,  setUnitLoading]  = useState(false)
  const filteredUnits = allUnits
    .filter(u => !unitInput || u.toLowerCase().includes(unitInput.toLowerCase()))
    .slice(0, 20)

  // ── Erros ─────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({})
  function clearError(k: string) { setErrors(e => { const n = { ...e }; delete n[k]; return n }) }

  // ── Carrega municípios ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!uf) { setAllMuns([]); setMunInput(''); setMunSelected(''); return }
    setMunLoading(true)
    setMunInput(''); setMunSelected('')
    fetch(`/api/farmacias/municipios?uf=${encodeURIComponent(uf)}`)
      .then(r => r.json()).then((d: string[]) => setAllMuns(d))
      .catch(() => setAllMuns([])).finally(() => setMunLoading(false))
  }, [uf])

  // ── Carrega bairros ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!munSelected || !uf) { setAllBairros([]); setBairroInput(''); setBairroSelected(''); return }
    setBairroLoading(true)
    setBairroInput(''); setBairroSelected('')
    fetch(`/api/farmacias/bairros?uf=${encodeURIComponent(uf)}&municipio=${encodeURIComponent(munSelected)}`)
      .then(r => r.json()).then((d: string[]) => setAllBairros(d))
      .catch(() => setAllBairros([])).finally(() => setBairroLoading(false))
  }, [munSelected, uf])

  // ── Carrega unidades ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!munSelected || !uf) { setAllUnits([]); setUnitInput(''); setUnitSelected(''); return }
    setUnitLoading(true)
    setUnitInput(''); setUnitSelected('')
    const sp = new URLSearchParams({ uf, municipio: munSelected })
    fetch(`/api/farmacias/unidades?${sp}`)
      .then(r => r.json()).then((d: string[]) => setAllUnits(d))
      .catch(() => setAllUnits([])).finally(() => setUnitLoading(false))
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

  // ── Submissão ──────────────────────────────────────────────────────────────
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
      bairro:    bairroSelected || undefined,
      unidade:   unitSelected   || undefined,
    })
  }, [medTerm, uf, munSelected, bairroSelected, unitSelected, onSearch])

  // ── Limpar ─────────────────────────────────────────────────────────────────
  const handleLimpar = useCallback(() => {
    setMedTerm('');       setMedSugg([])
    setUf('')
    setMunInput('');      setMunSelected('');    setAllMuns([])
    setBairroInput('');   setBairroSelected(''); setAllBairros([])
    setUnitInput('');     setUnitSelected('');   setAllUnits([])
    setErrors({})
    onLimpar?.()
  }, [onLimpar])

  const hasFilters = !!(medTerm || uf || munSelected || bairroSelected || unitSelected)

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Medicamento */}
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

      {/* UF */}
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

      {/* Município */}
      <AutocompleteInput
        label="Município" required
        placeholder={!uf ? 'Selecione a UF primeiro' : munLoading ? 'Carregando...' : `Buscar entre ${allMuns.length} municípios...`}
        value={munInput}
        onChange={v => { setMunInput(v); setMunSelected(''); clearError('municipio') }}
        onSelect={v => { setMunInput(v); setMunSelected(v); clearError('municipio') }}
        suggestions={filteredMuns}
        loading={munLoading}
        error={errors.municipio}
        disabled={!uf || munLoading}
        showOnFocus={allMuns.length > 0}
        id="municipio"
        hint={munSelected ? `✓ ${munSelected} selecionado` : undefined}
      />

      {/* Bairro */}
      <AutocompleteInput
        label="Bairro (opcional)"
        placeholder={!munSelected ? 'Selecione o município primeiro' : bairroLoading ? 'Carregando...' : `Buscar entre ${allBairros.length} bairros...`}
        value={bairroInput}
        onChange={v => { setBairroInput(v); setBairroSelected('') }}
        onSelect={v => { setBairroInput(v); setBairroSelected(v) }}
        suggestions={filteredBairros}
        loading={bairroLoading}
        disabled={!munSelected}
        showOnFocus={allBairros.length > 0}
        id="bairro"
        hint={bairroSelected ? `✓ ${bairroSelected}` : !munSelected ? 'Selecione o município primeiro' : undefined}
      />

      {/* Unidade de saúde */}
      <AutocompleteInput
        label="Unidade de Saúde / Hospital (opcional)"
        placeholder={!munSelected ? 'Selecione o município primeiro' : unitLoading ? 'Carregando...' : `Buscar entre ${allUnits.length} unidades...`}
        value={unitInput}
        onChange={v => { setUnitInput(v); setUnitSelected('') }}
        onSelect={v => { setUnitInput(v); setUnitSelected(v) }}
        suggestions={filteredUnits}
        loading={unitLoading}
        disabled={!munSelected}
        showOnFocus={allUnits.length > 0}
        id="unidade"
        hint={unitSelected ? `✓ ${unitSelected}` : !munSelected ? 'Selecione o município primeiro' : undefined}
      />

      {/* Ações */}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" className="flex-1" loading={loading}>
          Buscar
        </Button>
        {hasFilters && (
          <Button type="button" variant="outline" size="lg" onClick={handleLimpar} aria-label="Limpar filtros">
            Limpar
          </Button>
        )}
      </div>
    </form>
  )
}
