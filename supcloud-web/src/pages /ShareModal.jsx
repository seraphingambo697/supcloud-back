// src/components/share/ShareModal.jsx
import { useState, useEffect } from 'react'
import { Link2, Lock, Calendar, Copy, Trash2, Share2, Users, Check } from 'lucide-react'
import { sharesApi } from '../../api/shares'
import { Modal, Spinner, FileIcon } from '../ui'
import { formatBytes, timeAgo, copyToClipboard, isFolder } from '../../utils'
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

export default function ShareModal({ file, onClose }) {
  const [tab, setTab] = useState('public')
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [copiedId, setCopied] = useState(null)

  // Options lien public
  const [withPassword, setWithPwd] = useState(false)
  const [password, setPwd] = useState('')
  const [withExpiry, setWithExp] = useState(false)
  const [expiryDate, setExpDate] = useState('')

  // Partage interne
  const [email, setEmail] = useState('')
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    sharesApi.list()
      .then(r => {
        const all = toArray(r.data)
        // Filtrer pour ce fichier uniquement
        setLinks(all.filter(l => l.file_item_id === file.id))
      })
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [file.id])

  const createLink = async () => {
    setCreating(true)
    try {
      const expires = withExpiry && expiryDate ? new Date(expiryDate).toISOString() : null
      const pwd = withPassword && password ? password : null
      const res = await sharesApi.create(file.id, expires, pwd)
      const newLink = res.data?.id ? res.data : res.data?.item || res.data
      if (newLink?.id) {
        setLinks(p => [newLink, ...p])
      }
      toast.success('Lien créé !')
      setWithPwd(false); setPwd('')
      setWithExp(false); setExpDate('')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erreur création lien')
    } finally {
      setCreating(false)
    }
  }

  const revoke = async (id) => {
    try {
      await sharesApi.revoke(id)
      setLinks(p => p.filter(l => l.id !== id))
      toast.success('Lien révoqué')
    } catch { toast.error('Erreur') }
  }

  const copy = async (url, id) => {
    await copyToClipboard(url)
    setCopied(id); toast.success('Lien copié !')
    setTimeout(() => setCopied(null), 2000)
  }

  const shareInternal = async () => {
    if (!email.includes('@')) { toast.error('Email invalide'); return }
    setSharing(true)
    try {
      await sharesApi.shareFolder(file.id, email, canEdit)
      toast.success(`Dossier partagé avec ${email}`)
      setEmail('')
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Erreur partage')
    } finally { setSharing(false) }
  }

  return (
    <Modal open onClose={onClose} title="Partager" size="lg">
      {/* Fichier cible */}
      <div className="flex items-center gap-3 p-3 bg-dark-variant rounded-xl mb-5">
        <FileIcon file={file} size={36} />
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{file.name}</p>
          <p className="text-xs text-dark-muted">
            {file.size_bytes ? formatBytes(file.size_bytes) : 'Dossier'}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-dark-variant rounded-xl p-1 mb-5">
        {[
          { key: 'public', icon: Link2, label: 'Lien public' },
          { key: 'internal', icon: Users, label: 'Partage interne', disabled: !isFolder(file) },
        ].map(({ key, icon: Icon, label, disabled }) => (
          <button
            key={key} disabled={disabled}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
              ${tab === key ? 'bg-dark-surface text-dark-text shadow' : 'text-dark-muted hover:text-dark-text'}
              ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'public' && (
        <div className="space-y-4">
          {/* Options */}
          <div className="space-y-3">
            {/* Mot de passe */}
            <div className="card p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={withPassword}
                  onChange={e => setWithPwd(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <Lock size={15} className="text-dark-muted" />
                <span className="text-sm">Protéger par mot de passe</span>
              </label>
              {withPassword && (
                <input className="input mt-3" type="password"
                  placeholder="Mot de passe du lien"
                  value={password} onChange={e => setPwd(e.target.value)} />
              )}
            </div>

            {/* Date expiration */}
            <div className="card p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={withExpiry}
                  onChange={e => setWithExp(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary" />
                <Calendar size={15} className="text-dark-muted" />
                <span className="text-sm">Définir une date d'expiration</span>
              </label>
              {withExpiry && (
                <input className="input mt-3" type="date"
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  value={expiryDate} onChange={e => setExpDate(e.target.value)} />
              )}
            </div>
          </div>

          <button className="btn-primary w-full justify-center" onClick={createLink} disabled={creating}>
            {creating ? <Spinner size="sm" /> : <><Link2 size={15} /> Générer un lien</>}
          </button>

          {/* Liens existants */}
          {loading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : links.length > 0 ? (
            <div className="space-y-3 mt-4">
              <p className="text-sm font-medium text-dark-muted">
                Liens actifs ({links.length})
              </p>
              {links.map(link => (
                <div key={link.id} className={`card p-4 ${link.is_expired ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex-1 text-sm text-primary truncate font-mono">
                      {link.url}
                    </span>
                    <button
                      className={`btn-icon ${copiedId === link.id ? 'text-accent' : ''}`}
                      onClick={() => copy(link.url, link.id)}
                      disabled={link.is_expired}
                    >
                      {copiedId === link.id ? <Check size={15} /> : <Copy size={15} />}
                    </button>
                    <button
                      className="btn-icon text-danger hover:bg-danger/10"
                      onClick={() => revoke(link.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-dark-muted">
                    {link.has_password && (
                      <span className="flex items-center gap-1"><Lock size={11} /> Protégé</span>
                    )}
                    {link.expires_at && (
                      <span className="flex items-center gap-1"><Calendar size={11} />
                        {link.is_expired ? '⚠ Expiré' : `Expire ${timeAgo(link.expires_at)}`}
                      </span>
                    )}
                    <span>{link.download_count ?? 0} téléch.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Partage interne ────────────────────────────────────────────────── */}
      {tab === 'internal' && (
        <div className="space-y-4">
          <div className="p-3 bg-primary/10 rounded-xl text-sm text-primary">
            Le dossier apparaîtra à la racine du Drive de l'autre utilisateur.
          </div>
          <div>
            <label className="text-sm text-dark-muted mb-1.5 block">Email de l'utilisateur</label>
            <input className="input" type="email"
              placeholder="utilisateur@exemple.com"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="card p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={canEdit}
                onChange={e => setCanEdit(e.target.checked)}
                className="w-4 h-4 rounded accent-primary" />
              <span className="text-sm">Autoriser la modification</span>
              <span className="text-xs text-dark-muted ml-auto">
                {canEdit ? 'Lecture + écriture' : 'Lecture seule'}
              </span>
            </label>
          </div>
          <button className="btn-primary w-full justify-center" onClick={shareInternal} disabled={sharing}>
            {sharing ? <Spinner size="sm" /> : <><Share2 size={15} /> Partager le dossier</>}
          </button>
        </div>
      )}
    </Modal>
  )
}
