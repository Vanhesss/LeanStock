import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ParticleField from '../animations/ParticleField'
import GlowOrbs from '../animations/GlowOrbs'

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface-950 bg-grid">
      <ParticleField />
      <GlowOrbs />
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
