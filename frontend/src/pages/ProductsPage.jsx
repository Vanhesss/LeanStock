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
import { Package, Plus, Search, Pencil, Power } from 'lucide-react'

function formatKZT(value) {
  return Number(value).toLocaleString('ru-KZ') + ' ₸'
}

export default function ProductsPage() {
  const { isAdmin } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [brands, setBrands] = useState([])

  // Edit state
  const [editProduct, setEditProduct] = useState(null)
  const [editForm, setEditForm] = useState({ model: '', colorway: '', msrpPrice: '', isActive: true, excludeFromMarkdown: false })

  const [form, setForm] = useState({
    brandId: '', model: '', colorway: '', msrpPrice: '', sizes: '38,39,40,41,42,43,44,45',
  })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/products', { params: { search: search || undefined, limit: 50 } })
      setProducts(data.data || [])
    } catch {
      toast.error('Failed to load products')
    }
    setLoading(false)
  }

  const loadBrands = async () => {
    try {
      const { data } = await api.get('/admin/brands')
      setBrands(data.data || [])
    } catch { /* non-admin */ }
  }

  useEffect(() => { load() }, [search])
  useEffect(() => { if (isAdmin) loadBrands() }, [isAdmin])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/products', {
        ...form,
        msrpPrice: parseInt(form.msrpPrice),
        sizes: form.sizes.split(',').map(s => parseFloat(s.trim())),
      })
      toast.success('Product created!')
      setShowCreate(false)
      setForm({ brandId: '', model: '', colorway: '', msrpPrice: '', sizes: '38,39,40,41,42,43,44,45' })
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create product')
    }
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setEditForm({
      model: p.model,
      colorway: p.colorway,
      msrpPrice: String(p.msrpPrice),
      isActive: p.isActive,
      excludeFromMarkdown: p.excludeFromMarkdown || false,
    })
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      const payload = {}
      if (editForm.model !== editProduct.model) payload.model = editForm.model
      if (editForm.colorway !== editProduct.colorway) payload.colorway = editForm.colorway
      if (parseInt(editForm.msrpPrice) !== editProduct.msrpPrice) payload.msrpPrice = parseInt(editForm.msrpPrice)
      if (editForm.isActive !== editProduct.isActive) payload.isActive = editForm.isActive
      if (editForm.excludeFromMarkdown !== (editProduct.excludeFromMarkdown || false)) payload.excludeFromMarkdown = editForm.excludeFromMarkdown

      if (Object.keys(payload).length === 0) {
        toast('No changes to save')
        setEditProduct(null)
        return
      }

      await api.patch(`/products/${editProduct.id}`, payload)
      toast.success('Product updated!')
      setEditProduct(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update product')
    }
  }

  const toggleActive = async (p) => {
    try {
      await api.patch(`/products/${p.id}`, { isActive: !p.isActive })
      toast.success(p.isActive ? 'Product deactivated' : 'Product activated')
      load()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update')
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-primary-400" /> Products
          </h1>
          <p className="text-surface-500 text-sm mt-1">Manage your sneaker catalog</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={18} /> Add Product
          </Button>
        )}
      </motion.div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products or SKU..."
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card hover={false}>
        {loading ? <Loader /> : products.length === 0 ? (
          <EmptyState icon={Package} title="No products" message="Add your first product to get started" />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Product</Th>
                <Th>Brand</Th>
                <Th>Colorway</Th>
                <Th>MSRP</Th>
                <Th>Sizes</Th>
                <Th>Status</Th>
                {isAdmin && <Th>Actions</Th>}
              </Tr>
            </Thead>
            <Tbody>
              {products.map((p) => (
                <Tr key={p.id}>
                  <Td className="!text-white font-medium">{p.model}</Td>
                  <Td>{p.brand?.name}</Td>
                  <Td>{p.colorway}</Td>
                  <Td className="font-mono">{formatKZT(p.msrpPrice)}</Td>
                  <Td>
                    <span className="text-xs text-surface-400">{p.variants?.length || 0} sizes</span>
                  </Td>
                  <Td>
                    <Badge color={p.isActive ? 'green' : 'gray'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                  </Td>
                  {isAdmin && (
                    <Td>
                      <div className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant={p.isActive ? 'danger' : 'success'} onClick={() => toggleActive(p)}>
                          <Power size={14} />
                        </Button>
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Product">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Brand</label>
            <select
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              required
            >
              <option value="">Select brand</option>
              {brands.map(b => <option key={b.id} value={b.id} className="bg-surface-900">{b.name}</option>)}
            </select>
          </div>
          <Input label="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Air Max 90" required />
          <Input label="Colorway" value={form.colorway} onChange={(e) => setForm({ ...form, colorway: e.target.value })} placeholder="White/Black" required />
          <Input label="MSRP Price (tenge)" type="number" value={form.msrpPrice} onChange={(e) => setForm({ ...form, msrpPrice: e.target.value })} placeholder="65000" required />
          <Input label="Sizes (comma-separated)" value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} placeholder="38,39,40,41,42,43,44,45" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create Product</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={`Edit — ${editProduct?.model || ''}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <Input label="Model" value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} required />
          <Input label="Colorway" value={editForm.colorway} onChange={(e) => setEditForm({ ...editForm, colorway: e.target.value })} required />
          <Input label="MSRP Price (tenge)" type="number" value={editForm.msrpPrice} onChange={(e) => setEditForm({ ...editForm, msrpPrice: e.target.value })} required />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="w-4 h-4 rounded bg-white/5 border-white/20 text-primary-500 focus:ring-primary-500/50"
              />
              <span className="text-sm text-surface-300">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editForm.excludeFromMarkdown}
                onChange={(e) => setEditForm({ ...editForm, excludeFromMarkdown: e.target.checked })}
                className="w-4 h-4 rounded bg-white/5 border-white/20 text-primary-500 focus:ring-primary-500/50"
              />
              <span className="text-sm text-surface-300">Exclude from auto-markdown</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditProduct(null)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
