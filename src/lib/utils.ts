import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

export function formatDistance(km: number | null): string {
  if (km === null) return ''
  if (km < 1) return `${Math.round(km * 1000)} m de você`
  return `${km.toFixed(1).replace('.', ',')} km de você`
}

export function getClientIP(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return '127.0.0.1'
}
