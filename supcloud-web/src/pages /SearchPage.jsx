import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, X } from 'lucide-react'
import { filesApi } from '../api/files'
import { formatBytes, timeAgo, categoryName, CATEGORIES } from '../utils'
import { FileIcon, EmptyState, Spinner } from '../components/ui'
import PreviewModal from '../components/preview/PreviewModal'

const CATS = [
  { value: null, label: 'Tout' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Vidéos' },
  { value: 'document', label: 'Documents' },
  { value: 'audio', label: 'Audio' },
  { value: 'text', label: 'Textes' },
  { value: 'archive', label: 'Archives' },
]

const DATE_FILTERS = [
  { label: 'Toutes dates', value: null },
  { label: 'Cette semaine', value: 7 },
  { label: 'Ce mois', value: 30 },
  { label: 'Ces 3 mois', value: 90 },
  { label: 'Cette année', value: 365 },
]

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [category, setCat] = useState(null)
  const [days, setDays] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [preview, setPreview] = useState(null)

  const search = useCallback(async (q = query) => {
    if (!q.trim()) return
    setLoading(true)
    setSearched(true)
    try {
      const after = days ? new Date(Date.now() - days * 86400000) : null
      const res = await filesApi.search(q, category, after)
      setResults(res.data)
    } catch { setResults([]) }
    finally { setLoading(false) }
  }, [query, category, days])

  const catColor = (cat) => CATEGORIES[cat]?.color || '#8E8E93'

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="font-display font-bold text-3xl mb-6">Recherche</h1>

      {/* Barre de recherche */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
        <input
          className="input pl-11 pr-10 py-4 text-base"
          placeholder="Nom de fichier, extension, type…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search()}
          autoFocus
        />
        {query && (
          <button className="absolute right-3 top-1/2 -translate-y-1/2 btn-icon" onClick={() => { setQuery(''); setResults([]); setSearched(false) }}>
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Catégorie */}
        {CATS.map(c => (
          <button
            key={c.value ?? 'all'}
            onClick={() => { setCat(c.value); search() }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
              ${category === c.value
                ? 'bg-primary/15 text-primary border-primary/30'
                : 'bg-dark-variant text-dark-muted border-transparent hover:text-dark-text'
              }`}
          >
            {c.label}
          </button>
        ))}
        <div className="w-px bg-dark-border mx-1" />
        {/* Date */}
        {DATE_FILTERS.map(d => (
          <button
            key={d.value ?? 'all'}
            onClick={() => { setDays(d.value); search() }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border
              ${days === d.value
                ? 'bg-warning/15 text-warning border-warning/30'
                : 'bg-dark-variant text-dark-muted border-transparent hover:text-dark-text'
              }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Bouton rechercher */}
      <button className="btn-primary mb-8" onClick={() => search()}>
        <Search size={15} /> Rechercher
      </button>

      {/* Résultats */}
      {loading ? (
        <div className="flex justify-center pt-12"><Spinner size="lg" /></div>
      ) : !searched ? (
        <EmptyState icon={Search} title="Recherchez dans vos fichiers" subtitle="Tapez un nom, une extension, et filtrez par type ou date" />
      ) : results.length === 0 ? (
        <EmptyState icon={Search} title="Aucun résultat" subtitle={`Aucun fichier correspondant à "${query}"`} />
      ) : (
        <div>
          <p className="text-sm text-dark-muted mb-4">{results.length} résultat{results.length > 1 ? 's' : ''} pour « {query} »</p>
          <div className="space-y-2">
            {results.map((file) => (
              <div
                key={file.id}
                onClick={() => setPreview(file)}
                className="flex items-center gap-4 p-4 card hover:bg-dark-variant/60 cursor-pointer transition-colors group animate-slide-up"
              >
                <FileIcon file={file} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{file.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${catColor(file.category)}22`, color: catColor(file.category) }}>
                      {categoryName(file.category)}
                    </span>
                    {file.size_bytes && <span className="text-xs text-dark-muted">{formatBytes(file.size_bytes)}</span>}
                    <span className="text-xs text-dark-muted">{timeAgo(file.modified_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {preview && <PreviewModal file={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}
