import { api } from './client'

export const filesApi = {
  // Listing 
  list: (folderId) => api.get('/files', { params: folderId ? { folder_id: folderId } : {} }),
  breadcrumb: (folderId) => api.get('/files/breadcrumb', { params: folderId ? { folder_id: folderId } : {} }),
  recent: (limit = 5) => api.get(`/files/recent?limit=${limit}`),
  stats: () => api.get('/files/stats'),
  listTrash: () => api.get('/files/trash'),
  search: (q, category, after) => {
    let url = `/files/search?q=${encodeURIComponent(q)}`
    if (category) url += `&category=${category}`
    if (after) url += `&modified_after=${after.toISOString()}`
    return api.get(url)
  },

  // Création
  createFolder: (name, parentId) => api.post('/files/folder', {
    name,
    parent_id: parentId || null,
  }),

  // Upload multipart 
  upload: (file, parentId, onProgress) => {
    const form = new FormData()
    form.append('file', file)
    if (parentId) form.append('parent_id', parentId)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
    })
  },

  // Manipulation 
  rename: (id, newName) => api.patch(`/files/${id}/rename`, { new_name: newName }),
  move: (ids, destId) => api.post('/files/move', {
    ids: ids.map(String),
    destination_folder_id: destId || null,
  }),

  // Corbeille 
  trash: (ids) => api.post('/files/trash', { ids: ids.map(String) }),
  restore: (ids) => api.post('/files/trash/restore', { ids: ids.map(String) }),

  delete: (ids) => api.delete('/files/trash', { data: { ids: ids.map(String) } }),

  // Téléchargement 
  downloadFile: (id) => api.get(`/files/${id}/download`, { responseType: 'blob' }),
  downloadZip: (id) => api.get(`/files/${id}/zip`, { responseType: 'blob' }),
  downloadText: (id) => api.get(`/files/${id}/download`, { responseType: 'text' }),
}
