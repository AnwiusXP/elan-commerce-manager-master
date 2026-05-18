import api from './api'

export const getVentas = async () => {
  const res = await api.get('/api/ventas')
  return res.data
}

export const getVentasHistorial = async () => {
  const res = await api.get('/api/ventas/historial')
  return res.data
}

export const registrarVenta = async (items) => {
  const res = await api.post('/api/ventas', { items })
  return { ok: true, venta: res.data }
}

/**
 * Procesar reembolso de una venta.
 * @param {number} venta_id - ID de la venta a reembolsar
 * @param {Array|null} items - Lista de {producto_id, cantidad} para reembolso parcial, o null para total
 * @param {string|null} motivo - Razón del reembolso
 */
export const procesarReembolso = async (venta_id, items = null, motivo = null) => {
  try {
    const res = await api.post('/api/ventas/reembolso', { venta_id, items, motivo })
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    return { ok: false, mensaje: detail || 'Error al procesar el reembolso.' }
  }
}

/**
 * Checkout público con simulación de pago (Nequi/PSE).
 * @param {Array} items - Lista de {producto_id, nombre_producto, cantidad, precio}
 * @param {Object} pago - Payload de pago ({metodo: 'NEQUI', telefono} o {metodo: 'PSE', banco, tipo_persona, tipo_doc, num_doc})
 */
export const checkout = async (items, pago) => {
  try {
    const res = await api.post('/api/checkout', { items, pago })
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'object' && detail.codigo) {
      return { ok: false, codigo: detail.codigo, mensaje: detail.mensaje }
    }
    return { ok: false, codigo: 'ERROR_GENERAL', mensaje: detail || 'Error al procesar el pago.' }
  }
}
