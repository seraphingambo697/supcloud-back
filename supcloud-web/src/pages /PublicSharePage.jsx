
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Cloud, Download, Lock, FileArchive,
  Eye, EyeOff, AlertCircle, CheckCircle,
} from 'lucide-react'
import axios from 'axios'
import { formatBytes, fmtDate } from '../utils'
import { Spinner } from '../components/ui'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export default function PublicSharePage() {
  const { token } = useParams()

  const [step, setStep] = useState('loading')
  const [linkData, setLink] = useState(null)
  const [error, setError] = useState('')
  const [password, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [checking, setChecking] = useState(false)
  const [downloading, setDl] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { resolveLink(null) }, [token])

  const resolveLink = async (pwd) => {
    setChecking(true)
    setError('')
    try {
      const res = await axios.post(
        `${BASE_URL}/share/resolve/${token}`,
        { password: pwd || null },
        { headers: { 'Content-Type': 'application/json' } }
      )
      setLink(res.data)
      setStep('preview')
    } catch (err) {
      const status = err?.response?.status
      const detail = (err?.response?.data?.detail || '').toLowerCase()

      if (status === 401 || detail.includes('mot de passe') || detail.includes('password')) {
        if (pwd) setError('Mot de passe incorrect.')
        setStep('password')
      } else if (status === 410) {
        setError('Ce lien a expiré.')
        setStep('error')
      } else if (status === 404) {
        setError('Ce lien est invalide ou a été révoqué.')
        setStep('error')
      } else {
        setError(err?.response?.data?.detail || 'Une erreur est survenue.')
        setStep('error')
      }
    } finally {
      setChecking(false)
    }
  }

  const submitPassword = (e) => {
    e.preventDefault()
    if (!password.trim()) return
    resolveLink(password)
  }

  const handleDownload = async () => {
    if (!linkData) return
    setDl(true)
    setDone(false)
    try {
      const endpoint = linkData.is_folder
        ? `${BASE_URL}/share/${token}/zip`
        : `${BASE_URL}/share/${token}/download`

      const res = await axios.get(endpoint, { responseType: 'blob' })

      const fileName = linkData.is_folder
        ? `${linkData.file_item_name}.zip`
        : linkData.file_item_name

      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url; a.download = fileName
      document.body.appendChild(a); a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (err) {
      const msg = err?.response?.status === 401
        ? 'Accès refusé. Le lien est peut-être expiré.'
        : 'Erreur lors du téléchargement.'
      setError(msg)
    } finally {
      setDl(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
          <Cloud size={20} className="text-white" />
        </div>
        <span className="font-display font-bold text-xl">SUPFile</span>
      </div>

      <div className="w-full max-w-md">

        {/* Chargement */}
        {(step === 'loading' || (checking && step !== 'password')) && (
          <div className="card p-10 flex flex-col items-center gap-4">
            <Spinner size="lg" />
            <p className="text-dark-muted text-sm">Vérification du lien…</p>
          </div>
        )}

        {/* Mot de passe */}
        {step === 'password' && !checking && (
          <div className="card p-8 animate-slide-up">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-warning/15 flex items-center justify-center mb-4">
                <Lock size={28} className="text-warning" />
              </div>
              <h2 className="font-display font-semibold text-xl mb-1">Lien protégé</h2>
              <p className="text-dark-muted text-sm text-center">
                Ce lien est protégé par un mot de passe.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-xl p-3 mb-4 text-danger text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={submitPassword} className="space-y-4">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pl-9 pr-10"
                  placeholder="Mot de passe du lien"
                  value={password}
                  onChange={e => { setPwd(e.target.value); setError('') }}
                  autoFocus
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-muted hover:text-dark-text"
                  onClick={() => setShowPwd(s => !s)}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="submit"
                disabled={checking || !password.trim()}
                className="btn-primary w-full justify-center py-3"
              >
                {checking ? <Spinner size="sm" /> : 'Accéder au fichier'}
              </button>
            </form>
          </div>
        )}

        {/* Aperçu + téléchargement */}
        {step === 'preview' && linkData && !checking && (
          <div className="card p-8 animate-slide-up">
            <div className="flex flex-col items-center mb-6">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-4
                ${linkData.is_folder ? 'bg-warning/15' : 'bg-primary/15'}`}>
                {linkData.is_folder
                  ? <FileArchive size={40} className="text-warning" />
                  : <Download size={40} className="text-primary" />
                }
              </div>
              <h2 className="font-display font-semibold text-xl text-center break-all leading-snug">
                {linkData.file_item_name || 'Fichier partagé'}
              </h2>
              <p className="text-dark-muted text-sm mt-1">
                {linkData.is_folder ? 'Dossier — téléchargement ZIP' : 'Fichier partagé'}
              </p>
            </div>

            {/* Métadonnées */}
            <div className="bg-dark-variant rounded-xl p-4 mb-6 space-y-2.5">
              <MetaRow label="Partagé le" value={fmtDate(linkData.created_at)} />
              {linkData.expires_at && (
                <MetaRow
                  label="Expire le"
                  value={fmtDate(linkData.expires_at)}
                  danger={linkData.is_expired}
                />
              )}
              <MetaRow label="Téléchargements" value={String(linkData.download_count ?? 0)} />
              {linkData.has_password && (
                <MetaRow label="Protection" value="Mot de passe ✓" />
              )}
            </div>

            {/* Erreur téléchargement */}
            {error && (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-xl p-3 mb-4 text-danger text-sm">
                <AlertCircle size={15} className="flex-shrink-0" />
                {error}
              </div>
            )}

            {linkData.is_expired ? (
              <div className="flex items-center gap-2 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
                <AlertCircle size={16} />
                Ce lien a expiré et ne peut plus être utilisé.
              </div>
            ) : done ? (
              <div className="flex items-center justify-center gap-2 bg-accent/10 border border-accent/20 rounded-xl p-4 text-accent text-sm">
                <CheckCircle size={18} />
                Téléchargement lancé !
              </div>
            ) : (
              <button
                className="btn-primary w-full justify-center py-3 text-base"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading
                  ? <><Spinner size="sm" /> Téléchargement en cours…</>
                  : <><Download size={18} />
                    {linkData.is_folder ? 'Télécharger (ZIP)' : 'Télécharger'}
                  </>
                }
              </button>
            )}

            <p className="text-dark-muted text-xs text-center mt-5">
              Partagé via{' '}
              <a href="/" className="text-primary hover:underline">SUPFile</a>
              {' '}— Créez votre espace gratuit de 30 Go
            </p>
          </div>
        )}

        {/* Erreur */}
        {step === 'error' && !checking && (
          <div className="card p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center">
              <AlertCircle size={32} className="text-danger" />
            </div>
            <h2 className="font-semibold text-xl">Lien invalide</h2>
            <p className="text-dark-muted text-sm text-center max-w-xs">{error}</p>
            <a href="/" className="btn-secondary">Retour à l'accueil</a>
          </div>
        )}
      </div>
    </div>
  )
}

function MetaRow({ label, value, danger }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-dark-muted">{label}</span>
      <span className={danger ? 'text-danger font-medium' : 'font-medium'}>{value}</span>
    </div>
  )
}