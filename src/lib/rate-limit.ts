import { NextRequest, NextResponse } from 'next/server'
import { getClientIP } from '@/lib/utils'

interface RateLimitEntry {
  count:     number
  resetTime: number
}

// Janela curta (por minuto) e janela longa (anti-scan) por IP
const store     = new Map<string, RateLimitEntry>()
const scanStore = new Map<string, RateLimitEntry>()

/**
 * Checagem de baixo nível — retorna true se permitido.
 */
export function checkRateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now   = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

/**
 * Detecção de varredura: mais de `threshold` requisições numa janela maior
 * (ex.: 200 req em 5 min) bloqueia o IP — protege contra scraping da base.
 */
function isScanning(ip: string, threshold = 300, windowMs = 5 * 60_000): boolean {
  const now   = Date.now()
  const entry = scanStore.get(ip)

  if (!entry || now > entry.resetTime) {
    scanStore.set(ip, { count: 1, resetTime: now + windowMs })
    return false
  }
  entry.count++
  return entry.count > threshold
}

interface RateLimitOptions {
  /** Requisições permitidas por minuto (padrão 30) */
  limit?:     number
  /** Limite da janela anti-scan de 5 min (padrão 300) */
  scanLimit?: number
}

/**
 * Helper para route handlers. Retorna um NextResponse 429 se o IP excedeu o
 * limite, ou `null` se a requisição pode prosseguir.
 *
 * Uso:
 *   const limited = rateLimit(req, { limit: 60 })
 *   if (limited) return limited
 */
export function rateLimit(req: NextRequest, opts: RateLimitOptions = {}): NextResponse | null {
  const ip = getClientIP(req)

  // Bloqueio por varredura (janela longa)
  if (isScanning(ip, opts.scanLimit ?? 300)) {
    return NextResponse.json(
      { error: 'Volume de requisições suspeito. Acesso temporariamente bloqueado.' },
      { status: 429, headers: { 'Retry-After': '300' } }
    )
  }

  // Limite por minuto (janela curta)
  if (!checkRateLimit(ip, opts.limit ?? 30)) {
    return NextResponse.json(
      { error: 'Muitas requisições. Aguarde um minuto e tente novamente.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    )
  }

  return null
}

// Limpeza periódica de entradas expiradas
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [k, v] of store)     if (now > v.resetTime) store.delete(k)
    for (const [k, v] of scanStore) if (now > v.resetTime) scanStore.delete(k)
  }, 600_000)
}
