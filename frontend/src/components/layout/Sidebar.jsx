import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowRightLeft,
  ShoppingCart,
  CalendarClock,
  Shield,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/transfers', icon: ArrowRightLeft, label: 'Transfers', role: 'MANAGER' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/reservations', icon: CalendarClock, label: 'Reservations' },
  { to: '/admin', icon: Shield, label: 'Admin', role: 'ADMIN' },
]

export default function Sidebar() {
  const { user, logout, isAdmin, isManager } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const filteredNav = navItems.filter((item) => {
    if (!item.role) return true
    if (item.role === 'ADMIN') return isAdmin
    if (item.role === 'MANAGER') return isManager
    return true
  })

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen sticky top-0 glass border-r border-white/10 flex flex-col z-30"
    >
      {/* Logo */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-lg">L</span>
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <h1 className="font-bold text-white text-lg leading-tight">LeanStock</h1>
            <p className="text-xs text-surface-500">Inventory System</p>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                  : 'text-surface-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <item.icon size={20} className="flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info & collapse */}
      <div className="p-3 border-t border-white/10 space-y-2">
        {!collapsed && user && (
          <div className="px-3 py-2 rounded-xl bg-white/5">
            <p className="text-sm font-medium text-white truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-surface-500 truncate">{user.email}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-danger-500 hover:bg-danger-500/10 transition-all flex-1 cursor-pointer"
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl text-surface-500 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>
    </motion.aside>
  )
}
