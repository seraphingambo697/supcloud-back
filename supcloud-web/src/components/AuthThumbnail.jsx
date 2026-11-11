import { useState, useEffect, useRef } from 'react'
import { filesApi } from '../api/files'
import { FileIcon } from './ui'

const cache = new Map()

export default function AuthThumbnail({ item, className }) {
    const [src, setSrc] = useState(cache.get(item.id) || null)
    const [failed, setFailed] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        if (src || failed) return
        let cancelled = false

        const load = () => {
            filesApi.downloadFile(item.id)
                .then(res => {
                    if (cancelled) return
                    const blob = new Blob([res.data], { type: item.mime_type || res.data.type })
                    const url = URL.createObjectURL(blob)
                    cache.set(item.id, url)
                    setSrc(url)
                })
                .catch(() => { if (!cancelled) setFailed(true) })
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                observer.disconnect()
                load()
            }
        }, { rootMargin: '200px' })

        if (ref.current) observer.observe(ref.current)
        return () => { cancelled = true; observer.disconnect() }
    }, [item.id, src, failed])

    if (failed) {
        return (
            <div className="flex justify-center py-3">
                <FileIcon file={item} size={48} />
            </div>
        )
    }

    return src ? (
        <img src={src} alt={item.name} className={className} />
    ) : (
        <div ref={ref} className={`${className} bg-dark-variant animate-pulse`} />
    )
}