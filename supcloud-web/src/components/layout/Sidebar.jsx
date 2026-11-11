import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home, FolderOpen, Search, Share2, Trash2,
  Cloud, LogOut, Settings, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { formatBytes } from '../../utils'
import { ProgressBar } from '../ui'

const NAV = [
  { to: '/', icon: Home, label: 'Accueil' },
  { to: '/files', icon: FolderOpen, label: 'Mes fichiers' },
  { to: '/search', icon: Search, label: 'Recherche' },
  { to: '/shares', icon: Share2, label: 'Partages' },
  { to: '/trash', icon: Trash2, label: 'Corbeille' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const usedPct = user ? Math.min(100, (user.used_bytes / user.quota_bytes) * 100) : 0

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-dark-surface border-r border-dark-border flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-dark-border">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <Cloud size={16} className="text-white" />
        </div>
        <span className="font-display font-bold text-lg">SUPFile</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `menu-item ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Quota */}
      {user && (
        <div className="px-4 py-4 border-t border-dark-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-dark-muted font-medium">Stockage</span>
            <span className="text-xs text-dark-muted">{usedPct.toFixed(0)}%</span>
          </div>
          <ProgressBar value={user.used_bytes} max={user.quota_bytes} />
          <p className="text-xs text-dark-muted mt-1.5">
            {formatBytes(user.used_bytes)} / {formatBytes(user.quota_bytes)}
          </p>
        </div>
      )}

      {/* User + actions */}
      <div className="px-3 py-3 border-t border-dark-border space-y-1">
        <NavLink to="/settings" className={({ isActive }) => `menu-item ${isActive ? 'active' : ''}`}>
          <Settings size={18} />
          <span className="flex-1 text-sm">Paramètres</span>
        </NavLink>
        <button className="menu-item w-full text-danger hover:text-danger hover:bg-danger/10" onClick={handleLogout}>
          <LogOut size={18} />
          <span className="flex-1 text-sm text-left">Déconnexion</span>
        </button>
      </div>

      {/* Avatar */}
      {user && (
        <div className="flex items-center gap-3 px-4 py-3 border-t border-dark-border">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-dark-muted truncate">{user.email}</p>
          </div>
        </div>
      )}
    </aside>
  )
}
