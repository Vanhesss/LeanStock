import { motion } from 'framer-motion'

const orbs = [
  { color: 'from-primary-600/20 to-primary-400/5', size: 'w-96 h-96', x: '10%', y: '20%', duration: 20 },
  { color: 'from-accent-600/15 to-accent-400/5', size: 'w-80 h-80', x: '70%', y: '60%', duration: 25 },
  { color: 'from-primary-500/10 to-transparent', size: 'w-64 h-64', x: '50%', y: '10%', duration: 18 },
  { color: 'from-accent-500/10 to-transparent', size: 'w-72 h-72', x: '20%', y: '70%', duration: 22 },
]

export default function GlowOrbs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute ${orb.size} rounded-full bg-radial-at-center ${orb.color} blur-3xl`}
          style={{ left: orb.x, top: orb.y }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 15, -10, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}
