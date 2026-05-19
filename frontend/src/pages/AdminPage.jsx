import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Loader from '../components/ui/Loader'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import toast from 'react-hot-toast'
import {
  Shield, Users, MapPin, Tag, ScrollText, TrendingDown, Cpu,
  Plus, Play, RefreshCw,
} from 'lucide-react'

function formatKZT(value) {
  return Number(value).toLocaleString('ru-KZ') + ' ₸'
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

const tabs = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'locations', label: 'Locations', icon: MapPin },
  { id: 'brands', label: 'Brands', icon: Tag },
  { id: 'audit', label: 'Audit Logs', icon: ScrollText },
  { id: 'prices', label: 'Price History', icon: TrendingDown },
  { id: 'queues', label: 'Queues', icon: Cpu },
]

export default function AdminPage() {
  const [tab, setTab] = useState('users')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [queues, setQueues] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [locForm, setLocForm] = useState({ name: '', type: 'STORE', address: '', city: '' })
  const [brandForm, setBrandForm] = useState({ name: '' })

  const endpoints = {
    users: '/admin/users',
    locations: '/admin/locations',
    brands: '/admin/brands',
    audit: '/admin/audit-logs',
    prices: '/admin/price-history',
  }

  const load = async () => {
    setLoading(true)
    if (tab === 'queues') {
      try {
        const { data: res } = await api.get('/admin/queues')
        setQueues(res.data)
      } catch { setQueues(null) }
    } else {
      try {
        const { data: res } = await api.get(endpoints[tab], { params: { limit: 50 } })
        setData(res.data || [])
      } catch { setData([]) }
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [tab])

  const priceChartData = useMemo(() => {
    if (tab !== 'prices' || !data.length) return []
    return [...data]
      .sort((a, b) => new Date(a.appliedAt) - new Date(b.appliedAt))
      .map((row) => ({
        date: new Date(row.appliedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        sku: row.variant?.sku?.slice(-8) || '',
        oldPrice: row.oldPrice,
        newPrice: row.newPrice,
      }))
  }, [data, tab])

  const triggerJob = async (job) => {
    try {
      await api.post(`/admin/jobs/${job}`)
      toast.success(`Job ${job} triggered!`)
      setTimeout(load, 1000)
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to trigger job')
    }
  }

  const handleCreateLocation = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/locations', locForm)
      toast.success('Location created!')
      setShowModal(false)
      setLocForm({ name: '', type: 'STORE', address: '', city: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  const handleCreateBrand = async (e) => {
    e.preventDefault()
    try {
      await api.post('/admin/brands', brandForm)
      toast.success('Brand created!')
      setShowModal(false)
      setBrandForm({ name: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <Shield className="text-accent-400" /> Admin Panel
        </h1>
        <p className="text-surface-500 text-sm mt-1">System management and monitoring</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-white/5 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              tab === t.id ? 'bg-primary-600 text-white shadow-lg' : 'text-surface-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {tab === 'queues' ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Button onClick={() => triggerJob('dead-stock-decay')} variant="secondary">
                  <Play size={16} /> Trigger Dead Stock Decay
                </Button>
                <Button onClick={() => triggerJob('reservation-expiry')} variant="secondary">
                  <Play size={16} /> Trigger Reservation Expiry
                </Button>
                <Button onClick={load} variant="ghost">
                  <RefreshCw size={16} /> Refresh
                </Button>
              </div>
              {loading ? <Loader /> : queues && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(queues).map(([name, counts]) => (
                    <Card key={name}>
                      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                        <Cpu size={16} className="text-accent-400" /> {name}
                      </h3>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(counts).map(([status, count]) => (
                          <div key={status} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                            <span className="text-xs text-surface-400 capitalize">{status}</span>
                            <span className={`text-sm font-bold ${count > 0 && status === 'failed' ? 'text-danger-500' : 'text-white'}`}>
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Price History Chart */}
              {tab === 'prices' && priceChartData.length > 0 && (
                <Card>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <TrendingDown size={18} className="text-danger-500" /> Price Decay Chart
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={priceChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / 1000) + 'k'} />
                      <Tooltip {...chartTooltipStyle} formatter={(val) => [formatKZT(val)]} />
                      <Line type="monotone" dataKey="oldPrice" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 4 }} name="Old Price" />
                      <Line type="monotone" dataKey="newPrice" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} name="New Price" />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <Card hover={false}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-white font-semibold capitalize">{tab}</h3>
                  {(tab === 'locations' || tab === 'brands') && (
                    <Button size="sm" onClick={() => setShowModal(true)}>
                      <Plus size={16} /> Add
                    </Button>
                  )}
                </div>
                {loading ? <Loader /> : (
                  <Table>
                    <Thead>
                      <Tr>
                        {tab === 'users' && <><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Verified</Th><Th>Active</Th></>}
                        {tab === 'locations' && <><Th>Name</Th><Th>Type</Th><Th>City</Th><Th>Active</Th></>}
                        {tab === 'brands' && <><Th>Name</Th><Th>Active</Th><Th>Created</Th></>}
                        {tab === 'audit' && <><Th>Action</Th><Th>Entity</Th><Th>User</Th><Th>Date</Th></>}
                        {tab === 'prices' && <><Th>SKU</Th><Th>Old Price</Th><Th>New Price</Th><Th>Reason</Th><Th>Date</Th></>}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.map((row) => (
                        <Tr key={row.id}>
                          {tab === 'users' && (
                            <>
                              <Td className="!text-white font-medium">{row.firstName} {row.lastName}</Td>
                              <Td>{row.email}</Td>
                              <Td><Badge status={row.role}>{row.role}</Badge></Td>
                              <Td><Badge color={row.isEmailVerified ? 'green' : 'yellow'}>{row.isEmailVerified ? 'Yes' : 'No'}</Badge></Td>
                              <Td><Badge color={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Yes' : 'No'}</Badge></Td>
                            </>
                          )}
                          {tab === 'locations' && (
                            <>
                              <Td className="!text-white font-medium">{row.name}</Td>
                              <Td><Badge color={row.type === 'STORE' ? 'blue' : 'purple'}>{row.type}</Badge></Td>
                              <Td>{row.city || '—'}</Td>
                              <Td><Badge color={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Yes' : 'No'}</Badge></Td>
                            </>
                          )}
                          {tab === 'brands' && (
                            <>
                              <Td className="!text-white font-medium">{row.name}</Td>
                              <Td><Badge color={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Yes' : 'No'}</Badge></Td>
                              <Td className="text-xs">{new Date(row.createdAt).toLocaleDateString()}</Td>
                            </>
                          )}
                          {tab === 'audit' && (
                            <>
                              <Td className="!text-white font-medium text-xs">{row.action}</Td>
                              <Td><Badge color="blue">{row.entity}</Badge></Td>
                              <Td>{row.user?.firstName} {row.user?.lastName}</Td>
                              <Td className="text-xs">{new Date(row.createdAt).toLocaleString()}</Td>
                            </>
                          )}
                          {tab === 'prices' && (
                            <>
                              <Td className="font-mono text-xs">{row.variant?.sku}</Td>
                              <Td className="font-mono">{formatKZT(row.oldPrice)}</Td>
                              <Td className="font-mono !text-success-500">{formatKZT(row.newPrice)}</Td>
                              <Td className="text-xs">{row.reason}</Td>
                              <Td className="text-xs">{new Date(row.appliedAt).toLocaleString()}</Td>
                            </>
                          )}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                )}
              </Card>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Create Location Modal */}
      <Modal open={showModal && tab === 'locations'} onClose={() => setShowModal(false)} title="Add Location">
        <form onSubmit={handleCreateLocation} className="space-y-4">
          <Input label="Name" value={locForm.name} onChange={(e) => setLocForm({ ...locForm, name: e.target.value })} placeholder="Esentai Mall Store" required />
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Type</label>
            <select value={locForm.type} onChange={(e) => setLocForm({ ...locForm, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50">
              <option value="STORE" className="bg-surface-900">Store</option>
              <option value="WAREHOUSE" className="bg-surface-900">Warehouse</option>
            </select>
          </div>
          <Input label="Address" value={locForm.address} onChange={(e) => setLocForm({ ...locForm, address: e.target.value })} />
          <Input label="City" value={locForm.city} onChange={(e) => setLocForm({ ...locForm, city: e.target.value })} placeholder="Almaty" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>

      {/* Create Brand Modal */}
      <Modal open={showModal && tab === 'brands'} onClose={() => setShowModal(false)} title="Add Brand">
        <form onSubmit={handleCreateBrand} className="space-y-4">
          <Input label="Brand Name" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} placeholder="Puma" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
