
// Injecte automatiquement le JWT sur chaque requête.
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
})



// Add Authorization 
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supcloud_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// reponse interceptor to handle 401 errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('supcloud_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Helpers 

/** Extrait le message d'erreur du backend */
export const getErrorMessage = (err) =>
  err?.response?.data?.detail || err?.message || 'Une erreur est survenue'

/** Retourne l'URL de streaming/download d'un fichier */
export const fileUrl = (id) => `${BASE_URL}/files/${id}/download`
export const streamUrl = (id) => `${BASE_URL}/files/${id}/stream`
export const thumbUrl = (id) => `${BASE_URL}/files/${id}/thumbnail`
