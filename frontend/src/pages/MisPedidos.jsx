import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarPublico from '../components/NavbarPublico'
import { listarMisPedidos } from '../services/pedidoService'
import { obtenerUsuario, logout } from '../services/authService'

const ESTADO_LABEL = {
  PENDIENTE_NEQUI: 'Pendiente',
  APROBADO: 'Aprobado',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

const ESTADO_COLOR = {
  PENDIENTE_NEQUI: '#f59e0b',
  APROBADO: '#22c55e',
  DESPACHADO: '#8b5cf6',
  ENTREGADO: '#10b981',
  CANCELADO: '#ef4444',
}

function MisPedidos() {
  const [pedidos, setPedidos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [expandidoId, setExpandidoId] = useState(null)
  const [usuario] = useState(obtenerUsuario)
  const navigate = useNavigate()

  useEffect(() => {
    cargarPedidos()
  }, [])

  async function cargarPedidos() {
    setCargando(true)
    const res = await listarMisPedidos()
    if (res.ok) {
      setPedidos(res.data)
    }
    setCargando(false)
  }

  function handleLogout() {
    logout()
    navigate('/')
  }

  return (
    <div className="theme-public-clean" style={{ minHeight: '100vh' }}>
      <NavbarPublico
        totalCarrito={0}
        busqueda=""
        setBusqueda={() => {}}
        showSearch={false}
        usuario={usuario}
        onLogout={handleLogout}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>Mis Pedidos</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Historial de tus compras
            </p>
          </div>
          <button onClick={cargarPedidos} style={{
            background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)', padding: '8px 16px', borderRadius: '8px',
            cursor: 'pointer', fontSize: '0.85rem', transition: 'all 0.2s'
          }}>
            ↻ Refrescar
          </button>
        </div>

        {cargando ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
            Cargando tus pedidos...
          </div>
        ) : pedidos.length === 0 ? (
          <div style={{
            background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '16px',
            padding: '60px 24px', textAlign: 'center', boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
            <h3 style={{ color: 'var(--color-text-main)', marginBottom: '8px' }}>No tienes pedidos aún</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Todos tus pedidos aparecerán aquí después de tu primera compra.
            </p>
            <button onClick={() => navigate('/')} style={{
              background: 'var(--color-primary)', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '10px 24px', fontWeight: '600', cursor: 'pointer'
            }}>
              Explorar Catálogo
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pedidos.map(p => {
              const isExpanded = expandidoId === p.id
              const badgeColor = ESTADO_COLOR[p.estado] || '#6b7280'
              const badgeLabel = ESTADO_LABEL[p.estado] || p.estado

              return (
                <div key={p.id} style={{
                  background: '#ffffff', border: '1px solid var(--color-border)',
                  borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow-sm)'
                }}>
                  <div
                    onClick={() => setExpandidoId(isExpanded ? null : p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '16px 20px',
                      cursor: 'pointer', transition: 'background 0.15s', gap: '16px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ flex: '1', minWidth: 0 }}>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: '600' }}>
                        {p.guia_rastreo}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                      </div>
                    </div>
                    <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '1rem' }}>
                      ${(p.total || 0).toLocaleString('es-CO')}
                    </div>
                    <div>
                      <span style={{
                        border: `1px solid ${badgeColor}40`, color: badgeColor,
                        background: `${badgeColor}10`, padding: '4px 10px', borderRadius: '12px',
                        fontSize: '0.78rem', fontWeight: '600', display: 'inline-block'
                      }}>
                        {badgeLabel}
                      </span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      ▼
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '20px', background: '#f8fafc' }}>
                      <div className="table-responsive" style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                          <thead style={{ background: '#ffffff' }}>
                            <tr>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: '600' }}>Producto</th>
                              <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--color-text-muted)', fontWeight: '600', width: '60px' }}>Cant</th>
                              <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-text-muted)', fontWeight: '600', width: '100px' }}>Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.items?.map((it, i) => (
                              <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                                <td style={{ padding: '10px 14px', color: 'var(--color-text-main)', fontWeight: '500' }}>{it.nombre_producto}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{it.cantidad}</td>
                                <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--color-text-main)', fontWeight: '600' }}>${(it.subtotal || 0).toLocaleString('es-CO')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default MisPedidos
