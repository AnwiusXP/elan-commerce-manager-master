import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getProductos } from '../services/productoService'
import {
  getFacturas,
  getFacturaDetalle,
  emitirFacturaManual,
  descargarFacturaPDF,
  descargarFacturaXML,
  getVentasHistorial,
  procesarReembolso,
} from '../services/ventaService'
import {
  FileText,
  Download,
  Eye,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  X,
  CreditCard,
  Building2,
  User,
  ShoppingBag,
} from 'lucide-react'

function Ventas() {
  const [tabIndex, setTabIndex] = useState(0) // 0: Facturas Emitidas, 1: Nueva Factura (Manual), 2: Reembolsos

  // ── ESTADO TAB 0: FACTURAS EMITIDAS ──
  const [facturas, setFacturas] = useState([])
  const [cargandoFacturas, setCargandoFacturas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroOrigen, setFiltroOrigen] = useState('TODAS')
  const [descargandoId, setDescargandoId] = useState(null) // { id, tipo: 'pdf'|'xml' }

  // ── ESTADO TAB 1: NUEVA FACTURA MANUAL ──
  const [productos, setProductos] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(false)
  const [cliente, setCliente] = useState({
    nombre: '',
    documento: '',
    tipo_doc: 'CC',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: 'Medellín, Colombia',
  })
  const [selProductoId, setSelProductoId] = useState('')
  const [cantManual, setCantManual] = useState(1)
  const [precioManual, setPrecioManual] = useState('')
  const [itemsManuales, setItemsManuales] = useState([])
  const [metodoPagoManual, setMetodoPagoManual] = useState('EFECTIVO')
  const [referenciaManual, setReferenciaManual] = useState('')
  const [guardandoManual, setGuardandoManual] = useState(false)
  const [alertaManual, setAlertaManual] = useState(null)

  // ── ESTADO TAB 2: REEMBOLSOS ──
  const [historialReembolsos, setHistorialReembolsos] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // ── ESTADO MODAL VISTA PREVIA FACTURA ──
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Carga inicial
  useEffect(() => {
    cargarFacturas()
    cargarProductos()
  }, [])

  useEffect(() => {
    if (tabIndex === 0) cargarFacturas()
    if (tabIndex === 1) cargarProductos()
    if (tabIndex === 2) cargarHistorialReembolsos()
  }, [tabIndex])

  // Cargar lista de facturas
  async function cargarFacturas() {
    setCargandoFacturas(true)
    try {
      const data = await getFacturas({ q: busqueda, origen: filtroOrigen })
      setFacturas(data || [])
    } catch (err) {
      console.error('Error al cargar facturas:', err)
    } finally {
      setCargandoFacturas(false)
    }
  }

  // Cargar productos para el selector manual
  async function cargarProductos() {
    setCargandoProductos(true)
    try {
      const data = await getProductos()
      setProductos(data || [])
      if (data && data.length > 0 && !selProductoId) {
        setSelProductoId(data[0].id)
        setPrecioManual(data[0].precio || '')
      }
    } catch (err) {
      console.error('Error al cargar productos:', err)
    } finally {
      setCargandoProductos(false)
    }
  }

  // Cargar historial de reembolsos
  async function cargarHistorialReembolsos() {
    setCargandoHistorial(true)
    try {
      const data = await getVentasHistorial()
      setHistorialReembolsos(data || [])
    } catch (err) {
      console.error('Error al cargar historial:', err)
    } finally {
      setCargandoHistorial(false)
    }
  }

  // Cambio de producto en selector manual
  function handleCambioProducto(prodId) {
    setSelProductoId(prodId)
    const p = productos.find(x => x.id === parseInt(prodId))
    if (p) {
      setPrecioManual(p.precio || '')
    }
  }

  // Agregar ítem a la factura manual
  function agregarItemManual() {
    setAlertaManual(null)
    const p = productos.find(x => x.id === parseInt(selProductoId))
    if (!p) return

    const cant = parseInt(cantManual) || 1
    if (cant > p.stock) {
      setAlertaManual(`Stock insuficiente para "${p.nombre}". Disponible: ${p.stock}`)
      return
    }

    const pr = parseFloat(precioManual) || p.precio || 0
    const existente = itemsManuales.find(it => it.producto_id === p.id)

    if (existente) {
      if (existente.cantidad + cant > p.stock) {
        setAlertaManual(`No puedes agregar más unidades de las disponibles (${p.stock}).`)
        return
      }
      setItemsManuales(
        itemsManuales.map(it =>
          it.producto_id === p.id
            ? { ...it, cantidad: it.cantidad + cant, precio_unitario: pr, subtotal: (it.cantidad + cant) * pr }
            : it
        )
      )
    } else {
      setItemsManuales([
        ...itemsManuales,
        {
          producto_id: p.id,
          nombre_producto: p.nombre,
          cantidad: cant,
          precio_unitario: pr,
          subtotal: cant * pr,
        },
      ])
    }

    setCantManual(1)
  }

  // Eliminar ítem de la factura manual
  function eliminarItemManual(idx) {
    setItemsManuales(itemsManuales.filter((_, i) => i !== idx))
  }

  // Totales calculados en vivo para factura manual
  const totalManual = itemsManuales.reduce((acc, it) => acc + it.subtotal, 0)
  const subtotalManual = Math.round(totalManual / 1.19)
  const ivaManual = totalManual - subtotalManual

  // Emitir Factura Manual y registrar Venta
  async function handleEmitirFactura() {
    setAlertaManual(null)

    if (!cliente.nombre.trim()) {
      setAlertaManual('Debe ingresar el nombre o razón social del cliente.')
      return
    }
    if (!cliente.documento.trim()) {
      setAlertaManual('Debe ingresar el documento o NIT del cliente.')
      return
    }
    if (itemsManuales.length === 0) {
      setAlertaManual('Agregue al menos un producto a la factura.')
      return
    }

    setGuardandoManual(true)
    try {
      const payload = {
        cliente,
        items: itemsManuales.map(it => ({
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
        metodo_pago: metodoPagoManual,
        referencia_pago: referenciaManual || null,
      }

      const res = await emitirFacturaManual(payload)
      if (res.ok) {
        // Limpiar formulario
        setItemsManuales([])
        setCliente({
          nombre: '',
          documento: '',
          tipo_doc: 'CC',
          email: '',
          telefono: '',
          direccion: '',
          ciudad: 'Medellín, Colombia',
        })
        setReferenciaManual('')

        // Abrir inmediatamente la factura generada en el modal
        if (res.data?.factura) {
          setFacturaSeleccionada(res.data.factura)
        }

        // Recargar productos (por el stock descontado) y cambiar a tab de historial
        await cargarProductos()
        await cargarFacturas()
      } else {
        setAlertaManual(res.mensaje || 'Error al emitir la factura.')
      }
    } catch (err) {
      setAlertaManual('Error inesperado al emitir la factura.')
    } finally {
      setGuardandoManual(false)
    }
  }

  // Ver vista previa de factura
  async function handleVerFactura(ventaId) {
    setCargandoDetalle(true)
    try {
      const data = await getFacturaDetalle(ventaId)
      setFacturaSeleccionada(data)
    } catch (err) {
      alert('Error al cargar detalle de factura')
    } finally {
      setCargandoDetalle(false)
    }
  }

  // Descargar PDF
  async function handleDescargarPDF(ventaId, numeroFactura) {
    setDescargandoId({ id: ventaId, tipo: 'pdf' })
    try {
      await descargarFacturaPDF(ventaId, numeroFactura)
    } catch (err) {
      alert('Error al descargar el PDF de la factura.')
    } finally {
      setDescargandoId(null)
    }
  }

  // Descargar XML
  async function handleDescargarXML(ventaId, numeroFactura) {
    setDescargandoId({ id: ventaId, tipo: 'xml' })
    try {
      await descargarFacturaXML(ventaId, numeroFactura)
    } catch (err) {
      alert('Error al descargar el XML de la factura.')
    } finally {
      setDescargandoId(null)
    }
  }

  // Procesar reembolso
  async function handleReembolso(ventaId) {
    if (!window.confirm(`¿Estás seguro de anular/reembolsar la venta #${ventaId}? Se repondrá el inventario.`)) return
    const res = await procesarReembolso(ventaId, null, 'Reembolso procesado desde Módulo de Facturas')
    if (res.ok) {
      alert('Reembolso procesado correctamente e inventario repuesto.')
      cargarHistorialReembolsos()
      cargarFacturas()
    } else {
      alert(`Error: ${res.mensaje}`)
    }
  }

  // Estilos base
  const inputStyle = {
    width: '100%',
    background: '#0d1117',
    border: '1px solid #30363d',
    color: '#e6edf3',
    borderRadius: '8px',
    padding: '9px 12px',
    fontSize: '0.88rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    display: 'block',
    color: '#8b949e',
    fontSize: '0.8rem',
    fontWeight: '600',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  return (
    <div className="admin-layout" style={{ display: 'flex' }}>
      <Sidebar active="Facturas" />
      <div className="admin-content" style={{ flex: 1, padding: '24px 32px', background: '#090d16', minHeight: '100vh', color: '#e6edf3' }}>

        {/* ── HEADER PRINCIPAL Y TABS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={26} color="var(--color-primary)" />
              Gestor de Facturación Electrónica (DIAN)
            </h1>
            <p style={{ color: '#8b949e', fontSize: '0.88rem', margin: 0 }}>
              Emisión de facturas para ventas web y externas (POS), visualización estructurada y descarga en PDF / XML UBL 2.1.
            </p>
          </div>

          {/* Navegación por Pestañas */}
          <div style={{ display: 'flex', gap: '6px', background: '#161b22', padding: '4px', borderRadius: '10px', border: '1px solid #30363d' }}>
            <button
              onClick={() => setTabIndex(0)}
              style={{
                background: tabIndex === 0 ? 'var(--color-primary)' : 'transparent',
                border: 'none',
                color: tabIndex === 0 ? '#fff' : '#8b949e',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FileText size={16} /> Facturas Emitidas
            </button>
            <button
              onClick={() => setTabIndex(1)}
              style={{
                background: tabIndex === 1 ? 'var(--color-primary)' : 'transparent',
                border: 'none',
                color: tabIndex === 1 ? '#fff' : '#8b949e',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.86rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Plus size={16} /> Nueva Factura (Externa / POS)
            </button>
            <button
              onClick={() => setTabIndex(2)}
              style={{
                background: tabIndex === 2 ? '#21262d' : 'transparent',
                border: 'none',
                color: tabIndex === 2 ? '#e6edf3' : '#8b949e',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.86rem',
              }}
            >
              Reembolsos y Anulaciones
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 0: LISTADO DE FACTURAS EMITIDAS
           ══════════════════════════════════════════════════════════════════════ */}
        {tabIndex === 0 && (
          <div>
            {/* Barra de Filtros y Búsqueda */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                <Search size={18} color="#8b949e" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar por # factura (ECM-...), nombre o NIT/CC de cliente..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && cargarFacturas()}
                  style={{ ...inputStyle, paddingLeft: '38px' }}
                />
              </div>

              <select
                value={filtroOrigen}
                onChange={e => setFiltroOrigen(e.target.value)}
                style={{ ...inputStyle, width: 'auto', minWidth: '180px' }}
              >
                <option value="TODAS">Todos los Orígenes</option>
                <option value="WEB">Ventas Web / Pedidos</option>
                <option value="MANUAL_EXTERNA">Ventas Manuales (POS / Externa)</option>
              </select>

              <button
                onClick={cargarFacturas}
                style={{
                  background: '#21262d',
                  border: '1px solid #30363d',
                  color: '#e6edf3',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: '600',
                }}
              >
                <RefreshCw size={15} /> Filtrar
              </button>
            </div>

            {/* Tabla de Facturas */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflow: 'hidden' }}>
              {cargandoFacturas ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#8b949e' }}>
                  <RefreshCw size={24} className="spin" style={{ marginBottom: '12px' }} />
                  <div>Cargando listado de facturas...</div>
                </div>
              ) : facturas.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#8b949e' }}>
                  <FileText size={36} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <div style={{ fontSize: '1rem', fontWeight: '600' }}>No se encontraron facturas</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>Genera una nueva factura manual o realiza una venta desde la tienda web.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: '#0d1117', color: '#8b949e', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid #30363d' }}>
                        <th style={{ padding: '14px 16px' }}>Factura #</th>
                        <th style={{ padding: '14px 16px' }}>Fecha</th>
                        <th style={{ padding: '14px 16px' }}>Origen</th>
                        <th style={{ padding: '14px 16px' }}>Cliente / Adquirente</th>
                        <th style={{ padding: '14px 16px' }}>Medio Pago</th>
                        <th style={{ padding: '14px 16px' }}>Total ($ COP)</th>
                        <th style={{ padding: '14px 16px' }}>Estado</th>
                        <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acciones DIAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturas.map(f => (
                        <tr key={f.venta_id} style={{ borderBottom: '1px solid #21262d' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: 'var(--color-primary)' }}>
                            {f.numero_factura}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#8b949e', whiteSpace: 'nowrap' }}>
                            {new Date(f.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600',
                              background: f.origen_venta === 'MANUAL_EXTERNA' ? 'rgba(168,85,247,0.15)' : 'rgba(14,165,233,0.15)',
                              color: f.origen_venta === 'MANUAL_EXTERNA' ? '#c084fc' : '#38bdf8',
                              border: f.origen_venta === 'MANUAL_EXTERNA' ? '1px solid rgba(168,85,247,0.3)' : '1px solid rgba(14,165,233,0.3)',
                            }}>
                              {f.origen_venta === 'MANUAL_EXTERNA' ? 'Externa / POS' : 'Tienda Web'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: '600', color: '#e6edf3' }}>{f.cliente_nombre}</div>
                            <div style={{ color: '#8b949e', fontSize: '0.78rem' }}>{f.cliente_tipo_doc}: {f.cliente_documento}</div>
                          </td>
                          <td style={{ padding: '12px 16px', color: '#8b949e' }}>
                            {f.metodo_pago}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: '700', color: '#e6edf3' }}>
                            ${f.total.toLocaleString('es-CO')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '600',
                              background: f.estado === 'APROBADA' ? 'rgba(45,212,139,0.15)' : 'rgba(227,179,65,0.15)',
                              color: f.estado === 'APROBADA' ? '#2dd48b' : '#e3b341',
                            }}>
                              {f.estado}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                              <button
                                onClick={() => handleVerFactura(f.venta_id)}
                                title="Ver vista previa de la factura"
                                style={{
                                  background: '#21262d', border: '1px solid #30363d', color: '#e6edf3',
                                  padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem',
                                  display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600',
                                }}
                              >
                                <Eye size={14} /> Ver
                              </button>
                              <button
                                onClick={() => handleDescargarPDF(f.venta_id, f.numero_factura)}
                                disabled={descargandoId?.id === f.venta_id && descargandoId?.tipo === 'pdf'}
                                title="Descargar PDF formato DIAN"
                                style={{
                                  background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
                                  padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem',
                                  display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600',
                                }}
                              >
                                <Download size={14} /> PDF
                              </button>
                              <button
                                onClick={() => handleDescargarXML(f.venta_id, f.numero_factura)}
                                disabled={descargandoId?.id === f.venta_id && descargandoId?.tipo === 'xml'}
                                title="Descargar XML UBL 2.1"
                                style={{
                                  background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa',
                                  padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem',
                                  display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600',
                                }}
                              >
                                <Download size={14} /> XML
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: FORMULARIO DE FACTURA MANUAL (VENTA EXTERNA / POS)
           ══════════════════════════════════════════════════════════════════════ */}
        {tabIndex === 1 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>
            {/* Columna Principal: Datos del Cliente e Ítems */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {alertaManual && (
                <div style={{
                  background: 'rgba(248,81,73,0.15)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149',
                  borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem',
                }}>
                  <AlertCircle size={20} />
                  <span>{alertaManual}</span>
                </div>
              )}

              {/* Bloque 1: Datos del Comprador */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={18} color="var(--color-primary)" /> Datos del Cliente / Adquirente
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div>
                    <label style={labelStyle}>Tipo Doc</label>
                    <select
                      value={cliente.tipo_doc}
                      onChange={e => setCliente({ ...cliente, tipo_doc: e.target.value })}
                      style={inputStyle}
                    >
                      <option value="CC">Cédula (CC)</option>
                      <option value="NIT">NIT</option>
                      <option value="CE">Cédula Ext. (CE)</option>
                      <option value="PASAPORTE">Pasaporte</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Número de Documento *</label>
                    <input
                      type="text"
                      placeholder="Ej. 1020304050 o 901234567"
                      value={cliente.documento}
                      onChange={e => setCliente({ ...cliente, documento: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Nombre Completo / Razón Social *</label>
                    <input
                      type="text"
                      placeholder="Ej. Distribuciones Juan Pérez S.A.S."
                      value={cliente.nombre}
                      onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Teléfono / Celular</label>
                    <input
                      type="text"
                      placeholder="Ej. 300 123 4567"
                      value={cliente.telefono}
                      onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input
                      type="email"
                      placeholder="cliente@ejemplo.com"
                      value={cliente.email}
                      onChange={e => setCliente({ ...cliente, email: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Dirección y Ciudad</label>
                    <input
                      type="text"
                      placeholder="Calle 10 # 20-30, Medellín"
                      value={cliente.direccion}
                      onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

              {/* Bloque 2: Selección de Productos */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingBag size={18} color="var(--color-primary)" /> Productos a Facturar (Descuenta Stock)
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 100px 140px auto', gap: '12px', alignItems: 'flex-end', marginBottom: '20px' }}>
                  <div>
                    <label style={labelStyle}>Producto del Catálogo</label>
                    <select
                      value={selProductoId}
                      onChange={e => handleCambioProducto(e.target.value)}
                      style={inputStyle}
                    >
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} (Stock: {p.stock}) — ${(p.precio || 0).toLocaleString('es-CO')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={cantManual}
                      onChange={e => setCantManual(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Precio Unitario</label>
                    <input
                      type="number"
                      min="0"
                      value={precioManual}
                      onChange={e => setPrecioManual(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={agregarItemManual}
                      style={{
                        background: 'var(--color-primary)', border: 'none', color: '#fff',
                        padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                        fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', height: '40px',
                      }}
                    >
                      <Plus size={16} /> Agregar
                    </button>
                  </div>
                </div>

                {/* Tabla de Ítems agregados */}
                {itemsManuales.length === 0 ? (
                  <div style={{ border: '2px dashed #30363d', borderRadius: '8px', padding: '32px', textAlign: 'center', color: '#8b949e' }}>
                    No has agregado productos a la factura todavía. Selecciona uno arriba y haz clic en "Agregar".
                  </div>
                ) : (
                  <div style={{ border: '1px solid #30363d', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ background: '#0d1117', color: '#8b949e', borderBottom: '1px solid #30363d' }}>
                          <th style={{ padding: '10px 14px' }}>Producto</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center' }}>Cantidad</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Precio Unit.</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right' }}>Subtotal</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemsManuales.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #21262d' }}>
                            <td style={{ padding: '10px 14px', fontWeight: '600', color: '#e6edf3' }}>{it.nombre_producto}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#8b949e' }}>{it.cantidad}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', color: '#8b949e' }}>${it.precio_unitario.toLocaleString('es-CO')}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '600', color: 'var(--color-primary)' }}>
                              ${it.subtotal.toLocaleString('es-CO')}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                              <button
                                onClick={() => eliminarItemManual(idx)}
                                title="Eliminar ítem"
                                style={{ background: 'transparent', border: 'none', color: '#f85149', cursor: 'pointer' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Bloque 3: Método y Referencia de Pago */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} color="var(--color-primary)" /> Forma de Pago de la Venta Externa
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Método de Pago</label>
                    <select
                      value={metodoPagoManual}
                      onChange={e => setMetodoPagoManual(e.target.value)}
                      style={inputStyle}
                    >
                      <option value="EFECTIVO">Efectivo (Mostrador / Caja)</option>
                      <option value="TRANSFERENCIA">Transferencia Bancaria (Bancolombia, etc.)</option>
                      <option value="NEQUI">Nequi / Daviplata</option>
                      <option value="DATAFONO">Datáfono / Tarjeta Débito-Crédito</option>
                      <option value="CONTRA_ENTREGA">Pago Contra Entrega</option>
                      <option value="OTRO">Otro medio acordado</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Referencia / N° de Comprobante (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ej. REC-9843 o Aprobación 543210"
                      value={referenciaManual}
                      onChange={e => setReferenciaManual(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Columna Lateral: Resumen Financiero y Botón Emitir */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', position: 'sticky', top: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid #30363d', paddingBottom: '12px' }}>
                Liquidación de Factura
              </h3>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', fontSize: '0.88rem', marginBottom: '10px' }}>
                <span>Subtotal (Base):</span>
                <span style={{ fontWeight: '600', color: '#e6edf3' }}>${subtotalManual.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', fontSize: '0.88rem', marginBottom: '16px' }}>
                <span>IVA (19% discriminado):</span>
                <span style={{ fontWeight: '600', color: '#e6edf3' }}>${ivaManual.toLocaleString('es-CO')}</span>
              </div>

              <div style={{ borderTop: '2px solid #30363d', paddingTop: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e6edf3' }}>TOTAL:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--color-primary)' }}>
                    ${totalManual.toLocaleString('es-CO')} COP
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#8b949e', marginTop: '6px' }}>
                  {itemsManuales.length} producto(s) en la factura.
                </div>
              </div>

              <button
                type="button"
                onClick={handleEmitirFactura}
                disabled={guardandoManual || itemsManuales.length === 0}
                style={{
                  background: guardandoManual || itemsManuales.length === 0 ? '#21262d' : 'var(--color-primary)',
                  color: guardandoManual || itemsManuales.length === 0 ? '#8b949e' : '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px',
                  fontWeight: '700',
                  fontSize: '0.96rem',
                  width: '100%',
                  cursor: guardandoManual || itemsManuales.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                }}
              >
                {guardandoManual ? (
                  <>
                    <RefreshCw size={18} className="spin" /> Registrando y Generando...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} /> Generar Factura y Registrar Venta
                  </>
                )}
              </button>

              <div style={{ marginTop: '16px', fontSize: '0.76rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
                Al pulsar este botón, la venta se registrará en el sistema, descontará el inventario en tiempo real y emitirá la factura lista para exportar en PDF y XML.
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: HISTORIAL DE REEMBOLSOS Y ANULACIONES
           ══════════════════════════════════════════════════════════════════════ */}
        {tabIndex === 2 && (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', fontWeight: '700' }}>
              Gestión de Reembolsos y Anulación de Facturas
            </h3>
            <p style={{ color: '#8b949e', fontSize: '0.88rem', marginBottom: '20px' }}>
              Al procesar un reembolso sobre una factura aprobada, las unidades son devueltas inmediatamente al inventario y se registra un movimiento tipo DEVOLUCIÓN.
            </p>

            {cargandoHistorial ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Cargando ventas...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ color: '#8b949e', fontSize: '0.78rem', textTransform: 'uppercase', borderBottom: '1px solid #30363d' }}>
                      <th style={{ padding: '12px 10px' }}>ID Venta</th>
                      <th style={{ padding: '12px 10px' }}>Fecha</th>
                      <th style={{ padding: '12px 10px' }}>Monto</th>
                      <th style={{ padding: '12px 10px' }}>Método</th>
                      <th style={{ padding: '12px 10px' }}>Estado</th>
                      <th style={{ padding: '12px 10px', textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialReembolsos.map(v => (
                      <tr key={v.id} style={{ borderBottom: '1px solid #30363d' }}>
                        <td style={{ padding: '12px 10px', color: '#c9d1d9', fontWeight: '600' }}>#{v.id}</td>
                        <td style={{ padding: '12px 10px', color: '#8b949e' }}>{new Date(v.fecha).toLocaleString('es-CO')}</td>
                        <td style={{ padding: '12px 10px', color: 'var(--color-primary)', fontWeight: '600' }}>${v.total.toLocaleString('es-CO')}</td>
                        <td style={{ padding: '12px 10px', color: '#8b949e' }}>{v.metodo_pago}</td>
                        <td style={{ padding: '12px 10px' }}>
                          <span style={{
                            padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                            background: v.estado === 'APROBADA' ? 'rgba(45,212,139,0.1)' : v.estado === 'REEMBOLSADA' ? 'rgba(227,179,65,0.1)' : 'rgba(248,81,73,0.1)',
                            color: v.estado === 'APROBADA' ? '#2dd48b' : v.estado === 'REEMBOLSADA' ? '#e3b341' : '#f85149',
                          }}>
                            {v.estado}
                          </span>
                        </td>
                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                          {v.estado === 'APROBADA' && (
                            <button
                              onClick={() => handleReembolso(v.id)}
                              style={{
                                background: 'transparent', border: '1px solid #e3b341', color: '#e3b341',
                                padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                              }}
                            >
                              Anular / Reembolsar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {historialReembolsos.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>No hay ventas registradas.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            MODAL DE VISTA PREVIA: FACTURA TIPO DIAN
           ══════════════════════════════════════════════════════════════════════ */}
        {facturaSeleccionada && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}>
            <div style={{
              background: '#ffffff', color: '#0f172a', width: '100%', maxWidth: '800px',
              maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              padding: '32px', position: 'relative', fontFamily: 'system-ui, sans-serif',
            }}>
              {/* Botón Cerrar */}
              <button
                onClick={() => setFacturaSeleccionada(null)}
                style={{
                  position: 'absolute', top: '16px', right: '16px', background: '#f1f5f9',
                  border: 'none', borderRadius: '50%', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b',
                }}
              >
                <X size={18} />
              </button>

              {/* Encabezado Factura */}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #10b981', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ margin: '0 0 4px 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{facturaSeleccionada.emisor_nombre}</h2>
                  <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: '1.4' }}>
                    NIT: {facturaSeleccionada.emisor_nit} | {facturaSeleccionada.emisor_regimen}<br />
                    {facturaSeleccionada.emisor_actividad}<br />
                    {facturaSeleccionada.emisor_direccion} — {facturaSeleccionada.emisor_ciudad}<br />
                    Tel: {facturaSeleccionada.emisor_telefono} | {facturaSeleccionada.emisor_email}
                  </div>
                </div>
                <div style={{ textAlign: 'right', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#10b981', fontWeight: '800', fontSize: '0.9rem' }}>FACTURA ELECTRÓNICA DE VENTA</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', margin: '4px 0', color: '#0f172a' }}>{facturaSeleccionada.numero_factura}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <b>Emisión:</b> {new Date(facturaSeleccionada.fecha_emision).toLocaleDateString('es-CO')}<br />
                    <b>Pago:</b> {facturaSeleccionada.metodo_pago}
                  </div>
                </div>
              </div>

              {/* Datos del Comprador */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '6px', fontSize: '0.88rem' }}>ADQUIRENTE (COMPRADOR)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', color: '#334155' }}>
                  <div><b>Nombre/Razón Social:</b> {facturaSeleccionada.comprador_nombre}</div>
                  <div><b>{facturaSeleccionada.comprador_tipo_doc}:</b> {facturaSeleccionada.comprador_documento}</div>
                  <div><b>Dirección:</b> {facturaSeleccionada.comprador_direccion}</div>
                  <div><b>Ciudad:</b> {facturaSeleccionada.comprador_ciudad}</div>
                  <div><b>Teléfono:</b> {facturaSeleccionada.comprador_telefono}</div>
                  <div><b>Email:</b> {facturaSeleccionada.comprador_email}</div>
                </div>
              </div>

              {/* Tabla de Productos */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left' }}>
                    <th style={{ padding: '8px 10px' }}>#</th>
                    <th style={{ padding: '8px 10px' }}>Descripción</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Cant.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Vr. Unit</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {facturaSeleccionada.items?.map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontWeight: '600' }}>{it.nombre}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>{it.cantidad}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>${it.precio_unitario.toLocaleString('es-CO')}</td>
                      <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '600' }}>${it.subtotal.toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Resumen Totales */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', maxWidth: '420px', lineHeight: '1.4' }}>
                  <b>Información tributaria:</b><br />
                  {facturaSeleccionada.resolucion_dian}<br />
                  <b>Estado fiscal:</b> {facturaSeleccionada.estado_venta} | <b>Origen:</b> {facturaSeleccionada.origen_venta}
                </div>

                <div style={{ width: '260px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: '600' }}>${facturaSeleccionada.subtotal?.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b' }}>IVA (19%):</span>
                    <span style={{ fontWeight: '600' }}>${facturaSeleccionada.iva_monto?.toLocaleString('es-CO')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', borderTop: '2px solid #e2e8f0', paddingTop: '8px', color: '#10b981' }}>
                    <span>TOTAL:</span>
                    <span>${facturaSeleccionada.total?.toLocaleString('es-CO')} COP</span>
                  </div>
                </div>
              </div>

              {/* Acciones de Descarga */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  onClick={() => handleDescargarPDF(facturaSeleccionada.venta_id, facturaSeleccionada.numero_factura)}
                  style={{
                    background: '#dc2626', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <Download size={16} /> Descargar PDF Oficial
                </button>
                <button
                  onClick={() => handleDescargarXML(facturaSeleccionada.venta_id, facturaSeleccionada.numero_factura)}
                  style={{
                    background: '#2563eb', color: '#fff', border: 'none', padding: '10px 18px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                >
                  <Download size={16} /> Descargar XML UBL 2.1
                </button>
                <button
                  onClick={() => setFacturaSeleccionada(null)}
                  style={{
                    background: '#e2e8f0', color: '#334155', border: 'none', padding: '10px 18px',
                    borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                  }}
                >
                  Cerrar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Ventas
