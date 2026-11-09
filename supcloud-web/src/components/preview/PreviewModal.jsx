// Visionneuse universelle intégrée dans une modal.
// Affiche : images, vidéos (streaming), audio, PDF (iframe), texte, Office téléchargement.

import { useState, useEffect } from 'react'
import { X, Download, Share2, Info, ZoomIn, ZoomOut, RotateCw } from 'lucide-react'
import { filesApi } from '../../api/files'
import { fileUrl, streamUrl } from '../../api/client'
import { formatBytes, fmtDate, categoryName, downloadBlob, isImage, isVideo, isAudio, isPdf, isText } from '../../utils'
import { FileIcon, Spinner } from '../ui'
import toast from 'react-hot-toast'

export default function PreviewModal({ file, onClose }) {
  const [textContent, setTextContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [imgZoom, setImgZoom] = useState(1)

  // Charge le contenu texte si nécessaire
  useEffect(() => {
    if (isText(file)) {
      setLoading(true)
      filesApi.downloadText(file.id)
        .then(res => setTextContent(res.data))
        .catch(() => toast.error('Impossible de charger le fichier'))
        .finally(() => setLoading(false))
    }
  }, [file])

  // Fermer avec Escape
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const handleDownload = async () => {
    try {
      const res = await filesApi.downloadFile(file.id)
      downloadBlob(res.data, file.name)
      toast.success(`"${file.name}" téléchargé`)
    } catch { toast.error('Erreur téléchargement') }
  }

  const token = localStorage.getItem('supcloud_token')

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur animate-fade-in">
      {/* Barre de titre */}
      <div className="flex items-center gap-3 px-6 py-4 bg-dark-surface/80 border-b border-dark-border flex-shrink-0">
        <FileIcon file={file} size={32} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{file.name}</p>
          <p className="text-xs text-dark-muted">
            {file.size_bytes ? formatBytes(file.size_bytes) : ''} · {categoryName(file.category)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isImage(file) && (
            <>
              <button className="btn-icon" onClick={() => setImgZoom(z => Math.max(0.25, z - 0.25))}><ZoomOut size={16} /></button>
              <span className="text-xs text-dark-muted w-10 text-center">{Math.round(imgZoom * 100)}%</span>
              <button className="btn-icon" onClick={() => setImgZoom(z => Math.min(4, z + 0.25))}><ZoomIn size={16} /></button>
              <button className="btn-icon" onClick={() => setImgZoom(1)}><RotateCw size={16} /></button>
            </>
          )}
          <button className="btn-icon" onClick={() => setShowInfo(s => !s)}><Info size={16} /></button>
          <button className="btn-icon" onClick={handleDownload}><Download size={16} /></button>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Zone de contenu */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-black/30">
          {loading ? (
            <Spinner size="lg" />
          ) : isImage(file) ? (
            <div className="overflow-auto w-full h-full flex items-center justify-center p-4">
              <img
                src={`${fileUrl(file.id)}${token ? `?token=${token}` : ''}`}
                alt={file.name}
                style={{ transform: `scale(${imgZoom})`, transformOrigin: 'center', transition: 'transform 0.2s', maxWidth: '100%', maxHeight: '100%' }}
                className="rounded-lg shadow-2xl object-contain"
                onError={e => { e.target.src = file.thumbnail_url || '' }}
              />
            </div>
          ) : isVideo(file) ? (
            <video
              src={streamUrl(file.id)}
              controls autoPlay
              className="max-w-full max-h-full"
              style={{ outline: 'none' }}
            >
              Votre navigateur ne supporte pas la lecture vidéo.
            </video>
          ) : isAudio(file) ? (
            <div className="flex flex-col items-center gap-6 p-8">
              <div className="w-32 h-32 rounded-3xl bg-warning/15 flex items-center justify-center">
                <FileIcon file={file} size={64} />
              </div>
              <p className="font-semibold text-lg text-center">{file.name}</p>
              {file.size_bytes && <p className="text-dark-muted text-sm">{formatBytes(file.size_bytes)}</p>}
              <audio
                src={streamUrl(file.id)}
                controls autoPlay
                className="w-80"
              >
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            </div>
          ) : isPdf(file) ? (
            <iframe
              src={`${fileUrl(file.id)}#toolbar=1`}
              title={file.name}
              className="w-full h-full border-0"
            />
          ) : isText(file) ? (
            <div className="w-full h-full overflow-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-dark-bg/90 pb-3 backdrop-blur">
                  <span className="text-xs text-dark-muted font-mono">{file.name}</span>
                  <button
                    className="btn-ghost text-xs"
                    onClick={() => { navigator.clipboard.writeText(textContent || ''); toast.success('Copié !') }}
                  >
                    Copier
                  </button>
                </div>
                <pre className="text-sm font-mono text-dark-text whitespace-pre-wrap break-all leading-relaxed">
                  {textContent}
                </pre>
              </div>
            </div>
          ) : (
            /* Fichier non prévisualisable */
            <div className="flex flex-col items-center gap-6 p-8 text-center">
              <div className="w-24 h-24 rounded-3xl bg-dark-variant flex items-center justify-center">
                <FileIcon file={file} size={52} />
              </div>
              <div>
                <p className="font-semibold text-lg mb-2">{file.name}</p>
                <p className="text-dark-muted text-sm mb-6">
                  Prévisualisation non disponible pour ce type de fichier.<br />
                  Téléchargez-le pour l'ouvrir avec votre application.
                </p>
                <button className="btn-primary" onClick={handleDownload}>
                  <Download size={16} /> Télécharger
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Panneau info */}
        {showInfo && (
          <div className="w-72 bg-dark-surface border-l border-dark-border overflow-y-auto flex-shrink-0 animate-slide-up p-5">
            <h3 className="font-semibold mb-4">Informations</h3>
            <div className="space-y-3">
              {[
                ['Nom', file.name],
                ['Type MIME', file.mime_type || '—'],
                ['Catégorie', categoryName(file.category)],
                ['Taille', file.size_bytes ? formatBytes(file.size_bytes) : '—'],
                ['Créé le', fmtDate(file.created_at)],
                ['Modifié le', fmtDate(file.modified_at)],
                ['ID', file.id],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-xs text-dark-muted mb-0.5">{l}</p>
                  <p className="text-sm break-all font-mono">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
