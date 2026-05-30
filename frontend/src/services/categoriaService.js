import api from './api'

export const getCategorias = async () => {
  const res = await api.get('/api/categorias')
  return res.data
}

export const crearCategoria = async (data) => {
  const res = await api.post('/api/categorias', data)
  return res.data
}

export const editarCategoria = async (id, data) => {
  const res = await api.put(`/api/categorias/${id}`, data)
  return res.data
}

export const eliminarCategoria = async (id) => {
  await api.delete(`/api/categorias/${id}`)
  return { ok: true }
}

export const seedCategoriasOficiales = async () => {
  const res = await api.post('/api/categorias/seed-oficiales')
  return res.data
}
