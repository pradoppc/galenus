import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, id, ...props },
  ref
) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[16px] font-medium text-[#1A4D3A]"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          'h-12 w-full rounded-[10px] border border-[#D4E8DF] bg-white px-4 text-[18px] text-[#2D4A3E]',
          'placeholder:text-[#9CB8B0]',
          'focus:border-[#1A4D3A] focus:outline-none focus:ring-2 focus:ring-[#1A4D3A]/20',
          error && 'border-[#C04848] focus:ring-[#C04848]/20',
          className
        )}
        {...props}
      />
      {error && <p className="text-[14px] text-[#C04848]" role="alert">{error}</p>}
      {hint && !error && <p className="text-[14px] text-[#5B8C7A]">{hint}</p>}
    </div>
  )
})
