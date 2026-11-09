// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Clock, Folder, Search, Trash2, Share2, HardDrive, TrendingUp } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { filesApi } from '../api/files'
import { formatBytes, timeAgo, CATEGORIES, categoryName } from '../utils'
import { FileIcon, ProgressBar, Spinner } from '../components/ui'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [recent, setRecent] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      filesApi.recent(5),
      filesApi.stats(),
    ]).then(([r, s]) => {
      setRecent(r.data)
      setStats(s.data)
    }).finally(() => setLoading(false))
  }, [])

  const usedPct = user ? Math.min(100, (user.used_bytes / user.quota_bytes) * 100) : 0

  const pieData = stats?.by_category
    ? Object.entries(stats.by_category)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: categoryName(key),
        value,
        color: CATEGORIES[key]?.color || '#8E8E93',
      }))
    : []

  const QUICK_ACTIONS = [
    { icon: Folder, label: 'Mes fichiers', to: '/files', color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Search, label: 'Recherche', to: '/search', color: 'text-accent', bg: 'bg-accent/10' },
    { icon: Share2, label: 'Partages', to: '/shares', color: 'text-[#BF5AF2]', bg: 'bg-[#BF5AF2]/10' },
    { icon: Trash2, label: 'Corbeille', to: '/trash', color: 'text-warning', bg: 'bg-warning/10' },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="font-display font-bold text-3xl">
          Bonjour, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-dark-muted mt-1">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actions rapides */}
          <div className="grid grid-cols-4 gap-3 animate-slide-up" style={{ animationDelay: '50ms' }}>
            {QUICK_ACTIONS.map(({ icon: Icon, label, to, color, bg }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className={`card flex flex-col items-center gap-2 p-4 hover:bg-dark-variant/50 transition-all hover:scale-105 active:scale-95 cursor-pointer`}
              >
                <div className={`w-10 h-10 rounded-2xl ${bg} flex items-center justify-center`}>
                  <Icon size={20} className={color} />
                </div>
                <span className={`text-xs font-semibold ${color}`}>{label}</span>
              </button>
            ))}
          </div>

          {/* Fichiers récents */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-dark-muted" />
                <h2 className="font-semibold">Récemment modifiés</h2>
              </div>
              <button className="text-xs text-primary hover:underline" onClick={() => navigate('/files')}>
                Voir tout →
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : recent.length === 0 ? (
              <p className="text-dark-muted text-sm text-center py-8">Aucun fichier récent</p>
            ) : (
              <div className="space-y-2">
                {recent.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => navigate('/files', { state: { openFile: file } })}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-variant cursor-pointer transition-colors group"
                  >
                    <FileIcon file={file} size={38} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{file.name}</p>
                      <p className="text-xs text-dark-muted">
                        {file.size_bytes ? formatBytes(file.size_bytes) : 'Dossier'}
                      </p>
                    </div>
                    <span className="text-xs text-dark-muted flex-shrink-0">{timeAgo(file.modified_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Colonne stockage */}
        <div className="space-y-6">
          {/* Jauge stockage */}
          <div className="card p-6 animate-slide-up" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-2 mb-4">
              <HardDrive size={18} className="text-dark-muted" />
              <h2 className="font-semibold">Stockage</h2>
            </div>

            {user && (
              <>
                <div className="text-center mb-4">
                  <p className="font-display font-bold text-3xl">{usedPct.toFixed(0)}%</p>
                  <p className="text-dark-muted text-sm">utilisé</p>
                </div>
                <ProgressBar value={user.used_bytes} max={user.quota_bytes} className="mb-3" />
                <div className="flex justify-between text-xs text-dark-muted">
                  <span>{formatBytes(user.used_bytes)}</span>
                  <span>{formatBytes(user.quota_bytes)}</span>
                </div>
                <p className="text-accent text-xs font-medium mt-2 text-center">
                  {formatBytes(user.quota_bytes - user.used_bytes)} disponibles
                </p>
              </>
            )}
          </div>

          {/* Camembert par catégorie */}
          {pieData.length > 0 && (
            <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} className="text-dark-muted" />
                <h2 className="font-semibold">Répartition</h2>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatBytes(v)} contentStyle={{ background: '#1C1C1E', border: 'none', borderRadius: 12, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-3">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-dark-muted flex-1">{entry.name}</span>
                    <span className="font-medium">{formatBytes(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
