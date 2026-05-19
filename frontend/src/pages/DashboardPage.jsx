import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import api from '../lib/api'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  Package,
  ShoppingCart,
  CalendarClock,
  TrendingUp,
  Activity,
  DollarSign,
} from 'lucide-react'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

function formatKZT(value) {
  return Number(value).toLocaleString('ru-KZ') + ' ₸'
}

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colors = {
    blue: 'from-primary-500/20 to-primary-600/5 border-primary-500/20',
    green: 'from-success-500/20 to-success-500/5 border-success-500/20',
    purple: 'from-accent-500/20 to-accent-600/5 border-accent-500/20',
    yellow: 'from-warning-500/20 to-warning-500/5 border-warning-500/20',
  }
  const iconColors = {
    blue: 'text-primary-400',
    green: 'text-success-500',
    purple: 'text-accent-400',
    yellow: 'text-warning-500',
  }

  return (
    <motion.div variants={item}>
      <Card className={`bg-gradient-to-br ${colors[color]} !p-5`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-surface-400 font-medium">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
            {sub && <p className="text-xs text-surface-500 mt-1">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl bg-white/5 ${iconColors[color]}`}>
            <Icon size={22} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

const chartTooltipStyle = {
  contentStyle: {
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    color: '#f8fafc',
    fontSize: '13px',
  },
  labelStyle: { color: '#94a3b8' },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentSales, setRecentSales] = useState([])
  const [allSales, setAllSales] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [salesRes, reservationsRes, productsRes, allSalesRes] = await Promise.all([
          api.get('/sales', { params: { limit: 5 } }),
          api.get('/reservations', { params: { status: 'ACTIVE', limit: 5 } }),
          api.get('/products', { params: { limit: 1 } }),
          api.get('/sales', { params: { limit: 100 } }),
        ])
        setRecentSales(salesRes.data.data || [])
        setAllSales(allSalesRes.data.data || [])

        const salesData = allSalesRes.data.data || []
        const totalRevenue = salesData.reduce((sum, s) => sum + s.totalPrice, 0)

        setStats({
          totalSales: salesRes.data.meta?.total || 0,
          activeReservations: reservationsRes.data.meta?.total || 0,
          totalProducts: productsRes.data.meta?.total || 0,
          totalRevenue,
        })
      } catch {
        setStats({ totalSales: 0, activeReservations: 0, totalProducts: 0, totalRevenue: 0 })
      }
    }
    load()
  }, [])

  const chartData = useMemo(() => {
    if (!allSales.length) return []
    const byDay = {}
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      byDay[key] = { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0, count: 0 }
    }
    allSales.forEach((s) => {
      const key = new Date(s.soldAt).toISOString().slice(0, 10)
      if (byDay[key]) {
        byDay[key].revenue += s.totalPrice
        byDay[key].count += s.quantity
      }
    })
    return Object.values(byDay)
  }, [allSales])

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="gradient-text">{user?.firstName}</span>
        </h1>
        <p className="text-surface-500 mt-1">Here&apos;s what&apos;s happening with your inventory</p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Total Sales" value={stats?.totalSales ?? '...'} color="blue" />
        <StatCard icon={CalendarClock} label="Active Reservations" value={stats?.activeReservations ?? '...'} color="purple" />
        <StatCard icon={Package} label="Products" value={stats?.totalProducts ?? '...'} color="green" />
        <StatCard icon={DollarSign} label="Revenue" value={stats ? formatKZT(stats.totalRevenue) : '...'} sub={user?.role} color="yellow" />
      </motion.div>

      {/* Sales Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <TrendingUp size={20} className="text-primary-400" />
            Sales Trend (Last 14 Days)
          </h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip {...chartTooltipStyle} formatter={(val, name) => [name === 'revenue' ? formatKZT(val) : val, name === 'revenue' ? 'Revenue' : 'Items Sold']} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-surface-500 text-sm py-8 text-center">No sales data to chart</p>
          )}
        </Card>
      </motion.div>

      {/* Recent Sales */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Activity size={20} className="text-accent-400" />
              Recent Sales
            </h2>
          </div>
          {recentSales.length === 0 ? (
            <p className="text-surface-500 text-sm py-4 text-center">No sales recorded yet</p>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale, i) => (
                <motion.div
                  key={sale.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                      <ShoppingCart size={18} className="text-primary-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{sale.productModel}</p>
                      <p className="text-xs text-surface-500">{sale.sku} &bull; {sale.locationName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{formatKZT(sale.totalPrice)}</p>
                    <p className="text-xs text-surface-500">
                      {new Date(sale.soldAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
