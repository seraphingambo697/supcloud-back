import { useState } from 'react'
import { User, Lock, Palette, Sun, Moon, Save, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/auth'
import { getErrorMessage } from '../api/client'
import { formatBytes } from '../utils'
import { ProgressBar, Spinner } from '../components/ui'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('profile')

  const TABS = [
    { key: 'profile', icon: User, label: 'Profil' },
    { key: 'security', icon: Lock, label: 'Sécurité' },
    { key: 'appearance', icon: Palette, label: 'Apparence' },
  ]

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="font-display font-bold text-3xl mb-8">Paramètres</h1>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-44 flex-shrink-0 space-y-1">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`menu-item w-full ${tab === key ? 'active' : ''}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="flex-1 space-y-6">
          {tab === 'profile' && <ProfileTab user={user} onUpdate={updateUser} />}
          {tab === 'security' && <SecurityTab />}
          {tab === 'appearance' && <AppearanceTab />}
        </div>
      </div>
    </div>
  )
}

function ProfileTab({ user, onUpdate }) {
  const [name, setName] = useState(user?.name || '')
  const [loading, setLoading] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await authApi.update({ name: name.trim() })
      onUpdate(res.data)
      toast.success('Profil mis à jour')
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setLoading(false) }
  }

  const usedPct = user ? Math.min(100, (user.used_bytes / user.quota_bytes) * 100) : 0

  return (
    <>
      {/* Avatar */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Informations personnelles</h2>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-2xl">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-dark-muted">{user?.email}</p>
            {user?.oauth_provider && (
              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full mt-1 inline-block">
                Connecté via {user.oauth_provider}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Nom complet</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Email</label>
            <input className="input opacity-60" value={user?.email || ''} disabled />
            <p className="text-xs text-dark-muted mt-1">L'email ne peut pas être modifié</p>
          </div>
          <button className="btn-primary" onClick={save} disabled={loading}>
            {loading ? <Spinner size="sm" /> : <><Save size={15} /> Enregistrer</>}
          </button>
        </div>
      </div>

      {/* Stockage */}
      <div className="card p-6">
        <h2 className="font-semibold mb-4">Espace de stockage</h2>
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold">{formatBytes(user?.used_bytes || 0)}</p>
            <p className="text-dark-muted text-sm">sur {formatBytes(user?.quota_bytes || 0)}</p>
          </div>
          <p className={`text-lg font-bold ${usedPct > 80 ? 'text-danger' : 'text-accent'}`}>{usedPct.toFixed(0)}%</p>
        </div>
        <ProgressBar value={user?.used_bytes || 0} max={user?.quota_bytes || 1} />
        <p className="text-accent text-sm font-medium mt-2">{formatBytes((user?.quota_bytes || 0) - (user?.used_bytes || 0))} disponibles</p>
      </div>
    </>
  )
}


function SecurityTab() {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [loading, setL] = useState(false)
  const [errors, setErrors] = useState({})

  const save = async () => {
    const e = {}
    if (!form.current) e.current = 'Requis'
    if (form.next.length < 8) e.next = 'Minimum 8 caractères'
    if (form.next !== form.confirm) e.confirm = 'Ne correspond pas'
    setErrors(e)
    if (Object.keys(e).length) return

    setL(true)
    try {
      await authApi.password(form.current, form.next)
      toast.success('Mot de passe mis à jour')
      setForm({ current: '', next: '', confirm: '' })
    } catch (err) {
      setErrors({ global: getErrorMessage(err) })
    } finally { setL(false) }
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">Changer le mot de passe</h2>
      {errors.global && <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 mb-4 text-danger text-sm">{errors.global}</div>}
      <div className="space-y-4">
        {[
          { key: 'current', label: 'Mot de passe actuel' },
          { key: 'next', label: 'Nouveau mot de passe' },
          { key: 'confirm', label: 'Confirmer le nouveau mot de passe' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm text-dark-muted mb-1.5 block">{label}</label>
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                className={`input pr-10 ${errors[key] ? 'border-danger' : ''}`}
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted" onClick={() => setShow(s => !s)}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors[key] && <p className="text-danger text-xs mt-1">{errors[key]}</p>}
          </div>
        ))}
        <button className="btn-primary" onClick={save} disabled={loading}>
          {loading ? <Spinner size="sm" /> : <><Save size={15} /> Mettre à jour</>}
        </button>
      </div>
    </div>
  )
}

function AppearanceTab() {
  const [isDark, setIsDark] = useState(true)

  const toggle = (dark) => {
    setIsDark(dark)
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  return (
    <div className="card p-6">
      <h2 className="font-semibold mb-4">Apparence</h2>
      <p className="text-sm text-dark-muted mb-4">Choisissez votre thème préféré.</p>
      <div className="grid grid-cols-2 gap-3">
        {[
          { dark: false, icon: Sun, label: 'Clair' },
          { dark: true, icon: Moon, label: 'Sombre' },
        ].map(({ dark, icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => toggle(dark)}
            className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-3
              ${isDark === dark ? 'border-primary bg-primary/10' : 'border-dark-border hover:border-dark-variant'}`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${dark ? 'bg-dark-variant' : 'bg-light-variant'}`}>
              <Icon size={24} className={dark ? 'text-white' : 'text-dark-bg'} />
            </div>
            <span className="text-sm font-medium">{label}</span>
            {isDark === dark && <span className="text-xs text-primary font-medium">Actif</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
