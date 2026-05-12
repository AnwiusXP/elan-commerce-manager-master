import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import {
  getInventarioResumen,
  getInventarioProductos,
  getMovimientos,
  registrarAjuste
} from '../services/inventarioService'
import './Inventario.css'

// ─── Helpers ───────────────────────────────────────────────────────
const ESTADO_LABELS = {
  OPTIMO: '✅ Óptimo',
  CRITICO: '⚠ Bajo',
  SIN_STOCK: '🔴 Sin stock',
  ESTANCADO: '💤 Estancado'
}

const TIPO_LABELS = {
  VENTA: '📦 Venta',
  ENTRADA_COMPRA: '📥 Entrada compra',
  AJUSTE_MERMA: '📉 Merma',
  DEVOLUCION: '🔄 Devolución'
}

function formatCurrency(n) {
  return '$' + (n || 0).toLocaleString('es-CO')
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso) {
  if (!iso) return ''
  const now = new Date()
  const then = new Date(iso)
  const diffMs = now - then
  const mins = Math.floor(diffMs / 60000)
  if (mins < 60) return `Hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `Hace ${days}d`
  return formatDate(iso)
}

// ─── Main Component ────────────────────────────────────────────────
function Inventario() {
  const [resumen, setResumen] = useState(null)
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('TODOS')

  // Modal states
  const [modalMovimientos, setModalMovimientos] = useState(null)
  const [modalAjuste, setModalAjuste] = useState(null)
  const [movimientosData, setMovimientosData] = useState(null)
  const [cargandoMov, setCargandoMov] = useState(false)

  // Ajuste form
  const [ajusteForm, setAjusteForm] = useState({ tipo: 'ENTRADA_COMPRA', cantidad: '', nota: '' })
  const [ajusteError, setAjusteError] = useState('')
  const [ajusteExito, setAjusteExito] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    try {
      const [resumenData, productosData] = await Promise.all([
        getInventarioResumen(),
        getInventarioProductos()
      ])
      setResumen(resumenData)
      setProductos(productosData)
    } catch (err) {
      console.error('Error cargando inventario:', err)
    }
    setCargando(false)
  }

  async function abrirMovimientos(productoId) {
    setCargandoMov(true)
    setModalMovimientos(productoId)
    try {
      const data = await getMovimientos(productoId)
      setMovimientosData(data)
    } catch (err) {
      console.error('Error cargando movimientos:', err)
    }
    setCargandoMov(false)
  }

  function cerrarMovimientos() {
    setModalMovimientos(null)
    setMovimientosData(null)
  }

  function abrirAjuste(producto) {
    setModalAjuste(producto)
    setAjusteForm({ tipo: 'ENTRADA_COMPRA', cantidad: '', nota: '' })
    setAjusteError('')
    setAjusteExito(false)
  }

  async function enviarAjuste() {
    if (!ajusteForm.cantidad || parseInt(ajusteForm.cantidad) <= 0) {
      setAjusteError('Ingresa una cantidad válida mayor a 0')
      return
    }
    setAjusteError('')
    try {
      await registrarAjuste({
        producto_id: modalAjuste.id,
        tipo: ajusteForm.tipo,
        cantidad: parseInt(ajusteForm.cantidad),
        nota: ajusteForm.nota || null
      })
      setAjusteExito(true)
      setTimeout(() => {
        setModalAjuste(null)
        setAjusteExito(false)
        cargarDatos()
      }, 1200)
    } catch (err) {
      setAjusteError(err.response?.data?.detail || 'Error al registrar ajuste')
    }
  }

  // ─── Filtrado ──────────────────────────────────────────────────
  const productosFiltrados = productos
    .filter(p => {
      if (filtro === 'CRITICO') return p.estado === 'CRITICO' || p.estado === 'SIN_STOCK'
      if (filtro === 'ESTANCADO') return p.estado === 'ESTANCADO'
      return true
    })
    .filter(p => {
      if (!busqueda) return true
      const q = busqueda.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || p.categoria.toLowerCase().includes(q)
    })

  // Speed bar max for normalization
  const maxVelocidad = Math.max(...productos.map(p => p.velocidad_diaria), 1)

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="Inventario" />
      <div style={{ marginLeft: '200px', padding: '32px', flex: 1, minWidth: 0 }}>

        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '6px' }}>
          Gestión de Inventario
        </h1>
        <p style={{ color: '#6e7681', fontSize: '0.88rem', marginBottom: '28px' }}>
          Centro operativo de flujo de mercancía — trazabilidad, rotación y alertas
        </p>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8b949e' }}>
            Cargando inventario...
          </div>
        ) : (
          <>
            {/* ─── NIVEL 1: KPIs ──────────────────────────────── */}
            <div className="inv-kpis">
              <div className="inv-kpi-card accent-green">
                <div className="inv-kpi-label">Valor del Inventario</div>
                <div className="inv-kpi-value green">{formatCurrency(resumen?.valor_total)}</div>
                <div className="inv-kpi-sub">{resumen?.total_productos || 0} productos registrados</div>
              </div>
              <div className="inv-kpi-card accent-red">
                <div className="inv-kpi-label">Alertas de Stock</div>
                <div className={`inv-kpi-value ${resumen?.alertas_stock_bajo > 0 ? 'red' : 'green'}`}>
                  {resumen?.alertas_stock_bajo || 0}
                </div>
                <div className="inv-kpi-sub">
                  {resumen?.sin_stock || 0} sin stock • {(resumen?.alertas_stock_bajo || 0) - (resumen?.sin_stock || 0)} bajo mínimo
                </div>
              </div>
              <div className="inv-kpi-card accent-yellow">
                <div className="inv-kpi-label">Estancados</div>
                <div className={`inv-kpi-value ${resumen?.estancados > 0 ? 'yellow' : 'green'}`}>
                  {resumen?.estancados || 0}
                </div>
                <div className="inv-kpi-sub">Sin ventas en 60 días</div>
              </div>
              <div className="inv-kpi-card accent-blue">
                <div className="inv-kpi-label">Productos Activos</div>
                <div className="inv-kpi-value blue">
                  {(resumen?.total_productos || 0) - (resumen?.estancados || 0) - (resumen?.sin_stock || 0)}
                </div>
                <div className="inv-kpi-sub">Con flujo normal de ventas</div>
              </div>
            </div>

            {/* ─── NIVEL 2: Controles ─────────────────────────── */}
            <div className="inv-controls">
              <input
                className="inv-search"
                type="text"
                placeholder="🔍 Buscar por nombre o categoría..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
              {['TODOS', 'CRITICO', 'ESTANCADO'].map(f => (
                <button
                  key={f}
                  className={`inv-filter-btn ${filtro === f ? 'active' : ''}`}
                  onClick={() => setFiltro(f)}
                >
                  {f === 'TODOS' ? '📋 Todos' : f === 'CRITICO' ? '🚨 Stock Bajo' : '💤 Estancados'}
                </button>
              ))}
            </div>

            {/* ─── NIVEL 3: Tabla de Gestión ──────────────────── */}
            <div className="inv-table-wrap">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Mín.</th>
                    <th>Ventas (30d)</th>
                    <th>Vel. Venta</th>
                    <th>Días Restantes</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="inv-empty">
                          <div className="inv-empty-icon">📦</div>
                          No se encontraron productos con este filtro
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productosFiltrados.map(p => {
                      const speedPct = maxVelocidad > 0 ? Math.min((p.velocidad_diaria / maxVelocidad) * 100, 100) : 0
                      const speedColor = p.velocidad_diaria >= maxVelocidad * 0.6
                        ? '#2dd48b'
                        : p.velocidad_diaria >= maxVelocidad * 0.2
                          ? '#e3b341'
                          : '#484f58'

                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                          <td className="muted">{p.categoria}</td>
                          <td style={{
                            fontWeight: 600,
                            color: p.stock === 0 ? '#f85149' : p.stock <= p.stockMin ? '#e3b341' : '#e6edf3'
                          }}>
                            {p.stock}
                          </td>
                          <td className="muted">{p.stockMin}</td>
                          <td>{p.ventas_30d} uds</td>
                          <td>
                            <div className="inv-speed">
                              <span style={{ fontSize: '0.84rem', minWidth: '44px' }}>
                                {p.velocidad_diaria}/d
                              </span>
                              <div className="inv-speed-bar">
                                <div
                                  className="inv-speed-fill"
                                  style={{ width: `${speedPct}%`, background: speedColor }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            {p.dias_restantes !== null
                              ? <span style={{ color: p.dias_restantes <= 7 ? '#f85149' : p.dias_restantes <= 15 ? '#e3b341' : '#8b949e' }}>
                                  {p.dias_restantes} días
                                </span>
                              : <span className="muted">—</span>
                            }
                          </td>
                          <td>
                            <span className={`inv-badge ${p.estado}`}>
                              {ESTADO_LABELS[p.estado] || p.estado}
                            </span>
                          </td>
                          <td>
                            <button className="inv-action-btn" onClick={() => abrirMovimientos(p.id)} title="Ver historial">
                              📜 Historial
                            </button>
                            <button className="inv-action-btn" onClick={() => abrirAjuste(p)} title="Ajustar stock">
                              ±  Ajustar
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ─── MODAL: Historial de Movimientos (Trazabilidad) ─── */}
      {modalMovimientos !== null && (
        <div className="inv-overlay" onClick={cerrarMovimientos}>
          <div className="inv-modal" onClick={e => e.stopPropagation()}>
            <div className="inv-modal-header">
              <h3>
                📜 Historial — {movimientosData?.producto?.nombre || 'Cargando...'}
              </h3>
              <button className="inv-modal-close" onClick={cerrarMovimientos}>✕</button>
            </div>
            <div className="inv-modal-body">
              {cargandoMov ? (
                <div className="inv-empty">Cargando historial...</div>
              ) : movimientosData?.movimientos?.length === 0 ? (
                <div className="inv-empty">
                  <div className="inv-empty-icon">📭</div>
                  No hay movimientos registrados para este producto
                </div>
              ) : (
                <>
                  <div style={{
                    background: '#0d1117', borderRadius: '10px', padding: '14px 18px',
                    marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '0.78rem', marginBottom: '2px' }}>Stock actual</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{movimientosData?.producto?.stock_actual}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '0.78rem', marginBottom: '2px' }}>Stock mínimo</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#e3b341' }}>{movimientosData?.producto?.stockMin}</div>
                    </div>
                    <div>
                      <div style={{ color: '#8b949e', fontSize: '0.78rem', marginBottom: '2px' }}>Movimientos</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#58a6ff' }}>{movimientosData?.movimientos?.length}</div>
                    </div>
                  </div>

                  <div className="inv-timeline">
                    {movimientosData.movimientos.map(m => (
                      <div className="inv-timeline-item" key={m.id}>
                        <div className={`inv-timeline-dot ${m.tipo}`} />
                        <div className="inv-timeline-header">
                          <span className="inv-timeline-tipo">{TIPO_LABELS[m.tipo] || m.tipo}</span>
                          <span className="inv-timeline-fecha">{timeAgo(m.fecha)}</span>
                        </div>
                        <div className="inv-timeline-detail">
                          <span className={m.cantidad >= 0 ? 'positive' : 'negative'}>
                            {m.cantidad >= 0 ? '+' : ''}{m.cantidad} uds
                          </span>
                          {' → Stock: '}<span>{m.stock_resultante}</span>
                          {m.nota && <span style={{ color: '#6e7681' }}> · {m.nota}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: Ajuste de Inventario ──────────────────────── */}
      {modalAjuste && (
        <div className="inv-overlay" onClick={() => setModalAjuste(null)}>
          <div className="inv-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="inv-modal-header">
              <h3>± Ajustar Stock — {modalAjuste.nombre}</h3>
              <button className="inv-modal-close" onClick={() => setModalAjuste(null)}>✕</button>
            </div>
            <div className="inv-modal-body">
              {ajusteExito ? (
                <div style={{
                  textAlign: 'center', padding: '30px 0',
                  color: '#2dd48b', fontSize: '1rem'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
                  Ajuste registrado exitosamente
                </div>
              ) : (
                <>
                  <div style={{
                    background: '#0d1117', borderRadius: '10px', padding: '12px 16px',
                    marginBottom: '20px', fontSize: '0.88rem', color: '#8b949e'
                  }}>
                    Stock actual: <strong style={{ color: '#e6edf3' }}>{modalAjuste.stock}</strong> · 
                    Mínimo: <strong style={{ color: '#e3b341' }}>{modalAjuste.stockMin}</strong>
                  </div>

                  <div className="inv-form-group">
                    <label>Tipo de Ajuste</label>
                    <select
                      className="inv-form-select"
                      value={ajusteForm.tipo}
                      onChange={e => setAjusteForm({ ...ajusteForm, tipo: e.target.value })}
                    >
                      <option value="ENTRADA_COMPRA">📥 Entrada por compra</option>
                      <option value="AJUSTE_MERMA">📉 Merma / Pérdida</option>
                      <option value="DEVOLUCION">🔄 Devolución de cliente</option>
                    </select>
                  </div>

                  <div className="inv-form-group">
                    <label>Cantidad</label>
                    <input
                      className="inv-form-input"
                      type="number"
                      min="1"
                      placeholder="Ej: 20"
                      value={ajusteForm.cantidad}
                      onChange={e => setAjusteForm({ ...ajusteForm, cantidad: e.target.value })}
                    />
                  </div>

                  <div className="inv-form-group">
                    <label>Nota (opcional)</label>
                    <textarea
                      className="inv-form-textarea"
                      placeholder="Ej: Recepción lote #405 proveedor XYZ"
                      value={ajusteForm.nota}
                      onChange={e => setAjusteForm({ ...ajusteForm, nota: e.target.value })}
                    />
                  </div>

                  {ajusteError && (
                    <div style={{
                      background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.3)',
                      color: '#f85149', borderRadius: '8px', padding: '10px 14px',
                      fontSize: '0.85rem', marginBottom: '12px'
                    }}>
                      {ajusteError}
                    </div>
                  )}

                  <div className="inv-form-actions">
                    <button className="inv-btn-cancel" onClick={() => setModalAjuste(null)}>Cancelar</button>
                    <button className="inv-btn-submit" onClick={enviarAjuste}>Registrar Ajuste</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventario