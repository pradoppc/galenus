'use client'

import { useRef, useState, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface AutocompleteInputProps {
  label:          string
  placeholder?:   string
  value:          string
  onChange:       (val: string) => void
  onSelect?:      (val: string) => void
  suggestions:    string[]
  loading?:       boolean
  error?:         string
  hint?:          string
  disabled?:      boolean
  required?:      boolean
  id?:            string
  /** Abre a lista ao focar mesmo com input vazio */
  showOnFocus?:   boolean
}

export function AutocompleteInput({
  label, placeholder, value, onChange, onSelect,
  suggestions, loading, error, hint, disabled, required, id,
  showOnFocus = false,
}: AutocompleteInputProps) {
  const [open,      setOpen]      = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef                  = useRef<HTMLInputElement>(null)
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  function select(val: string) {
    onChange(val)
    onSelect?.(val)
    setOpen(false)
    setActiveIdx(-1)
    inputRef.current?.focus()
  }

  function handleFocus() {
    if (suggestions.length > 0 && (showOnFocus || value.length > 0)) setOpen(true)
  }

  function handleChange(v: string) {
    onChange(v)
    setActiveIdx(-1)
    setOpen(suggestions.length > 0 || v.length > 0)
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      select(suggestions[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  // Re-abre quando suggestions chegam (após resposta da API)
  const shouldOpen = open && suggestions.length > 0

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label htmlFor={inputId} className="text-[16px] font-medium text-[#1A4D3A]">
        {label}{required && ' *'}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={value}
          onChange={e => handleChange(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          onFocus={handleFocus}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={shouldOpen}
          aria-controls={shouldOpen ? `${inputId}-list` : undefined}
          aria-activedescendant={activeIdx >= 0 ? `${inputId}-opt-${activeIdx}` : undefined}
          className={cn(
            'h-12 w-full rounded-[10px] border bg-white px-4 text-[18px] text-[#2D4A3E]',
            'placeholder:text-[#9CB8B0]',
            'focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error
              ? 'border-[#C04848] focus:ring-[#C04848]/20'
              : 'border-[#D4E8DF] focus:border-[#1A4D3A]',
          )}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 animate-spin text-[#5B8C7A]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}
      </div>

      {shouldOpen && (
        <ul
          id={`${inputId}-list`}
          role="listbox"
          className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-[#D4E8DF] rounded-[10px] shadow-[0_4px_16px_rgba(26,77,58,.12)] max-h-60 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              id={`${inputId}-opt-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              className={cn(
                'px-4 py-3 text-[16px] text-[#2D4A3E] cursor-pointer',
                'first:rounded-t-[10px] last:rounded-b-[10px]',
                i === activeIdx ? 'bg-[#EAF3EE] font-medium' : 'hover:bg-[#EAF3EE]',
              )}
              onMouseDown={() => select(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-[14px] text-[#C04848]" role="alert">{error}</p>}
      {hint && !error && <p className="text-[14px] text-[#5B8C7A]">{hint}</p>}
    </div>
  )
}
