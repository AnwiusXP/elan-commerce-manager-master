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

// ========================================================================
// SERVICIOS DEL MÓDULO DE FACTURAS (TIPO DIAN - PDF / XML)
// ========================================================================

/**
 * Obtener lista de facturas emitidas con filtros opcionales.
 * @param {Object} params - { q: string, origen: string }
 */
export const getFacturas = async (params = {}) => {
  const query = new URLSearchParams()
  if (params.q) query.append('q', params.q)
  if (params.origen && params.origen !== 'TODAS') query.append('origen', params.origen)
  const res = await api.get(`/api/facturas?${query.toString()}`)
  return res.data
}

/**
 * Obtener detalle completo de una factura para vista previa.
 * @param {number} ventaId
 */
export const getFacturaDetalle = async (ventaId) => {
  const res = await api.get(`/api/facturas/${ventaId}`)
  return res.data
}

/**
 * Emitir una factura manual para venta externa (POS / mostrador / WhatsApp).
 * @param {Object} payload - { cliente: { nombre, documento, tipo_doc, email, telefono, direccion, ciudad }, items: [{ producto_id, cantidad, precio_unitario }], metodo_pago, referencia_pago }
 */
export const emitirFacturaManual = async (payload) => {
  try {
    const res = await api.post('/api/facturas/manual', payload)
    return { ok: true, data: res.data }
  } catch (error) {
    const detail = error?.response?.data?.detail
    const msg = typeof detail === 'string' ? detail : 'Error al emitir la factura manual.'
    return { ok: false, mensaje: msg }
  }
}

/**
 * Descarga el archivo PDF de la factura.
 * @param {number} ventaId
 * @param {string} numeroFactura
 */
export const descargarFacturaPDF = async (ventaId, numeroFactura = `ECM-${ventaId}`) => {
  const res = await api.get(`/api/facturas/${ventaId}/pdf`, {
    responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${numeroFactura}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

/**
 * Descarga el archivo XML UBL 2.1 de la factura.
 * @param {number} ventaId
 * @param {string} numeroFactura
 */
export const descargarFacturaXML = async (ventaId, numeroFactura = `ECM-${ventaId}`) => {
  const res = await api.get(`/api/facturas/${ventaId}/xml`, {
    responseType: 'blob',
  })
  const blob = new Blob([res.data], { type: 'application/xml;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${numeroFactura}.xml`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
