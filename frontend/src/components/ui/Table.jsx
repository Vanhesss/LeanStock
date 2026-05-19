import { motion } from 'framer-motion'

export function Table({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead className="bg-white/5 text-surface-400 uppercase text-xs tracking-wider">
      {children}
    </thead>
  )
}

export function Th({ children, className = '' }) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-white/5">{children}</tbody>
}

export function Tr({ children, onClick }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`hover:bg-white/5 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </motion.tr>
  )
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-surface-300 ${className}`}>{children}</td>
}
