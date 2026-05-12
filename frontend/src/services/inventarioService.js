import api from './api'

// Dashboard KPIs
export const getInventarioResumen = async () => {
  const res = await api.get('/inventario/resumen')
  return res.data
}

// Tabla de productos con métricas de rotación
export const getInventarioProductos = async () => {
  const res = await api.get('/inventario/productos')
  return res.data
}

// Historial de movimientos de un producto (trazabilidad)
export const getMovimientos = async (productoId) => {
  const res = await api.get(`/inventario/movimientos/${productoId}`)
  return res.data
}

// Registrar ajuste manual (compra, merma, devolución)
export const registrarAjuste = async (data) => {
  const res = await api.post('/inventario/ajuste', data)
  return res.data
}

// Lista de alertas de stock
export const getAlertas = async () => {
  const res = await api.get('/inventario/alertas')
  return res.data
}
