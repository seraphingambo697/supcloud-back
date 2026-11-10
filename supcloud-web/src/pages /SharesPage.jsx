// src/pages/SharesPage.jsx
import { useState, useEffect } from 'react'
import { Link2, Trash2, Copy, Check, Calendar, Lock, Users } from 'lucide-react'
import { sharesApi } from '../api/shares'
import { EmptyState, ConfirmDialog, Spinner } from '../components/ui'
import { timeAgo, copyToClipboard } from '../utils'
import toast from 'react-hot-toast'


const toArray = (data) => {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.links)) return data.links
  if (Array.isArray(data.data)) return data.data
  if (Array.isArray(data.results)) return data.results
  return []
}

export default function SharesPage() {
  const [links, setLinks] = useState([])
  const [shared, setShared] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [tab, setTab] = useState('links')

  useEffect(() => {
    Promise.all([
      sharesApi.list().then(r => toArray(r.data)),
      sharesApi.sharedWithMe().then(r => toArray(r.data)).catch(() => []),
    ])
      .then(([l, s]) => { setLinks(l); setShared(s) })
      .catch(() => toast.error('Erreur chargement partages'))
      .finally(() => setLoading(false))
  }, [])

  const revoke = async (id) => {
    try {
      await sharesApi.revoke(id)
      setLinks(p => p.filter(l => l.id !== id))
      toast.success('Lien révoqué')
    } catch { toast.error('Erreur') }
  }

  const copy = async (url, id) => {
    await copyToClipboard(url)
    setCopied(id); toast.success('Copié !')
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-3xl mb-6">Partages</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-dark-variant rounded-xl p-1 mb-6 w-fit">
        {[
          { key: 'links', label: 'Mes liens', icon: Link2 },
          { key: 'shared', label: 'Partagés avec moi', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-dark-surface text-dark-text shadow' : 'text-dark-muted hover:text-dark-text'}`}>
            <Icon size={14} /> {label}
            {key === 'links' && links.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">
                {links.length}
              </span>
            )}
            {key === 'shared' && shared.length > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-accent/20 text-accent text-xs flex items-center justify-center">
                {shared.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center pt-12"><Spinner size="lg" /></div>
      ) : tab === 'links' ? (
        links.length === 0
          ? <EmptyState icon={Link2} title="Aucun lien actif"
            subtitle="Créez des liens depuis le gestionnaire de fichiers → clic droit → Partager." />
          : <div className="space-y-3">
            {links.map(link => (
              <div key={link.id} className={`card p-5 ${link.is_expired ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Link2 size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {link.file_item_name || 'Fichier'}
                    </p>
                    <p className="text-xs text-primary font-mono truncate mt-0.5">
                      {link.url}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-dark-muted">
                      {link.has_password && (
                        <span className="flex items-center gap-1">
                          <Lock size={10} /> Protégé
                        </span>
                      )}
                      {link.expires_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {link.is_expired ? '⚠️ Expiré' : `Expire ${timeAgo(link.expires_at)}`}
                        </span>
                      )}
                      <span>{link.download_count ?? 0} téléchargement{(link.download_count ?? 0) > 1 ? 's' : ''}</span>
                      <span>Créé {timeAgo(link.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!link.is_expired && (
                      <button className="btn-icon" onClick={() => copy(link.url, link.id)}>
                        {copied === link.id
                          ? <Check size={15} className="text-accent" />
                          : <Copy size={15} />}
                      </button>
                    )}
                    <button
                      className="btn-icon text-danger hover:bg-danger/10"
                      onClick={() => setConfirm(link.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
      ) : (
        shared.length === 0
          ? <EmptyState icon={Users} title="Aucun dossier partagé"
            subtitle="Des dossiers partagés avec vous apparaîtront ici." />
          : <div className="space-y-3">
            {shared.map(sf => (
              <div key={sf.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Users size={15} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{sf.folder_name}</p>
                    <p className="text-xs text-dark-muted">
                      Partagé par {sf.shared_by_name || 'Inconnu'} ·{' '}
                      {sf.can_edit ? 'Lecture + écriture' : 'Lecture seule'} ·{' '}
                      {timeAgo(sf.created_at)}
                    </p>
                  </div>
                  <span className={`badge ${sf.can_edit
                    ? 'bg-warning/15 text-warning'
                    : 'bg-dark-variant text-dark-muted'}`}>
                    {sf.can_edit ? 'Éditeur' : 'Lecteur'}
                  </span>
                </div>
              </div>
            ))}
          </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Révoquer le lien"
        message="Ce lien ne sera plus accessible. Continuer ?"
        confirmLabel="Révoquer"
        danger
        onConfirm={() => revoke(confirm)}
      />
    </div>
  )
}
