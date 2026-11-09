import { api } from './client'

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (name, email, password) => api.post('/auth/register', { name, email, password }),
  me: () => api.get('/auth/me'),
  update: (data) => api.patch('/auth/me', data),
  password: (current, next) => api.post('/auth/me/password', { current_password: current, new_password: next }),
  oauthUrl: (provider) => `${import.meta.env.VITE_API_URL || ''}/auth/oauth/${provider}`,
}
