// Gestionnaire de fichiers complet :
import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
  FolderPlus, Upload, Grid, List, ChevronRight, Home,
  MoreVertical, Download, Share2, Pencil, Trash2, FolderInput,
  X, CheckSquare, Square, FileArchive, RefreshCw, Eye,
} from 'lucide-react'
import { filesApi } from '../api/files'
import { sharesApi } from '../api/shares'
import { formatBytes, timeAgo, downloadBlob, isFolder, categoryName } from '../utils'
import { FileIcon, Modal, ConfirmDialog, EmptyState, Spinner } from '../components/ui'
import PreviewModal from '../components/preview/PreviewModal'
import ShareModal from '../components/share/ShareModal'
import toast from 'react-hot-toast'

export default function FilesPage() {
  const location = useLocation()

  const [folderId, setFolderId] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'Mon Drive' }])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState(new Set())
  const [viewMode, setViewMode] = useState('grid')

  const [previewFile, setPreviewFile] = useState(null)
  const [shareFile, setShareFile] = useState(null)
  const [renameItem, setRenameItem] = useState(null)
  const [newName, setNewName] = useState('')
  const [confirmTrash, setConfirmTrash] = useState(false)
  const [folderModal, setFolderModal] = useState(false)
  const [newFolder, setNewFolder] = useState('')
  const [contextMenu, setContextMenu] = useState(null)

  const [uploads, setUploads] = useState([])

  const load = useCallback(async (id) => {
    setLoading(true)
    setSelected(new Set())
    try {
      const [itemsRes, crumbRes] = await Promise.all([
        filesApi.list(id),
        filesApi.breadcrumb(id),
      ])
      const sorted = [...itemsRes.data].sort((a, b) => {
        if (a.item_type === 'folder' && b.item_type !== 'folder') return -1
        if (a.item_type !== 'folder' && b.item_type === 'folder') return 1
        return a.name.localeCompare(b.name)
      })
      setItems(sorted)
      setBreadcrumbs(crumbRes.data)
    } catch {
      toast.error('Impossible de charger le dossier')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(folderId) }, [folderId, load])

  useEffect(() => {
    if (location.state?.openFile) setPreviewFile(location.state.openFile)
  }, [location.state])

  const onDrop = useCallback(async (files) => {
    for (const file of files) {
      const id = Date.now() + Math.random()
      setUploads(p => [...p, { id, name: file.name, progress: 0 }])
      try {
        await filesApi.upload(file, folderId, (pct) => {
          setUploads(p => p.map(u => u.id === id ? { ...u, progress: pct } : u))
        })
        setUploads(p => p.filter(u => u.id !== id))
        toast.success(`"${file.name}" uploadé`)
        load(folderId)
      } catch (err) {
        setUploads(p => p.filter(u => u.id !== id))
        toast.error(`Erreur upload : ${file.name}`)
      }
    }
  }, [folderId, load])

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop, noClick: true, noKeyboard: true,
  })

  const toggleSelect = (id) => {
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  const selectAll = () => setSelected(new Set(items.map(i => i.id)))
  const clearSel = () => setSelected(new Set())

  const createFolder = async () => {
    if (!newFolder.trim()) return
    try {
      await filesApi.createFolder(newFolder.trim(), folderId)
      toast.success('Dossier créé')
      setFolderModal(false)
      setNewFolder('')
      load(folderId)
    } catch { toast.error('Erreur création dossier') }
  }

  const rename = async () => {
    if (!newName.trim() || newName === renameItem?.name) { setRenameItem(null); return }
    try {
      await filesApi.rename(renameItem.id, newName.trim())
      toast.success('Renommé')
      setRenameItem(null)
      load(folderId)
    } catch { toast.error('Erreur renommage') }
  }

  const trashSelected = async () => {
    const ids = [...selected]
    try {
      await filesApi.trash(ids)
      toast.success(`${ids.length} élément${ids.length > 1 ? 's' : ''} mis à la corbeille`)
      clearSel()
      load(folderId)
    } catch { toast.error('Erreur') }
  }

  const downloadFile = async (item) => {
    try {
      const fn = isFolder(item) ? filesApi.downloadZip : filesApi.downloadFile
      const res = await fn(item.id)
      const name = isFolder(item) ? `${item.name}.zip` : item.name
      downloadBlob(res.data, name)
      toast.success(`Téléchargement de "${name}"`)
    } catch { toast.error('Erreur téléchargement') }
  }

  const openContextMenu = (e, item) => {
    e.preventDefault()
    setContextMenu({ item, x: e.clientX, y: e.clientY })
  }

  useEffect(() => {
    const close = () => setContextMenu(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleItemClick = (item) => {
    if (selected.size > 0) { toggleSelect(item.id); return }
    if (isFolder(item)) { setFolderId(item.id) }
    else { setPreviewFile(item) }
  }

  return (
    <div className="h-full flex flex-col" {...getRootProps()}>
      <input {...getInputProps()} />

      {/* Overlay drag */}
      {isDragActive && (
        <div className="fixed inset-0 z-50 bg-primary/20 border-4 border-dashed border-primary flex items-center justify-center pointer-events-none">
          <div className="bg-dark-surface rounded-3xl p-8 flex flex-col items-center gap-3">
            <Upload size={40} className="text-primary" />
            <p className="font-semibold text-lg">Déposez pour uploader</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="px-8 py-5 border-b border-dark-border flex items-center gap-3 bg-dark-bg/80 backdrop-blur sticky top-0 z-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {breadcrumbs.map((crumb, i) => {
            const isLast = i === breadcrumbs.length - 1
            return (
              <div key={crumb.id ?? 'root'} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={14} className="text-dark-muted flex-shrink-0" />}
                {i === 0 && <Home size={14} className="text-dark-muted flex-shrink-0" />}
                <button
                  onClick={() => !isLast && setFolderId(crumb.id)}
                  className={`text-sm truncate max-w-32 ${isLast ? 'text-dark-text font-semibold' : 'text-primary hover:underline'}`}
                >
                  {crumb.name}
                </button>
              </div>
            )
          })}
        </div>

        {/* Actions sélection */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-dark-muted">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
            <button className="btn-danger py-1.5 px-3 text-xs" onClick={() => setConfirmTrash(true)}>
              <Trash2 size={14} /> Corbeille
            </button>
            <button className="btn-icon" onClick={clearSel}><X size={16} /></button>
          </div>
        )}

        {/* Actions globales */}
        <button className="btn-secondary py-2 px-3 text-xs" onClick={() => setFolderModal(true)}>
          <FolderPlus size={15} /> Nouveau dossier
        </button>
        <button className="btn-primary py-2 px-3 text-xs" onClick={openPicker}>
          <Upload size={15} /> Uploader
        </button>
        <button className="btn-icon" onClick={() => load(folderId)}><RefreshCw size={16} /></button>
        <button className="btn-icon" onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}>
          {viewMode === 'grid' ? <List size={16} /> : <Grid size={16} />}
        </button>
        {items.length > 0 && (
          <button className="btn-icon" onClick={selected.size === items.length ? clearSel : selectAll}>
            {selected.size === items.length ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
          </button>
        )}
      </div>

      {/* Barre progression upload */}
      {uploads.length > 0 && (
        <div className="px-8 py-3 bg-dark-surface border-b border-dark-border space-y-2">
          {uploads.map(u => (
            <div key={u.id} className="flex items-center gap-3">
              <Upload size={14} className="text-primary flex-shrink-0" />
              <span className="text-xs flex-1 truncate">{u.name}</span>
              <div className="w-32 h-1.5 bg-dark-variant rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${u.progress}%` }} />
              </div>
              <span className="text-xs text-dark-muted w-8 text-right">{u.progress}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-8">
        {loading ? (
          <div className="flex justify-center pt-20"><Spinner size="lg" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Upload}
            title="Ce dossier est vide"
            subtitle="Glissez des fichiers ici ou utilisez le bouton Uploader"
            action="Uploader des fichiers"
            onAction={openPicker}
          />
        ) : viewMode === 'grid' ? (
          <GridView items={items} selected={selected} onToggle={toggleSelect} onClick={handleItemClick} onContext={openContextMenu} />
        ) : (
          <ListView items={items} selected={selected} onToggle={toggleSelect} onClick={handleItemClick} onContext={openContextMenu} />
        )}
      </div>

      {/* Menu contextuel */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-dark-surface border border-dark-border rounded-2xl shadow-2xl py-1.5 min-w-44 animate-fade-in"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          {!isFolder(contextMenu.item) && (
            <MenuItem icon={Eye} label="Aperçu" onClick={() => { setPreviewFile(contextMenu.item); setContextMenu(null) }} />
          )}
          <MenuItem icon={Download} label={isFolder(contextMenu.item) ? 'Télécharger ZIP' : 'Télécharger'} onClick={() => { downloadFile(contextMenu.item); setContextMenu(null) }} />
          <MenuItem icon={Share2} label="Partager" onClick={() => { setShareFile(contextMenu.item); setContextMenu(null) }} />
          <MenuItem icon={Pencil} label="Renommer" onClick={() => { setRenameItem(contextMenu.item); setNewName(contextMenu.item.name); setContextMenu(null) }} />
          <div className="border-t border-dark-border my-1" />
          <MenuItem icon={Trash2} label="Corbeille" danger onClick={() => { setSelected(new Set([contextMenu.item.id])); setConfirmTrash(true); setContextMenu(null) }} />
        </div>
      )}

      {/* Modales */}
      <Modal open={folderModal} onClose={() => setFolderModal(false)} title="Nouveau dossier" size="sm">
        <input
          className="input mb-4" placeholder="Nom du dossier" autoFocus
          value={newFolder} onChange={e => setNewFolder(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && createFolder()}
        />
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setFolderModal(false)}>Annuler</button>
          <button className="btn-primary" onClick={createFolder}>Créer</button>
        </div>
      </Modal>

      <Modal open={!!renameItem} onClose={() => setRenameItem(null)} title="Renommer" size="sm">
        <input
          className="input mb-4" autoFocus
          value={newName} onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && rename()}
        />
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={() => setRenameItem(null)}>Annuler</button>
          <button className="btn-primary" onClick={rename}>Renommer</button>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmTrash} onClose={() => setConfirmTrash(false)}
        title="Mettre à la corbeille"
        message={`Envoyer ${selected.size} élément${selected.size > 1 ? 's' : ''} à la corbeille ?`}
        confirmLabel="Corbeille" danger
        onConfirm={trashSelected}
      />

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
      {shareFile && <ShareModal file={shareFile} onClose={() => setShareFile(null)} />}
    </div>
  )
}

