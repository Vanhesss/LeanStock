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
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import { Warehouse, Search, AlertTriangle, PackagePlus } from 'lucide-react'

function formatKZT(value) {
  return Number(value).toLocaleString('ru-KZ') + ' ₸'
}

export default function InventoryPage() {
  const { isManager } = useAuth()
  const [inventory, setInventory] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [locationId, setLocationId] = useState('')
  const [search, setSearch] = useState('')
  const [lowStock, setLowStock] = useState(false)
  const [showReceive, setShowReceive] = useState(false)
  const [products, setProducts] = useState([])
  const [receiveForm, setReceiveForm] = useState({ locationId: '', variantId: '', quantity: '' })

  useEffect(() => {
    const loadLocations = async () => {
      try {
        const { data } = await api.get('/locations')
        setLocations(data.data || [])
        if (data.data?.length > 0 && !locationId) setLocationId(data.data[0].id)
      } catch {
        toast.error('Failed to load locations')
      }
    }
    loadLocations()
  }, [])

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data } = await api.get('/products', { params: { limit: 100 } })
        setProducts(data.data || [])
      } catch { /* ignore */ }
    }
    loadProducts()
  }, [])

  useEffect(() => {
    if (!locationId) return
    const load = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/inventory', {
          params: { locationId, search: search || undefined, lowStock: lowStock || undefined, limit: 100 },
        })
        setInventory(data.data || [])
      } catch {
        toast.error('Failed to load inventory')
      }
      setLoading(false)
    }
    load()
  }, [locationId, search, lowStock])

  const allVariants = products.flatMap(p =>
    (p.variants || []).map(v => ({ ...v, productModel: p.model, brandName: p.brand?.name }))
  )

  const handleReceive = async (e) => {
    e.preventDefault()
    try {
      await api.post('/inventory/receive', {
        locationId: receiveForm.locationId,
        items: [{ variantId: receiveForm.variantId, quantity: parseInt(receiveForm.quantity) }],
      })
      toast.success('Stock received!')
      setShowReceive(false)
      setReceiveForm({ locationId: '', variantId: '', quantity: '' })
      // Reload inventory
      if (receiveForm.locationId === locationId) {
        const { data } = await api.get('/inventory', {
          params: { locationId, search: search || undefined, lowStock: lowStock || undefined, limit: 100 },
        })
        setInventory(data.data || [])
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to receive stock')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Warehouse className="text-primary-400" /> Inventory
          </h1>
          <p className="text-surface-500 text-sm mt-1">Track stock across locations</p>
        </div>
        {isManager && (
          <Button onClick={() => setShowReceive(true)}>
            <PackagePlus size={18} /> Receive Stock
          </Button>
        )}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50"
        >
          {locations.map(l => <option key={l.id} value={l.id} className="bg-surface-900">{l.name}</option>)}
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search SKU, model..." className="pl-10" />
        </div>
        <Button
          variant={lowStock ? 'danger' : 'secondary'}
          onClick={() => setLowStock(!lowStock)}
        >
          <AlertTriangle size={16} /> Low Stock
        </Button>
      </div>

      {/* Table */}
      <Card hover={false}>
        {loading ? <Loader /> : inventory.length === 0 ? (
          <EmptyState icon={Warehouse} title="No inventory" message="No stock found at this location" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>SKU</Th>
                <Th>Product</Th>
                <Th>Size</Th>
                <Th>On Hand</Th>
                <Th>Reserved</Th>
                <Th>Available</Th>
                <Th>Price</Th>
              </Tr>
            </Thead>
            <Tbody>
              {inventory.map((inv) => (
                <Tr key={inv.id}>
                  <Td className="font-mono text-xs">{inv.sku}</Td>
                  <Td className="!text-white font-medium">{inv.productModel}</Td>
                  <Td>{String(inv.size)}</Td>
                  <Td>
                    <span className={inv.onHand < 3 ? 'text-danger-500 font-semibold' : ''}>
                      {inv.onHand}
                    </span>
                  </Td>
                  <Td>{inv.reservedQuantity}</Td>
                  <Td>
                    <Badge color={inv.available > 5 ? 'green' : inv.available > 0 ? 'yellow' : 'red'}>
                      {inv.available}
                    </Badge>
                  </Td>
                  <Td className="font-mono">{formatKZT(inv.currentPrice)}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      {/* Receive Modal */}
      <Modal open={showReceive} onClose={() => setShowReceive(false)} title="Receive Stock">
        <form onSubmit={handleReceive} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Location</label>
            <select
              value={receiveForm.locationId}
              onChange={(e) => setReceiveForm({ ...receiveForm, locationId: e.target.value })}
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
              value={receiveForm.variantId}
              onChange={(e) => setReceiveForm({ ...receiveForm, variantId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select product variant</option>
              {allVariants.map(v => (
                <option key={v.id} value={v.id} className="bg-surface-900">
                  {v.productModel} - {v.sku} (Size {String(v.size)})
                </option>
              ))}
            </select>
          </div>
          <Input label="Quantity" type="number" value={receiveForm.quantity} onChange={(e) => setReceiveForm({ ...receiveForm, quantity: e.target.value })} placeholder="10" min="1" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowReceive(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Receive</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
