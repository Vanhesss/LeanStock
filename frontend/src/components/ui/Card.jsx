import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function Card({ children, className, hover = true, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      className={clsx(
        'glass rounded-2xl p-6 relative overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  )
}
