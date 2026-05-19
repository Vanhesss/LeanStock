import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api'
import Button from '../components/ui/Button'
import ParticleField from '../components/animations/ParticleField'
import GlowOrbs from '../components/animations/GlowOrbs'
import toast from 'react-hot-toast'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

const CODE_LENGTH = 6

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const inputRefs = useRef([])
  const navigate = useNavigate()

  useEffect(() => {
    if (!email) {
      navigate('/login', { replace: true })
    }
  }, [email, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)

    if (value && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all digits filled
    if (newDigits.every(d => d !== '') && value) {
      submitCode(newDigits.join(''))
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return

    const newDigits = Array(CODE_LENGTH).fill('')
    pasted.split('').forEach((char, i) => { newDigits[i] = char })
    setDigits(newDigits)

    if (pasted.length === CODE_LENGTH) {
      submitCode(pasted)
    } else {
      inputRefs.current[pasted.length]?.focus()
    }
  }

  const submitCode = async (code) => {
    setLoading(true)
    try {
      await api.post('/auth/verify-email', { email, code })
      toast.success('Email verified! You can now sign in.')
      navigate('/login', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Invalid code')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      await api.post('/auth/resend-verification', { email })
      toast.success('New code sent! Check your inbox.')
      setCooldown(60)
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to resend code')
    } finally {
      setResending(false)
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
          {/* Header */}
          <div className="text-center space-y-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, delay: 0.2 }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center mx-auto shadow-lg shadow-primary-600/30"
            >
              <ShieldCheck size={32} className="text-white" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Verify your email</h1>
              <p className="text-surface-500 text-sm mt-1">
                We sent a 6-digit code to
              </p>
              <p className="text-surface-300 text-sm font-medium">{email}</p>
            </div>
          </div>

          {/* Code input */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <motion.input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500/50 transition-all duration-200"
                disabled={loading}
              />
            ))}
          </div>

          {/* Resend */}
          <div className="text-center space-y-3">
            <p className="text-xs text-surface-500">Didn't receive the code?</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResend}
              loading={resending}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </Button>
          </div>

          {/* Back to login */}
          <div className="border-t border-white/10 pt-5">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 text-sm text-surface-400 hover:text-white transition-colors mx-auto cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
