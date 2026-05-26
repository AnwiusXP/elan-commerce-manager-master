import api from './api'

export const getProductos = async () => {
  const response = await api.get('/api/productos')
  return response.data
}

export const crearProducto = async (producto, imagenFile = null) => {
  const formData = new FormData()
  for (const key in producto) {
    formData.append(key, producto[key])
  }
  if (imagenFile) {
    formData.append('imagen', imagenFile)
  }
  const res = await api.post('/api/productos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export const editarProducto = async (id, producto, imagenFile = null) => {
  const formData = new FormData()
  for (const key in producto) {
    formData.append(key, producto[key])
  }
  if (imagenFile) {
    formData.append('imagen', imagenFile)
  }
  const res = await api.put(`/api/productos/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export const eliminarProducto = async (id) => {
  await api.delete(`/api/productos/${id}`)
  return { ok: true }
}