function GridView({ items, selected, onToggle, onClick, onContext }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {items.map((item, i) => {
        const isSel = selected.has(item.id)
        return (
          <div
            key={item.id}
            className={`card p-3 cursor-pointer transition-all hover:bg-dark-variant/60 active:scale-95 select-none
              ${isSel ? 'ring-2 ring-primary bg-primary/10' : ''}
            `}
            style={{ animationDelay: `${i * 30}ms` }}
            onClick={() => onClick(item)}
            onContextMenu={e => onContext(e, item)}
          >
            {/* Thumbnail ou icône */}
            <div className="relative mb-2">
              {item.category === 'image' && item.thumbnail_url ? (
                <img src={item.thumbnail_url} alt={item.name} className="w-full h-24 object-cover rounded-xl" />
              ) : (
                <div className="flex justify-center py-3">
                  <FileIcon file={item} size={48} />
                </div>
              )}
              {/* Coche sélection */}
              <button
                className="absolute top-1 left-1 w-5 h-5 rounded-full border-2 border-white/50 transition-opacity"
                onClick={e => { e.stopPropagation(); onToggle(item.id) }}
              >
                {isSel && <div className="w-full h-full rounded-full bg-primary flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>}
              </button>
            </div>
            <p className="text-xs font-medium truncate">{item.name}</p>
            <p className="text-xs text-dark-muted mt-0.5">
              {item.item_type === 'folder' ? 'Dossier' : formatBytes(item.size_bytes)}
            </p>
          </div>
        )
      })}
    </div>
  )
}

