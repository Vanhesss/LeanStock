import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import api from '../lib/api'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Loader from '../components/ui/Loader'
import EmptyState from '../components/ui/EmptyState'
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table'
import toast from 'react-hot-toast'
import { ShoppingCart, Plus } from 'lucide-react'

function formatKZT(value) {
  return Number(value).toLocaleString('ru-KZ') + ' ₸'
}

export default function SalesPage() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [locations, setLocations] = useState([])
  const [inventory, setInventory] = useState([])
  const [form, setForm] = useState({ variantId: '', locationId: '', quantity: '1', unitPrice: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sales', { params: { limit: 50 } })
      setSales(data.data || [])
    } catch {
      toast.error('Failed to load sales')
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const [locRes, invRes] = await Promise.all([
          api.get('/locations'),
          api.get('/inventory', { params: { limit: 100 } }),
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

  const selectedInv = inventory.find(inv => inv.variantId === form.variantId && inv.locationId === form.locationId)

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/sales', {
        variantId: form.variantId,
        locationId: form.locationId,
        quantity: parseInt(form.quantity),
        unitPrice: parseInt(form.unitPrice),
      })
      toast.success('Sale recorded!')
      setShowCreate(false)
      setForm({ variantId: '', locationId: '', quantity: '1', unitPrice: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record sale')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart className="text-primary-400" /> Sales
          </h1>
          <p className="text-surface-500 text-sm mt-1">Sales history and recording</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Record Sale
        </Button>
      </motion.div>

      <Card hover={false}>
        {loading ? <Loader /> : sales.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="No sales" message="Record your first sale" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Product</Th>
                <Th>SKU</Th>
                <Th>Qty</Th>
                <Th>Unit Price</Th>
                <Th>Total</Th>
                <Th>Location</Th>
                <Th>Sold By</Th>
                <Th>Date</Th>
              </Tr>
            </Thead>
            <Tbody>
              {sales.map((s) => (
                <Tr key={s.id}>
                  <Td className="!text-white font-medium">{s.productModel}</Td>
                  <Td className="font-mono text-xs">{s.sku}</Td>
                  <Td>{s.quantity}</Td>
                  <Td className="font-mono">{formatKZT(s.unitPrice)}</Td>
                  <Td className="font-mono !text-white font-semibold">{formatKZT(s.totalPrice)}</Td>
                  <Td>{s.locationName}</Td>
                  <Td>{s.soldBy}</Td>
                  <Td className="text-xs">{new Date(s.soldAt).toLocaleString()}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Sale">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Location</label>
            <select
              value={form.locationId}
              onChange={(e) => setForm({ ...form, locationId: e.target.value, variantId: '', unitPrice: '' })}
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
              onChange={(e) => {
                const inv = filteredVariants.find(v => v.variantId === e.target.value)
                setForm({ ...form, variantId: e.target.value, unitPrice: inv ? String(inv.currentPrice) : '' })
              }}
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
          <Input label="Quantity" type="number" min="1" max={selectedInv?.available || 100} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <Input label="Unit Price (tenge)" type="number" min="1" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} placeholder="65000" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Record Sale</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
