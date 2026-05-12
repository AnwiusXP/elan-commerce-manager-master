import api from './api'

export const getVentas = async () => {
  const res = await api.get('/ventas')
  return res.data
}

export const registrarVenta = async (items) => {
  const res = await api.post('/ventas', { items })
  return { ok: true, venta: res.data }
}

/**
 * Checkout público con simulación de pago (Nequi/PSE).
 * @param {Array} items - Lista de {producto_id, nombre_producto, cantidad, precio}
 * @param {Object} pago - Payload de pago ({metodo: 'NEQUI', telefono} o {metodo: 'PSE', banco, tipo_persona, tipo_doc, num_doc})
 */
export const checkout = async (items, pago) => {
  try {
    const res = await api.post('/checkout', { items, pago })
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    if (typeof detail === 'object' && detail.codigo) {
      return { ok: false, codigo: detail.codigo, mensaje: detail.mensaje }
    }
    return { ok: false, codigo: 'ERROR_GENERAL', mensaje: detail || 'Error al procesar el pago.' }
  }
}
