import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import ParticleField from '../components/animations/ParticleField'
import GlowOrbs from '../components/animations/GlowOrbs'
import toast from 'react-hot-toast'
import { Lock, Mail } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      const errorCode = err.response?.data?.error?.code
      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        toast('Verification code sent to your email', { icon: '\u2709\uFE0F' })
        navigate(`/verify-email?email=${encodeURIComponent(email)}`)
        return
      }
      toast.error(err.response?.data?.error?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-950 bg-grid relative overflow-hidden">
      <ParticleField />
      <GlowOrbs />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="glass-strong rounded-3xl p-8 space-y-8">
          {/* Logo */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto shadow-lg shadow-primary-600/30"
            >
              <span className="text-white font-black text-2xl">L</span>
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">LeanStock</h1>
              <p className="text-surface-500 text-sm mt-1">Sign in to your inventory dashboard</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 mt-3" />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@leanstock.kz"
                className="pl-10"
                required
              />
            </div>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500 mt-3" />
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password123!"
                className="pl-10"
                required
              />
            </div>
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>

          {/* Demo credentials */}
          <div className="border-t border-white/10 pt-5">
            <p className="text-xs text-surface-500 text-center mb-3">Demo Accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'Admin', email: 'admin@leanstock.kz' },
                { role: 'Manager', email: 'manager@leanstock.kz' },
                { role: 'Staff', email: 'staff@leanstock.kz' },
              ].map((demo) => (
                <button
                  key={demo.role}
                  type="button"
                  onClick={() => { setEmail(demo.email); setPassword('Password123!') }}
                  className="px-2 py-1.5 rounded-lg text-xs font-medium glass hover:bg-white/10 text-surface-300 transition-all cursor-pointer"
                >
                  {demo.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
