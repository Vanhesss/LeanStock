import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table'
import toast from 'react-hot-toast'
import { CalendarClock, Plus, XCircle, ArrowRight } from 'lucide-react'

export default function ReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [locations, setLocations] = useState([])
  const [inventory, setInventory] = useState([])
  const [form, setForm] = useState({ variantId: '', locationId: '', customerName: '', customerPhone: '', quantity: '1' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/reservations', { params: { status: statusFilter || undefined, limit: 50 } })
      setReservations(data.data || [])
    } catch {
      toast.error('Failed to load reservations')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [locRes, invRes] = await Promise.all([
          api.get('/locations'),
          api.get('/inventory', { params: { limit: 200 } }),
        ])
        setLocations(locRes.data.data || [])
        setInventory(invRes.data.data || [])
      } catch { /* ignore */ }
    }
    loadFormData()
  }, [])

  const filteredVariants = form.locationId
    ? inventory.filter(inv => inv.locationId === form.locationId && inv.available > 0)
    : inventory.filter(inv => inv.available > 0)

  const cancel = async (id) => {
    try {
      await api.patch(`/reservations/${id}/cancel`)
      toast.success('Reservation cancelled')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel')
    }
  }

  const convert = async (id) => {
    try {
      await api.patch(`/reservations/${id}/convert`)
      toast.success('Converted to sale!')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to convert')
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/reservations', {
        variantId: form.variantId,
        locationId: form.locationId,
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        quantity: parseInt(form.quantity),
      })
      toast.success('Reservation created!')
      setShowCreate(false)
      setForm({ variantId: '', locationId: '', customerName: '', customerPhone: '', quantity: '1' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create')
    }
  }

  const statuses = ['', 'ACTIVE', 'CONVERTED', 'CANCELLED', 'EXPIRED']

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <CalendarClock className="text-primary-400" /> Reservations
          </h1>
          <p className="text-surface-500 text-sm mt-1">Customer stock reservations</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Reservation
        </Button>
      </motion.div>

      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <Button key={s || 'all'} variant={statusFilter === s ? 'primary' : 'secondary'} size="sm" onClick={() => setStatusFilter(s)}>
            {s || 'All'}
          </Button>
        ))}
      </div>

      <Card hover={false}>
        {loading ? <Loader /> : reservations.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No reservations" message="Create a reservation for a customer" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Customer</Th>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Qty</Th>
                <Th>Status</Th>
                <Th>Expires</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {reservations.map((r) => (
                <Tr key={r.id}>
                  <Td className="!text-white font-medium">
                    {r.customerName}
                    {r.customerPhone && <span className="block text-xs text-surface-500">{r.customerPhone}</span>}
                  </Td>
                  <Td>{r.productModel}</Td>
                  <Td className="font-mono text-xs">{r.sku}</Td>
                  <Td>{r.quantity}</Td>
                  <Td><Badge status={r.status}>{r.status}</Badge></Td>
                  <Td className="text-xs">{new Date(r.expiresAt).toLocaleString()}</Td>
                  <Td>
                    {r.status === 'ACTIVE' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="success" onClick={() => convert(r.id)}>
                          <ArrowRight size={14} /> Sell
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => cancel(r.id)}>
                          <XCircle size={14} />
                        </Button>
                      </div>
                    )}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Reservation">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Customer Name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Alibek Nurlan" required />
          <Input label="Customer Phone" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} placeholder="+77001234567" />
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Location</label>
            <select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value, variantId: '' })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select location</option>
              {locations.map(l => <option key={l.id} value={l.id} className="bg-surface-900">{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Product Variant</label>
            <select
              value={form.variantId}
              onChange={(e) => setForm({ ...form, variantId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select product</option>
              {filteredVariants.map(inv => (
                <option key={inv.variantId} value={inv.variantId} className="bg-surface-900">
                  {inv.productModel} - {inv.sku} (Size {String(inv.size)}) — {inv.available} avail
                </option>
              ))}
            </select>
          </div>
          <Input label="Quantity" type="number" min="1" max="10" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Reserve</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
