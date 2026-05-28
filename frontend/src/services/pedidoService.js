import api from './api'

/**
 * Crea un pedido público de Nequi Contra Entrega.
 * @param {Object} datosPedido - Datos del formulario de checkout
 */
export const crearPedido = async (datosPedido) => {
  try {
    const res = await api.post('/api/pedidos', datosPedido)
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'Error al procesar el pedido.' }
  }
}

/**
 * Consulta el estado de un pedido por número de guía.
 * @param {string} guia - Número de guía (e.g., ELAN-A4B7D2)
 */
export const rastrearPedido = async (guia) => {
  try {
    const res = await api.get(`/api/pedidos/rastreo/${guia}`)
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'No se encontró el pedido.' }
  }
}

// --- FUNCIONES ADMIN (requieren token JWT) ---

/**
 * Lista pedidos con filtro opcional por estado
 */
export const listarPedidosAdmin = async (estado = null) => {
  try {
    const url = estado ? `/api/admin/pedidos?estado=${estado}` : '/api/admin/pedidos'
    const res = await api.get(url)
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'Error al listar pedidos.' }
  }
}

/**
 * Aprueba un pedido pendiente
 */
export const aprobarPedidoAdmin = async (pedidoId) => {
  try {
    const res = await api.post(`/api/admin/pedidos/${pedidoId}/aprobar`)
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'Error al aprobar pedido.' }
  }
}

/**
 * Cambia el estado de un pedido
 */
export const cambiarEstadoPedidoAdmin = async (pedidoId, nuevoEstado) => {
  try {
    const res = await api.put(`/api/admin/pedidos/${pedidoId}/estado`, { nuevo_estado: nuevoEstado })
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'Error al cambiar estado.' }
  }
}
