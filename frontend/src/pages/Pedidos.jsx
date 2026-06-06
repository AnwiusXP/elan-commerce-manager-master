import { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { listarPedidosAdmin, aprobarPedidoAdmin, cambiarEstadoPedidoAdmin } from '../services/pedidoService'
import { ArrowLeft } from 'lucide-react'

function Pedidos() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivo, setFiltroActivo] = useState('TODOS')
  const [error, setError] = useState('')
  const [expandidoId, setExpandidoId] = useState(null)
  const [mobilePanelId, setMobilePanelId] = useState(null)

  const TABS = [
    { key: 'TODOS', label: 'Todos', apiStatus: null },
    { key: 'PENDIENTE_NEQUI', label: 'Pendientes', color: '#f59e0b' },
    { key: 'APROBADO', label: 'Aprobados', color: '#22c55e' },
    { key: 'DESPACHADO', label: 'Despachados', color: '#8b5cf6' },
    { key: 'ENTREGADO', label: 'Entregados', color: '#10b981' },
    { key: 'CANCELADO', label: 'Cancelados', color: '#ef4444' },
  ]

  useEffect(() => {
    cargarPedidos()
  }, [])

  async function cargarPedidos() {
    setCargando(true)
    setError('')
    const res = await listarPedidosAdmin()
    if (res.ok) {
      setPedidos(res.data)
    } else {
      setError(res.mensaje)
    }
    setCargando(false)
  }

  async function handleAccion(pedidoId, accion, estadoActual) {
    setError('')
    
    if (accion === 'CANCELAR') {
      if (!window.confirm('¿Seguro que deseas cancelar este pedido? Esta acción no se puede deshacer.')) return
      
      const res = await cambiarEstadoPedidoAdmin(pedidoId, 'CANCELADO')
      if (res.ok) {
        cargarPedidos()
      } else {
        setError(res.mensaje)
      }
      return
    }

    if (accion === 'APROBAR') {
      const res = await aprobarPedidoAdmin(pedidoId)
      if (res.ok) {
        cargarPedidos()
      } else {
        setError(res.mensaje)
      }
      return
    }

    if (accion === 'DESPACHAR') {
      const res = await cambiarEstadoPedidoAdmin(pedidoId, 'DESPACHADO')
      if (res.ok) {
        cargarPedidos()
      } else {
        setError(res.mensaje)
      }
      return
    }

    if (accion === 'ENTREGAR') {
      const res = await cambiarEstadoPedidoAdmin(pedidoId, 'ENTREGADO')
      if (res.ok) {
        cargarPedidos()
      } else {
        setError(res.mensaje)
      }
      return
    }
  }

  function toggleExpandir(id) {
    setExpandidoId(expandidoId === id ? null : id)
  }

  // Filtrado local
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroActivo === 'TODOS') return true
    return p.estado === filtroActivo
  })

  // Conteo para los tabs
  const conteos = pedidos.reduce((acc, p) => {
    acc['TODOS'] = (acc['TODOS'] || 0) + 1
    acc[p.estado] = (acc[p.estado] || 0) + 1
    return acc
  }, {})

  function getBadgeColor(estado) {
    const tab = TABS.find(t => t.key === estado)
    return tab?.color || '#8b949e'
  }

  return (
    <div className="admin-layout" style={{ display: 'flex', background: '#0d1117', minHeight: '100vh', color: '#c9d1d9' }}>
      <Sidebar active="Pedidos" />
      <div className="admin-content">
        
        <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0, color: '#e6edf3' }}>
              Gestión de Pedidos
            </h1>
            <p style={{ color: '#8b949e', margin: '4px 0 0 0', fontSize: '0.9rem' }}>
              Total registrados: {pedidos.length}
            </p>
          </div>
          <button onClick={cargarPedidos} style={{
            background: '#21262d', border: '1px solid #30363d', color: '#c9d1d9',
            padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem'
          }}>
            ↻ Refrescar
          </button>
        </div>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)',
            color: '#ff7b72', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ 
          display: 'flex', gap: '8px', borderBottom: '1px solid #30363d', marginBottom: '24px',
          overflowX: 'auto', paddingBottom: '1px'
        }}>
          {TABS.map(tab => {
            const count = conteos[tab.key] || 0
            const isActive = filtroActivo === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setFiltroActivo(tab.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? `2px solid ${tab.color || '#58a6ff'}` : '2px solid transparent',
                  padding: '12px 16px',
                  color: isActive ? '#e6edf3' : '#8b949e',
                  fontWeight: isActive ? '600' : '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
              >
                {tab.color && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: tab.color }}></span>}
                {tab.label}
                <span style={{ 
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                  padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '600' 
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Mobile list (ID/Guía) */}
        <div className="admin-mobile-list">
          {pedidosFiltrados.map(p => (
            <div key={p.id} className="admin-mobile-item" onClick={() => setMobilePanelId(p.id)}>
              <div className="meta">
                <div className="line-1">{p.guia_rastreo}</div>
                <div className="line-2">{p.cliente_nombre} · ${p.total?.toLocaleString('es-CO')}</div>
              </div>
              <div style={{ color: getBadgeColor(p.estado), fontWeight: 700 }}>{TABS.find(t => t.key === p.estado)?.label || p.estado}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="table-responsive" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflowX: 'auto' }}>
          <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid #30363d', fontWeight: '600', color: '#8b949e', fontSize: '0.85rem' }}>
            <div style={{ width: '130px' }}>Guía</div>
            <div style={{ flex: 1 }}>Cliente</div>
            <div style={{ width: '120px' }}>Ciudad</div>
            <div style={{ width: '120px' }}>Total</div>
            <div style={{ width: '140px' }}>Estado</div>
            <div style={{ width: '150px' }}>Fecha</div>
            <div style={{ width: '180px', textAlign: 'center' }}>Acciones</div>
          </div>

          {cargando ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>Cargando pedidos...</div>
          ) : pedidosFiltrados.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#8b949e' }}>No hay pedidos en este estado.</div>
          ) : (
            pedidosFiltrados.map(p => {
              const isExpanded = expandidoId === p.id
              const badgeColor = getBadgeColor(p.estado)
              
              return (
                <div key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                  {/* Fila principal */}
                  <div 
                    onClick={() => toggleExpandir(p.id)}
                    style={{ 
                      display: 'flex', padding: '16px', alignItems: 'center', fontSize: '0.9rem',
                      background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'}
                  >
                    <div style={{ width: '130px', fontFamily: 'monospace', color: '#58a6ff' }}>{p.guia_rastreo}</div>
                    <div style={{ flex: 1, fontWeight: '600', color: '#e6edf3' }}>{p.cliente_nombre}</div>
                    <div style={{ width: '120px' }}>{p.cliente_ciudad}</div>
                    <div style={{ width: '120px', fontWeight: '600' }}>${p.total?.toLocaleString('es-CO')}</div>
                    <div style={{ width: '140px' }}>
                      <span style={{ 
                        border: `1px solid ${badgeColor}40`, color: badgeColor, background: `${badgeColor}10`,
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {TABS.find(t => t.key === p.estado)?.label || p.estado}
                      </span>
                    </div>
                    <div style={{ width: '150px', fontSize: '0.8rem', color: '#8b949e' }}>
                      {p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString('es-CO') : ''}
                    </div>
                    <div style={{ width: '180px', display: 'flex', gap: '8px', justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                      {p.estado === 'PENDIENTE_NEQUI' && (
                        <button onClick={() => handleAccion(p.id, 'APROBAR')} style={btnAction('#2ea043', '#fff')}>✅ Aprobar Pago</button>
                      )}
                      {p.estado === 'APROBADO' && (
                        <button onClick={() => handleAccion(p.id, 'DESPACHAR')} style={btnAction('#8b5cf6', '#fff')}>🚚 Despachar</button>
                      )}
                      {p.estado === 'DESPACHADO' && (
                        <button onClick={() => handleAccion(p.id, 'ENTREGAR')} style={btnAction('#10b981', '#fff')}>📦 Entregar</button>
                      )}
                      
                      {['PENDIENTE_NEQUI', 'APROBADO', 'DESPACHADO'].includes(p.estado) && (
                        <button 
                          onClick={() => handleAccion(p.id, 'CANCELAR')} 
                          style={{ ...btnAction('transparent', '#f85149'), border: '1px solid rgba(248,81,73,0.3)', padding: '6px' }}
                          title="Cancelar Pedido"
                        >
                          ❌
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fila expandida */}
                  {isExpanded && (
                    <div style={{ background: '#0d1117', padding: '24px', borderTop: '1px solid #30363d' }}>
                      <div className="admin-split-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                        
                        {/* Datos de envío y Nequi */}
                        <div>
                          <h4 style={{ color: '#e6edf3', margin: '0 0 16px 0', fontSize: '0.95rem' }}>Datos del Cliente</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.85rem', color: '#8b949e' }}>
                            <div>Teléfono:</div><div style={{ color: '#c9d1d9' }}>{p.cliente_telefono}</div>
                            <div>Dirección:</div><div style={{ color: '#c9d1d9' }}>{p.cliente_direccion}</div>
                            <div>Ciudad:</div><div style={{ color: '#c9d1d9' }}>{p.cliente_ciudad}</div>
                            {p.cliente_email && <><div>Email:</div><div style={{ color: '#c9d1d9' }}>{p.cliente_email}</div></>}
                          </div>

                          <h4 style={{ color: '#e6edf3', margin: '24px 0 16px 0', fontSize: '0.95rem' }}>Información de Pago</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '0.85rem', color: '#8b949e' }}>
                            <div>Celular Nequi:</div><div style={{ color: '#c9d1d9', fontWeight: '600' }}>📞 {p.nequi_celular}</div>
                            <div>Actualizado:</div><div style={{ color: '#c9d1d9' }}>{p.fecha_actualizacion ? new Date(p.fecha_actualizacion).toLocaleString('es-CO') : ''}</div>
                          </div>
                        </div>

                        {/* Items del pedido */}
                        <div>
                          <h4 style={{ color: '#e6edf3', margin: '0 0 16px 0', fontSize: '0.95rem' }}>Productos</h4>
                          <div className="table-responsive" style={{ border: '1px solid #30363d', borderRadius: '8px', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <thead style={{ background: '#161b22', color: '#8b949e', textAlign: 'left' }}>
                                <tr>
                                  <th style={{ padding: '8px 12px', fontWeight: '600' }}>Item</th>
                                  <th style={{ padding: '8px 12px', fontWeight: '600', width: '50px', textAlign: 'center' }}>Cant</th>
                                  <th style={{ padding: '8px 12px', fontWeight: '600', width: '90px', textAlign: 'right' }}>Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.items?.map((it, i) => (
                                  <tr key={i} style={{ borderTop: '1px solid #30363d' }}>
                                    <td style={{ padding: '8px 12px', color: '#c9d1d9' }}>{it.nombre_producto}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#8b949e' }}>{it.cantidad}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', color: '#e6edf3', fontWeight: '600' }}>${it.subtotal?.toLocaleString('es-CO')}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Mobile full-screen panel */}
        {mobilePanelId && (() => {
          const p = pedidos.find(x => x.id === mobilePanelId)
          if (!p) return null
          return (
            <div className="admin-mobile-panel-overlay" onClick={() => setMobilePanelId(null)}>
              <div className="admin-mobile-panel" onClick={e => e.stopPropagation()}>
                <div className="panel-header">
                  <button onClick={() => setMobilePanelId(null)} style={{ background: 'none', border: 'none', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Volver
                  </button>
                  <div style={{ fontWeight: 700, color: '#e6edf3' }}>{p.guia_rastreo}</div>
                </div>
                <div>
                  <h4 style={{ marginTop: 8, marginBottom: 6, color: '#e6edf3' }}>Cliente</h4>
                  <div style={{ color: '#c9d1d9', marginBottom: 12 }}>{p.cliente_nombre} · {p.cliente_ciudad}</div>

                  <h4 style={{ marginTop: 8, marginBottom: 6, color: '#e6edf3' }}>Productos</h4>
                  <div style={{ marginBottom: 12 }}>
                    {p.items?.map((it, i) => (
                      <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #21262d' }}>
                        <div style={{ fontWeight: 700, color: '#e6edf3' }}>{it.nombre_producto}</div>
                        <div style={{ color: '#8b949e' }}>{it.cantidad} × ${it.subtotal?.toLocaleString('es-CO')}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    {p.estado === 'PENDIENTE_NEQUI' && (
                      <button onClick={async () => { await aprobarPedidoAdmin(p.id); setMobilePanelId(null); cargarPedidos() }} style={{ background: '#2ea043', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8 }}>Aprobar</button>
                    )}
                    <button onClick={() => { setMobilePanelId(null); }} style={{ background: 'transparent', color: '#8b949e', border: '1px solid #30363d', padding: '10px 14px', borderRadius: 8 }}>Cerrar</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

      </div>
    </div>
  )
}

const btnAction = (bg, color) => ({
  background: bg,
  color: color,
  border: 'none',
  borderRadius: '6px',
  padding: '6px 12px',
  fontSize: '0.75rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'opacity 0.2s',
})

export default Pedidos
