import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)
const KEY = 'supcloud_theme'

const resolve = (mode) =>
    mode === 'auto'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : mode

export function ThemeProvider({ children }) {

    const [mode, setMode] = useState(() => localStorage.getItem(KEY) || 'dark')

    useEffect(() => {
        const apply = () => {
            document.documentElement.setAttribute('data-theme', resolve(mode))
        }
        apply()
        localStorage.setItem(KEY, mode)

        if (mode !== 'auto') return
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        mq.addEventListener('change', apply)
        return () => mq.removeEventListener('change', apply)
    }, [mode])

    return (
        <ThemeContext.Provider value={{ mode, setMode, theme: resolve(mode) }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)