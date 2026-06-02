'use client'

import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/design-tokens'

export function AccessibilityToggle() {
  const [fontLarge,    setFontLarge]    = useState(false)
  const [highContrast, setHighContrast] = useState(false)

  useEffect(() => {
    const fl = localStorage.getItem(STORAGE_KEYS.FONT_SIZE)     === 'large'
    const hc = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true'
    setFontLarge(fl)
    setHighContrast(hc)
    applyFont(fl)
    applyContrast(hc)
  }, [])

  function applyFont(active: boolean) {
    // Zoom no html afeta toda a página incluindo elementos com px hardcoded
    document.documentElement.classList.toggle('font-large', active)
  }

  function applyContrast(active: boolean) {
    document.documentElement.classList.toggle('high-contrast', active)
  }

  function toggleFont() {
    const next = !fontLarge
    setFontLarge(next)
    applyFont(next)
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, next ? 'large' : 'normal')
  }

  function toggleContrast() {
    const next = !highContrast
    setHighContrast(next)
    applyContrast(next)
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(next))
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Opções de acessibilidade">
      <button
        onClick={toggleFont}
        className={`h-10 px-3 rounded-[8px] border text-[16px] font-medium transition-colors select-none
          ${fontLarge
            ? 'bg-[#1A4D3A] text-[#EAF3EE] border-[#1A4D3A]'
            : 'border-[#D4E8DF] text-[#5B8C7A] hover:bg-[#EAF3EE]'
          }`}
        aria-label={fontLarge ? 'Diminuir fonte' : 'Aumentar fonte'}
        aria-pressed={fontLarge}
        title={fontLarge ? 'Fonte normal' : 'Fonte maior'}
      >
        {fontLarge ? 'A−' : 'A+'}
      </button>
      <button
        onClick={toggleContrast}
        className={`h-10 px-3 rounded-[8px] border text-[18px] transition-colors select-none
          ${highContrast
            ? 'bg-[#1A4D3A] text-[#EAF3EE] border-[#1A4D3A]'
            : 'border-[#D4E8DF] text-[#5B8C7A] hover:bg-[#EAF3EE]'
          }`}
        aria-label={highContrast ? 'Desativar alto contraste' : 'Ativar alto contraste'}
        aria-pressed={highContrast}
        title={highContrast ? 'Contraste normal' : 'Alto contraste'}
      >
        ◑
      </button>
    </div>
  )
}
