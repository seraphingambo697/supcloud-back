// Contexte global d'authentification.
// Stocke l'utilisateur courant et expose login/logout/register.

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'
import { getErrorMessage } from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        const token = localStorage.getItem('supfile_token')
        if (!token) { setLoading(false); return }
        authApi.me()
            .then((res) => setUser(res.data))
            .catch(() => localStorage.removeItem('supfile_token'))
            .finally(() => setLoading(false))
    }, [])

    const login = useCallback(async (email, password) => {
        const res = await authApi.login(email, password)
        localStorage.setItem('supfile_token', res.data.access_token)
        setUser(res.data.user)
        return res.data.user
    }, [])

    const register = useCallback(async (name, email, password) => {
        const res = await authApi.register(name, email, password)
        localStorage.setItem('supfile_token', res.data.access_token)
        setUser(res.data.user)
        return res.data.user
    }, [])

    const logout = useCallback(() => {
        localStorage.removeItem('supfile_token')
        setUser(null)
    }, [])

    const updateUser = useCallback((partial) => {
        setUser((u) => ({ ...u, ...partial }))
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}