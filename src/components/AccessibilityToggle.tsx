'use client'

import { useEffect, useState } from 'react'
import { STORAGE_KEYS } from '@/lib/design-tokens'

export function AccessibilityToggle() {
  const [fontLarge,     setFontLarge]     = useState(false)
  const [highContrast,  setHighContrast]  = useState(false)

  useEffect(() => {
    const fl = localStorage.getItem(STORAGE_KEYS.FONT_SIZE)    === 'large'
    const hc = localStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST) === 'true'
    setFontLarge(fl)
    setHighContrast(hc)
    if (fl) document.body.classList.add('font-large')
    if (hc) document.body.classList.add('high-contrast')
  }, [])

  function toggleFont() {
    const next = !fontLarge
    setFontLarge(next)
    document.body.classList.toggle('font-large', next)
    localStorage.setItem(STORAGE_KEYS.FONT_SIZE, next ? 'large' : 'normal')
  }

  function toggleContrast() {
    const next = !highContrast
    setHighContrast(next)
    document.body.classList.toggle('high-contrast', next)
    localStorage.setItem(STORAGE_KEYS.HIGH_CONTRAST, String(next))
  }

  return (
    <div className="flex gap-2" role="group" aria-label="Acessibilidade">
      <button
        onClick={toggleFont}
        className="h-9 px-3 rounded-[8px] border border-[#D4E8DF] text-[16px] text-[#5B8C7A] hover:bg-[#EAF3EE] transition-colors"
        aria-label={fontLarge ? 'Diminuir fonte' : 'Aumentar fonte'}
        aria-pressed={fontLarge}
        title="Tamanho da fonte"
      >
        {fontLarge ? 'A-' : 'A+'}
      </button>
      <button
        onClick={toggleContrast}
        className="h-9 px-3 rounded-[8px] border border-[#D4E8DF] text-[16px] text-[#5B8C7A] hover:bg-[#EAF3EE] transition-colors"
        aria-label={highContrast ? 'Desativar alto contraste' : 'Ativar alto contraste'}
        aria-pressed={highContrast}
        title="Alto contraste"
      >
        ◑
      </button>
    </div>
  )
}
