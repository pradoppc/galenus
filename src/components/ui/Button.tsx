import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?:    'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
  ref
) {
  const base = 'inline-flex items-center justify-center font-medium rounded-[10px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-[#1A4D3A] text-[#EAF3EE] hover:bg-[#133B2C] focus:ring-[#1A4D3A]',
    secondary: 'bg-[#2B7A5A] text-white hover:bg-[#1A4D3A] focus:ring-[#2B7A5A]',
    outline:   'border-2 border-[#1A4D3A] text-[#1A4D3A] hover:bg-[#EAF3EE] focus:ring-[#1A4D3A]',
    ghost:     'text-[#1A4D3A] hover:bg-[#EAF3EE] focus:ring-[#1A4D3A]',
  }

  const sizes = {
    sm: 'h-10 px-4 text-[14px]',
    md: 'h-12 px-6 text-[16px]',
    lg: 'h-[60px] px-8 text-[18px]',
  }

  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
})
