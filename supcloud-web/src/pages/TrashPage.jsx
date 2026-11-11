import { useState, useEffect } from 'react'
import { Trash2, RotateCcw, AlertTriangle } from 'lucide-react'
import { filesApi } from '../api/files'
import { formatBytes, timeAgo } from '../utils'
import { FileIcon, EmptyState, ConfirmDialog, Spinner } from '../components/ui'
import toast from 'react-hot-toast'

export default function TrashPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirmEmpty, setConfirmEmpty] = useState(false)
  const [restoring, setRestoring] = useState(new Set())
  const [deleting, setDeleting] = useState(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const r = await filesApi.listTrash()
      setItems(r.data)
    } catch (err) {
      console.error(err)
      toast.error('Erreur chargement corbeille')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const restore = async (id) => {
    setRestoring(s => new Set([...s, id]))
    try {
      await filesApi.restore([id])
      setItems(p => p.filter(i => i.id !== id))
      toast.success('Élément restauré')
    } catch {
      toast.error('Erreur restauration')
    } finally {
      setRestoring(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  const deletePerm = async (id) => {
    setDeleting(s => new Set([...s, id]))
    try {
      await filesApi.delete([id])
      setItems(p => p.filter(i => i.id !== id))
      toast.success('Supprimé définitivement')
    } catch {
      toast.error('Erreur suppression')
    } finally {
      setDeleting(s => { const n = new Set(s); n.delete(id); return n })
    }
  }

  const emptyTrash = async () => {
    if (items.length === 0) return
    try {
      await filesApi.delete(items.map(i => i.id))
      setItems([])
      toast.success('Corbeille vidée')
    } catch {
      toast.error('Erreur vidage corbeille')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl">Corbeille</h1>
          <p className="text-dark-muted text-sm mt-1">
            {loading ? '…' : `${items.length} élément${items.length > 1 ? 's' : ''}`}
          </p>
        </div>
        {!loading && items.length > 0 && (
          <button className="btn-danger" onClick={() => setConfirmEmpty(true)}>
            <Trash2 size={15} /> Vider la corbeille
          </button>
        )}
      </div>

      {/* Bandeau info */}
      {!loading && items.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-warning/10 border border-warning/20 rounded-xl mb-6 text-sm">
          <AlertTriangle size={18} className="text-warning flex-shrink-0 mt-0.5" />
          <span className="text-warning">
            Glissez un élément pour le restaurer ou le supprimer définitivement.
            La suppression est <strong>irréversible</strong>.
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-12"><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Trash2}
          title="Corbeille vide"
          subtitle="Les fichiers que vous supprimez apparaissent ici avant suppression définitive."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.id}
              className="card flex items-center gap-4 p-4 hover:bg-dark-variant/40 transition-colors"
            >
              <div className="opacity-60 flex-shrink-0">
                <FileIcon file={item} size={40} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate text-dark-muted line-through">
                  {item.name}
                </p>
                <p className="text-xs text-dark-muted mt-0.5">
                  {item.size_bytes ? formatBytes(item.size_bytes) : 'Dossier'}
                  {item.trashed_at && ` · Supprimé ${timeAgo(item.trashed_at)}`}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="btn-secondary text-xs py-1.5 px-3"
                  onClick={() => restore(item.id)}
                  disabled={restoring.has(item.id)}
                >
                  {restoring.has(item.id)
                    ? <Spinner size="sm" />
                    : <><RotateCcw size={13} /> Restaurer</>}
                </button>
                <button
                  className="btn-danger text-xs py-1.5 px-3"
                  onClick={() => deletePerm(item.id)}
                  disabled={deleting.has(item.id)}
                >
                  {deleting.has(item.id)
                    ? <Spinner size="sm" />
                    : <><Trash2 size={13} /> Supprimer</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Vider la corbeille"
        message={`Supprimer définitivement ${items.length} élément${items.length > 1 ? 's' : ''} ? Cette action est irréversible.`}
        confirmLabel="Vider définitivement"
        danger
        onConfirm={emptyTrash}
      />
    </div>
  )
}
