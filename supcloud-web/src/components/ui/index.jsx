// Composants UI réutilisables : Modal, Spinner, Badge, EmptyState, ConfirmDialog

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn, CATEGORIES, categoryName } from '../../utils'

// Spinner 
export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={cn('animate-spin rounded-full border-2 border-dark-variant border-t-primary', s, className)} />
  )
}

// Modal 
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl', full: 'max-w-5xl' }

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className={cn('bg-dark-surface rounded-3xl border border-dark-border w-full animate-slide-up', widths[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="font-display font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

//Confirm Dialog 
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmer', danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-dark-muted text-sm mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Annuler</button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

//Empty State
export function EmptyState({ icon: Icon, title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-dark-variant flex items-center justify-center mb-4">
        <Icon size={36} className="text-dark-muted" />
      </div>
      <h3 className="font-semibold text-dark-text mb-2">{title}</h3>
      {subtitle && <p className="text-dark-muted text-sm mb-6 max-w-xs">{subtitle}</p>}
      {action && (
        <button className="btn-primary" onClick={onAction}>{action}</button>
      )}
    </div>
  )
}

// File Icon 
export function FileIcon({ file, size = 40 }) {
  const isFolder = file?.item_type === 'folder'
  const cat = file?.category || 'other'
  const cfg = isFolder ? { color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' } : (CATEGORIES[cat] || CATEGORIES.other)
  const s = `${size}px`

  const Icon = isFolder ? FolderIcon : getCategoryIcon(cat)

  return (
    <div
      style={{ width: s, height: s, background: cfg.bg, borderRadius: size * 0.25, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
    >
      <Icon size={size * 0.52} style={{ color: cfg.color }} />
    </div>
  )
}

function FolderIcon({ size, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={style}>
      <path d="M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z" />
    </svg>
  )
}

function getCategoryIcon(cat) {
  const icons = {
    image: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
    video: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><path d="m15 10 4.553-2.069A1 1 0 0 1 21 8.87v6.26a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z" /></svg>,
    audio: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
    document: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></svg>,
    text: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>,
    archive: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><rect x="2" y="3" width="20" height="5" rx="1" /><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></svg>,
    other: ({ size, style }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={style}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  }
  return icons[cat] || icons.other
}

// Progress Bar 
export function ProgressBar({ value, max, color = 'bg-primary', className }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const warn = pct > 80
  return (
    <div className={cn('w-full h-2 bg-dark-variant rounded-full overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700', warn ? 'bg-danger' : color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// Badge 
export function Badge({ children, color = 'bg-dark-variant text-dark-muted' }) {
  return <span className={cn('badge', color)}>{children}</span>
}

//Tooltip wrapper
export function Tooltip({ children, text }) {
  return (
    <div className="relative group inline-flex">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-dark-variant rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        {text}
      </span>
    </div>
  )
}
