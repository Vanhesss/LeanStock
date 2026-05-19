import clsx from 'clsx'

const colorMap = {
  blue: 'bg-primary-500/15 text-primary-400 border-primary-500/30',
  green: 'bg-success-500/15 text-success-500 border-success-500/30',
  red: 'bg-danger-500/15 text-danger-500 border-danger-500/30',
  yellow: 'bg-warning-500/15 text-warning-500 border-warning-500/30',
  purple: 'bg-accent-500/15 text-accent-400 border-accent-500/30',
  gray: 'bg-surface-500/15 text-surface-400 border-surface-500/30',
}

const statusColors = {
  ACTIVE: 'green',
  PENDING: 'yellow',
  APPROVED: 'blue',
  IN_TRANSIT: 'purple',
  COMPLETED: 'green',
  REJECTED: 'red',
  CANCELLED: 'gray',
  EXPIRED: 'gray',
  CONVERTED: 'blue',
  ADMIN: 'purple',
  MANAGER: 'blue',
  STAFF: 'gray',
}

export default function Badge({ children, color, status, className }) {
  const resolvedColor = color || statusColors[status || children] || 'gray'

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border',
        colorMap[resolvedColor],
        className
      )}
    >
      {children || status}
    </span>
  )
}
