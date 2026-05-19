import clsx from 'clsx'
import { forwardRef } from 'react'

const Input = forwardRef(({ label, error, className, type = 'text', ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        className={clsx(
          'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10',
          'text-white placeholder-surface-500',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
          'transition-all duration-200',
          error && 'border-danger-500/50 focus:ring-danger-500/50',
          className
        )}
        {...props}
      />
      {error && <p className="text-sm text-danger-500">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
