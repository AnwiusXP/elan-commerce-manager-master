import api from './api'

export const getProductos = async () => {
  const response = await api.get('/api/productos')
  return response.data
}

export const crearProducto = async (producto) => {
  const res = await api.post('/api/productos', producto)
  return res.data
}

export const editarProducto = async (id, producto) => {
  const res = await api.put(`/api/productos/${id}`, producto)
  return res.data
}

export const eliminarProducto = async (id) => {
  await api.delete(`/api/productos/${id}`)
  return { ok: true }
}
