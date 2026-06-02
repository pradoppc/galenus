import { cn } from '@/lib/utils'
import { STOCK_THRESHOLDS } from '@/lib/design-tokens'

type BadgeVariant = 'disponivel' | 'baixo' | 'indisponivel'

interface BadgeProps {
  variant:   BadgeVariant
  quantity?: number
  className?: string
}

export function Badge({ variant, quantity, className }: BadgeProps) {
  const styles: Record<BadgeVariant, string> = {
    disponivel:    'bg-[#EAF3EE] text-[#1A4D3A]',
    baixo:         'bg-[#FEF3E2] text-[#8A5C10]',
    indisponivel:  'bg-[#FEF0F0] text-[#8B2222]',
  }

  const labels: Record<BadgeVariant, string> = {
    disponivel:   quantity !== undefined ? `Disponível (${quantity} unidades)` : 'Disponível',
    baixo:        quantity !== undefined ? `Estoque baixo (${quantity} unidades)` : 'Estoque baixo',
    indisponivel: 'Indisponível',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[14px] font-medium',
        styles[variant],
        className
      )}
    >
      {labels[variant]}
    </span>
  )
}

export function stockBadgeVariant(quantity: number): BadgeVariant {
  if (quantity === 0) return 'indisponivel'
  if (quantity <= STOCK_THRESHOLDS.LOW) return 'baixo'
  return 'disponivel'
}
