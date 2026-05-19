import { PackageOpen } from 'lucide-react'

export default function EmptyState({ icon: Icon = PackageOpen, title = 'No data', message = 'Nothing to show here yet.' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mb-4">
        <Icon size={28} className="text-surface-500" />
      </div>
      <h3 className="text-lg font-medium text-surface-300 mb-1">{title}</h3>
      <p className="text-sm text-surface-500">{message}</p>
    </div>
  )
}
