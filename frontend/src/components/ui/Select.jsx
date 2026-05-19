import clsx from 'clsx'
import { forwardRef } from 'react'

const Select = forwardRef(({ label, error, options, className, placeholder, ...props }, ref) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-surface-300">{label}</label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10',
          'text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50',
          'transition-all duration-200 appearance-none',
          'bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20width%3D%2712%27%20height%3D%2712%27%20viewBox%3D%270%200%2012%2012%27%3E%3Cpath%20d%3D%27M2%204l4%204%204-4%27%20stroke%3D%27%2394a3b8%27%20stroke-width%3D%272%27%20fill%3D%27none%27%2F%3E%3C%2Fsvg%3E")] bg-no-repeat bg-[right_12px_center]',
          error && 'border-danger-500/50',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-surface-900">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger-500">{error}</p>}
    </div>
  )
})

Select.displayName = 'Select'
export default Select