function ListView({ items, selected, onToggle, onClick, onContext }) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-dark-muted font-medium">
        <div className="col-span-6">Nom</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">Taille</div>
        <div className="col-span-2">Modifié</div>
      </div>
      {items.map((item, i) => {
        const isSel = selected.has(item.id)
        return (
          <div
            key={item.id}
            className={`grid grid-cols-12 gap-4 items-center px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-dark-variant select-none
              ${isSel ? 'bg-primary/10 ring-1 ring-primary' : ''}
            `}
            onClick={() => onClick(item)}
            onContextMenu={e => onContext(e, item)}
          >
            <div className="col-span-6 flex items-center gap-3 min-w-0">
              <button
                className="w-4 h-4 rounded border border-dark-border flex-shrink-0"
                onClick={e => { e.stopPropagation(); onToggle(item.id) }}
              >
                {isSel && <div className="w-full h-full bg-primary rounded flex items-center justify-center">
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l2 2 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
                </div>}
              </button>
              <FileIcon file={item} size={32} />
              <span className="text-sm font-medium truncate">{item.name}</span>
            </div>
            <div className="col-span-2 text-xs text-dark-muted">{categoryName(item.category)}</div>
            <div className="col-span-2 text-xs text-dark-muted">{item.size_bytes ? formatBytes(item.size_bytes) : '—'}</div>
            <div className="col-span-2 text-xs text-dark-muted">{timeAgo(item.modified_at)}</div>
          </div>
        )
      })}
    </div>
  )
}

function MenuItem({ icon: Icon, label, danger, onClick }) {
  return (
    <button
      className={`flex items-center gap-3 w-full px-4 py-2 text-sm transition-colors ${danger ? 'text-danger hover:bg-danger/10' : 'text-dark-text hover:bg-dark-variant'}`}
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  )
}
