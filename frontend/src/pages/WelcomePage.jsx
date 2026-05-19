import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, Box, Globe2, Layers, Lock, RefreshCw, Truck, Zap,
  ChevronDown,
} from 'lucide-react'

const HERO_VIDEO = 'https://videos.pexels.com/video-files/5700368/5700368-hd_1920_1080_24fps.mp4'
const STORE_VIDEO = 'https://videos.pexels.com/video-files/5699536/5699536-hd_1920_1080_24fps.mp4'

function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let start = 0
    const step = end / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= end) { setCount(end); clearInterval(timer) }
      else setCount(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [inView, end, duration])

  return { count, ref }
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-black/70 backdrop-blur-xl border-b border-white/5' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[72px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black font-black text-sm tracking-tighter">LS</span>
          </div>
          <span className="font-semibold text-white text-[15px] tracking-tight">LeanStock</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm text-white/60 hover:text-white transition-colors">How It Works</a>
          <a href="#metrics" className="text-sm text-white/60 hover:text-white transition-colors">Metrics</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/70 hover:text-white transition-colors hidden sm:block">
            Log in
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

function FeatureCard({ icon: Icon, title, desc, idx }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: idx * 0.08 }}
      className="group p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4 group-hover:bg-white/[0.1] transition-colors">
        <Icon size={20} className="text-white/80" />
      </div>
      <h3 className="text-[15px] font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
    </motion.div>
  )
}

function StatBlock({ value, suffix, label }) {
  const { count, ref } = useCounter(value)
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
        {count}{suffix}
      </div>
      <div className="text-sm text-white/40 mt-2">{label}</div>
    </div>
  )
}

function StepItem({ num, title, desc, idx }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: idx * 0.15 }}
      className="flex gap-5"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-sm font-semibold text-white/60">
        {num}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
      </div>
    </motion.div>
  )
}

export default function WelcomePage() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15])
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.8], [0.55, 0.85])

  return (
    <div className="bg-[#050505] text-white min-h-screen">
      <Navbar />

      {/* ═══ HERO ═══ */}
      <section ref={heroRef} className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Video background */}
        <motion.div style={{ scale: videoScale }} className="absolute inset-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            poster=""
          >
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </motion.div>

        {/* Overlay */}
        <motion.div
          style={{ opacity: overlayOpacity }}
          className="absolute inset-0 bg-black"
        />

        {/* Bottom gradient for blending */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050505] to-transparent z-10" />

        {/* Content */}
        <div className="relative z-20 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-white/60 font-medium tracking-wide">Trusted by sneaker retailers in Kazakhstan</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35 }}
            className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.08] tracking-tight"
          >
            Inventory management
            <br />
            <span className="text-white/40">built for sneaker retail</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="text-base sm:text-lg text-white/40 mt-6 max-w-xl mx-auto leading-relaxed"
          >
            Track stock across locations, automate dead-stock pricing,
            and manage your entire supply chain from one dashboard.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.65 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10"
          >
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-all"
            >
              Start free trial
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition-all"
            >
              See features
            </a>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        >
          <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown size={20} className="text-white/20" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ SOCIAL PROOF BAR ═══ */}
      <section className="py-16 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-center text-xs text-white/30 uppercase tracking-[0.2em] mb-10">
            Built for multi-location sneaker retailers
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatBlock value={4} suffix="+" label="Store Locations" />
            <StatBlock value={100} suffix="+" label="SKUs Tracked" />
            <StatBlock value={24} suffix="/7" label="Auto Price Engine" />
            <StatBlock value={99} suffix="%" label="Inventory Accuracy" />
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Everything you need.<br />
              <span className="text-white/30">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-sm text-white/40 mt-4 max-w-lg leading-relaxed">
              From receiving shipments to automatic dead-stock markdowns —
              LeanStock covers the full lifecycle of sneaker inventory.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard idx={0} icon={Box} title="Product Catalog" desc="Manage models, colorways, and size variants. Auto-generated SKUs keep every pair uniquely identifiable." />
            <FeatureCard idx={1} icon={Layers} title="Multi-Location Stock" desc="Real-time on-hand, reserved, and available quantities across every store and warehouse." />
            <FeatureCard idx={2} icon={BarChart3} title="Sales Analytics" desc="Revenue charts, sell-through rates, and trend analysis. Know what moves and what sits." />
            <FeatureCard idx={3} icon={Zap} title="Smart Pricing" desc="Dead-stock auto-markdown reduces prices on slow movers. Full price history with audit trail." />
            <FeatureCard idx={4} icon={Truck} title="Transfer Workflow" desc="Request → Approve → Ship → Receive. Complete approval chain with notifications." />
            <FeatureCard idx={5} icon={Lock} title="Role-Based Access" desc="Admin, Manager, and Staff permissions. Every action logged in a tamper-proof audit trail." />
            <FeatureCard idx={6} icon={RefreshCw} title="Reservation System" desc="Reserve stock for customers with auto-expiry. Convert to sale or release back to inventory." />
            <FeatureCard idx={7} icon={Globe2} title="Multi-Tenant" desc="Tenant-isolated data architecture. Each retail chain sees only their own inventory." />
          </div>
        </div>
      </section>

      {/* ═══ VIDEO + HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-24 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Video side */}
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/[0.06]">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              >
                <source src={STORE_VIDEO} type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-white/70">Live inventory tracking</span>
                </div>
              </div>
            </div>

            {/* Steps side */}
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-3">
                How it works
              </h2>
              <p className="text-sm text-white/40 mb-10 max-w-md leading-relaxed">
                Get your entire sneaker operation running in minutes, not weeks.
              </p>
              <div className="space-y-8">
                <StepItem idx={0} num="1" title="Add your locations and products" desc="Create stores, warehouses, brands, and sneaker models. Size variants and SKUs are generated automatically." />
                <StepItem idx={1} num="2" title="Receive and track stock" desc="Log incoming shipments. Inventory updates in real-time across all locations with full audit trails." />
                <StepItem idx={2} num="3" title="Sell, reserve, and transfer" desc="Record sales, hold pairs for customers, and move stock between locations through an approval workflow." />
                <StepItem idx={3} num="4" title="Let automation handle the rest" desc="Dead-stock pricing runs on schedule. Reservations auto-expire. You focus on selling, not spreadsheets." />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section id="metrics" className="py-24 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Numbers that matter
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-16">
            Real results from running LeanStock across retail operations.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-4xl font-bold text-white mb-2">3x</div>
              <div className="text-sm text-white/40">Faster stock counts</div>
            </div>
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-4xl font-bold text-white mb-2">40%</div>
              <div className="text-sm text-white/40">Less dead stock</div>
            </div>
            <div className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="text-4xl font-bold text-white mb-2">0</div>
              <div className="text-sm text-white/40">Spreadsheets needed</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Ready to take control
            <br />
            of your inventory?
          </h2>
          <p className="text-sm text-white/40 max-w-md mx-auto mb-10">
            Sign in with a demo account and explore the full system —
            Admin, Manager, and Staff roles included.
          </p>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-white text-black text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Launch Dashboard
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <span className="text-black font-black text-[10px] tracking-tighter">LS</span>
            </div>
            <span className="text-sm text-white/40">LeanStock</span>
          </div>
          <p className="text-xs text-white/20">
            Sneaker inventory management &middot; Built in Kazakhstan
          </p>
        </div>
      </footer>
    </div>
  )
}
