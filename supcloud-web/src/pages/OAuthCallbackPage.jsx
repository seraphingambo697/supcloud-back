import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function OAuthCallbackPage() {
    const navigate = useNavigate()

    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.slice(1))
        const token = params.get('token')

        window.history.replaceState(null, '', '/oauth/callback')

        if (!token) {
            navigate('/login?error=google', { replace: true })
            return
        }

        localStorage.setItem('supcloud_token', token)

        window.location.replace('/')
    }, [navigate])

    return <p className="p-6 text-dark-muted">Connexion en cours…</p>
}