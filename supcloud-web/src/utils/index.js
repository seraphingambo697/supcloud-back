
import { formatDistanceToNow, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind class merge 
export const cn = (...inputs) => twMerge(clsx(inputs))

// Formatage taille 
export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// emps relatif 
export const timeAgo = (date) => {
  if (!date) return ''
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })
  } catch {
    return ''
  }
}

export const fmtDate = (date) => {
  if (!date) return ''
  try { return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr }) }
  catch { return '' }
}

// Catégories 
export const CATEGORIES = {
  image: { label: 'Images', color: '#30D158', bg: 'rgba(48,209,88,0.12)' },
  video: { label: 'Vidéos', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
  audio: { label: 'Audio', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)' },
  document: { label: 'Documents', color: '#FF375F', bg: 'rgba(255,55,95,0.12)' },
  text: { label: 'Textes', color: '#64D2FF', bg: 'rgba(100,210,255,0.12)' },
  archive: { label: 'Archives', color: '#BF5AF2', bg: 'rgba(191,90,242,0.12)' },
  other: { label: 'Autres', color: '#8E8E93', bg: 'rgba(142,142,147,0.12)' },
}

export const categoryName = (cat) => CATEGORIES[cat]?.label ?? 'Fichier'

// Type de fichier 
export const isImage = (f) => f?.category === 'image'
export const isVideo = (f) => f?.category === 'video'
export const isAudio = (f) => f?.category === 'audio'
export const isPdf = (f) => f?.extension?.toLowerCase() === 'pdf'
export const isText = (f) => f?.category === 'text'
export const isFolder = (f) => f?.item_type === 'folder'

//Téléchargement blob
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Copier dans le presse-papier
export const copyToClipboard = async (text) => {
  try { await navigator.clipboard.writeText(text); return true }
  catch { return false }
}

// Extension depuis nom 
export const getExtension = (name = '') => {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

// MIME → catégorie 
export const mimeToCategory = (mime = '') => {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('text/')) return 'text'
  if (mime.includes('pdf') || mime.includes('word') || mime.includes('sheet') || mime.includes('presentation')) return 'document'
  if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) return 'archive'
  return 'other'
}
