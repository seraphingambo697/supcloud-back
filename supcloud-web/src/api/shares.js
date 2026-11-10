import { api } from './client'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

export const sharesApi = {
  create: (fileItemId, expiresAt, password) =>
    api.post('/share/links', {
      file_item_id: fileItemId,
      expires_at: expiresAt || null,
      password: password || null,
    }),

  list: () => api.get('/share/links'),

  revoke: (id) => api.delete(`/share/links/${id}`),

  resolve: (token, password) =>
    axios.post(`${BASE_URL}/share/resolve/${token}`, {
      password: password || null,
    }),

  shareFolder: (folderId, email, canEdit) =>
    api.post('/share/internal', {
      folder_id: folderId,
      target_email: email,
      can_edit: canEdit,
    }),

  sharedWithMe: () => api.get('/share/with-me'),
}