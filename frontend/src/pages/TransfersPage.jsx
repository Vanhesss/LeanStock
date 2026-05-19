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
import { ArrowRightLeft, Plus, Check, X, Truck, PackageCheck } from 'lucide-react'

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [locations, setLocations] = useState([])
  const [inventory, setInventory] = useState([])
  const [form, setForm] = useState({ sourceLocationId: '', destLocationId: '', variantId: '', quantity: '', note: '' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/transfers', { params: { status: statusFilter || undefined, limit: 50 } })
      setTransfers(data.data || [])
    } catch {
      toast.error('Failed to load transfers')
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

  const sourceVariants = form.sourceLocationId
    ? inventory.filter(inv => inv.locationId === form.sourceLocationId && inv.available > 0)
    : []

  const action = async (id, act, body) => {
    try {
      await api.patch(`/transfers/${id}/${act}`, body)
      toast.success(`Transfer ${act}d!`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Failed to ${act}`)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/transfers', {
        sourceLocationId: form.sourceLocationId,
        destLocationId: form.destLocationId,
        items: [{ variantId: form.variantId, quantity: parseInt(form.quantity) }],
        note: form.note || undefined,
      })
      toast.success('Transfer created!')
      setShowCreate(false)
      setForm({ sourceLocationId: '', destLocationId: '', variantId: '', quantity: '', note: '' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create transfer')
    }
  }

  const statuses = ['', 'PENDING', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'REJECTED']

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ArrowRightLeft className="text-primary-400" /> Transfers
          </h1>
          <p className="text-surface-500 text-sm mt-1">Inter-location stock transfers</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={18} /> New Transfer
        </Button>
      </motion.div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <Button
            key={s || 'all'}
            variant={statusFilter === s ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s || 'All'}
          </Button>
        ))}
      </div>

      <Card hover={false}>
        {loading ? <Loader /> : transfers.length === 0 ? (
          <EmptyState icon={ArrowRightLeft} title="No transfers" message="Create a transfer to move stock between locations" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Items</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {transfers.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-mono text-xs">{t.id.slice(0, 8)}</Td>
                  <Td>{t.sourceLocation?.name}</Td>
                  <Td>{t.destLocation?.name}</Td>
                  <Td>{t.items?.length} item(s)</Td>
                  <Td><Badge status={t.status}>{t.status}</Badge></Td>
                  <Td>
                    <div className="flex gap-1">
                      {t.status === 'PENDING' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => action(t.id, 'approve')}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => {
                            const reason = prompt('Rejection reason:')
                            if (reason) action(t.id, 'reject', { reason })
                          }}>
                            <X size={14} />
                          </Button>
                        </>
                      )}
                      {t.status === 'APPROVED' && (
                        <Button size="sm" variant="primary" onClick={() => action(t.id, 'ship')}>
                          <Truck size={14} /> Ship
                        </Button>
                      )}
                      {t.status === 'IN_TRANSIT' && (
                        <Button size="sm" variant="success" onClick={() => action(t.id, 'receive')}>
                          <PackageCheck size={14} /> Receive
                        </Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Transfer">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Source Location</label>
            <select
              value={form.sourceLocationId}
              onChange={(e) => setForm({ ...form, sourceLocationId: e.target.value, variantId: '' })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select source</option>
              {locations.map(l => <option key={l.id} value={l.id} className="bg-surface-900">{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Destination Location</label>
            <select
              value={form.destLocationId}
              onChange={(e) => setForm({ ...form, destLocationId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select destination</option>
              {locations.filter(l => l.id !== form.sourceLocationId).map(l => (
                <option key={l.id} value={l.id} className="bg-surface-900">{l.name}</option>
              ))}
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
              {sourceVariants.map(inv => (
                <option key={inv.variantId} value={inv.variantId} className="bg-surface-900">
                  {inv.productModel} - {inv.sku} (Size {String(inv.size)}) — {inv.available} avail
                </option>
              ))}
            </select>
          </div>
          <Input label="Quantity" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
          <Input label="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
