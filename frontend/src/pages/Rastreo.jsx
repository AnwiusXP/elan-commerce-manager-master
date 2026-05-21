import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { rastrearPedido } from '../services/pedidoService'

const ESTADOS_TIMELINE = [
  { key: 'PENDIENTE_NEQUI', label: 'Pendiente de Pago', icon: '🟡', desc: 'Esperando transferencia Nequi' },
  { key: 'APROBADO', label: 'Pago Verificado', icon: '🟢', desc: 'Pago confirmado — Alistando pedido' },
  { key: 'DESPACHADO', label: 'En Camino', icon: '🔵', desc: 'Tu pedido va en camino a tu hogar' },
  { key: 'ENTREGADO', label: 'Entregado', icon: '🏁', desc: 'Entregado con éxito' },
]

function Rastreo() {
  const [searchParams] = useSearchParams()
  const [guia, setGuia] = useState(searchParams.get('guia') || '')
  const [pedido, setPedido] = useState(null)
  const [error, setError] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [buscado, setBuscado] = useState(false)

  useEffect(() => {
    const guiaParam = searchParams.get('guia')
    if (guiaParam) {
      setGuia(guiaParam)
      buscarPedido(guiaParam)
    }
  }, [])

  async function buscarPedido(guiaBuscar) {
    const g = (guiaBuscar || guia).trim().toUpperCase()
    if (!g) {
      setError('Ingresa un número de guía.')
      return
    }
    setError('')
    setPedido(null)
    setBuscando(true)
    setBuscado(true)

    const res = await rastrearPedido(g)
    setBuscando(false)

    if (res.ok) {
      setPedido(res.data)
    } else {
      setError(res.mensaje)
    }
  }

  function getEstadoIndex(estado) {
    if (estado === 'CANCELADO') return -1
    return ESTADOS_TIMELINE.findIndex(e => e.key === estado)
  }

  const estadoActualIdx = pedido ? getEstadoIndex(pedido.estado) : -1

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Navbar */}
      <div style={{
        background: '#0d1117', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 32px'
      }}>
        <Link to="/" style={{ color: '#e6edf3', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'none' }}>
          ← Élan Pure
        </Link>
        <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>📦 Rastreo de Pedido</span>
      </div>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 20px' }}>
        {/* Search Box */}
        <div style={{
          background: '#fff', borderRadius: '20px', border: '1px solid #e1e4e8',
          padding: '40px', textAlign: 'center', marginBottom: '32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📦</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0d1117', marginBottom: '8px' }}>
            Rastrea tu Pedido
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.92rem', marginBottom: '28px' }}>
            Ingresa tu número de guía para consultar el estado de tu pedido.
          </p>
          <div style={{ display: 'flex', gap: '12px', maxWidth: '480px', margin: '0 auto' }}>
            <input
              type="text" value={guia}
              onChange={e => setGuia(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && buscarPedido()}
              placeholder="ELAN-XXXXXX"
              style={{
                flex: 1, padding: '14px 18px', borderRadius: '12px',
                border: '1px solid #d1d5db', fontSize: '1.1rem',
                fontWeight: '600', letterSpacing: '1px', outline: 'none',
                textAlign: 'center', textTransform: 'uppercase',
                background: '#f9fafb', color: '#0d1117'
              }}
            />
            <button onClick={() => buscarPedido()} disabled={buscando} style={{
              background: buscando ? '#6b7280' : '#0d1117', color: '#fff',
              border: 'none', borderRadius: '12px', padding: '14px 28px',
              fontWeight: '700', fontSize: '0.95rem',
              cursor: buscando ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s', whiteSpace: 'nowrap'
            }}>
              {buscando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
            color: '#dc2626', borderRadius: '12px', padding: '16px 20px',
            fontSize: '0.92rem', textAlign: 'center', marginBottom: '24px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* No results */}
        {buscado && !buscando && !pedido && !error && (
          <div style={{
            background: '#fff', borderRadius: '16px', border: '1px solid #e1e4e8',
            padding: '40px', textAlign: 'center', color: '#6b7280'
          }}>
            No se encontró un pedido con esa guía.
          </div>
        )}

        {/* Pedido Found */}
        {pedido && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Cancelled Banner */}
            {pedido.estado === 'CANCELADO' && (
              <div style={{
                background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
                borderRadius: '16px', padding: '24px', textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>❌</div>
                <h3 style={{ color: '#dc2626', fontWeight: '700', marginBottom: '4px' }}>Pedido Cancelado</h3>
                <p style={{ color: '#6b7280', fontSize: '0.88rem' }}>Este pedido fue cancelado. Contacta soporte si tienes preguntas.</p>
              </div>
            )}

            {/* Timeline */}
            {pedido.estado !== 'CANCELADO' && (
              <div style={{
                background: '#fff', borderRadius: '20px', border: '1px solid #e1e4e8',
                padding: '36px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
              }}>
                <h3 style={{ fontWeight: '700', color: '#0d1117', marginBottom: '28px', fontSize: '1rem' }}>
                  Estado del Pedido — <span style={{ color: '#1e8a5e' }}>{pedido.guia_rastreo}</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {ESTADOS_TIMELINE.map((step, i) => {
                    const isCompleted = i < estadoActualIdx
                    const isActive = i === estadoActualIdx
                    const isPending = i > estadoActualIdx

                    return (
                      <div key={step.key} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                        {/* Vertical Line */}
                        {i < ESTADOS_TIMELINE.length - 1 && (
                          <div style={{
                            position: 'absolute', left: '15px', top: '36px',
                            width: '2px', height: 'calc(100% - 4px)',
                            background: isCompleted ? '#2dd48b' : '#e5e7eb',
                            transition: 'background 0.5s'
                          }} />
                        )}
                        {/* Circle */}
                        <div style={{
                          width: '32px', height: '32px', minWidth: '32px',
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '1rem', zIndex: 1,
                          background: isCompleted ? '#2dd48b' : isActive ? '#0d1117' : '#f3f4f6',
                          color: isCompleted || isActive ? '#fff' : '#9ca3af',
                          border: isActive ? '3px solid #2dd48b' : isPending ? '2px solid #d1d5db' : 'none',
                          transition: 'all 0.5s',
                          boxShadow: isActive ? '0 0 0 4px rgba(45, 212, 139, 0.2)' : 'none',
                          animation: isActive ? 'pulse 2s infinite' : 'none'
                        }}>
                          {isCompleted ? '✓' : step.icon}
                        </div>
                        {/* Text */}
                        <div style={{ paddingBottom: '28px' }}>
                          <div style={{
                            fontWeight: isActive ? '700' : '600',
                            color: isPending ? '#9ca3af' : '#0d1117',
                            fontSize: '0.95rem', marginBottom: '2px'
                          }}>
                            {step.label}
                          </div>
                          <div style={{
                            color: isPending ? '#d1d5db' : '#6b7280',
                            fontSize: '0.82rem'
                          }}>
                            {step.desc}
                          </div>
                          {isActive && pedido.fecha_actualizacion && (
                            <div style={{ color: '#1e8a5e', fontSize: '0.78rem', marginTop: '4px', fontWeight: '600' }}>
                              Actualizado: {new Date(pedido.fecha_actualizacion).toLocaleString('es-CO')}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Order Details */}
            <div style={{
              background: '#fff', borderRadius: '20px', border: '1px solid #e1e4e8',
              padding: '28px', boxShadow: '0 4px 24px rgba(0,0,0,0.04)'
            }}>
              <h3 style={{ fontWeight: '700', color: '#0d1117', marginBottom: '20px', fontSize: '1rem' }}>Detalle del Pedido</h3>
              {pedido.items?.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  marginBottom: '10px', fontSize: '0.9rem', color: '#4b5563',
                  padding: '8px 0', borderBottom: i < pedido.items.length - 1 ? '1px solid #f3f4f6' : 'none'
                }}>
                  <span>{it.nombre_producto} <span style={{ color: '#9ca3af' }}>x{it.cantidad}</span></span>
                  <span style={{ fontWeight: '600' }}>${it.subtotal?.toLocaleString('es-CO')}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '2px solid #e5e7eb', paddingTop: '14px', marginTop: '14px',
                fontSize: '1.1rem', fontWeight: '800', color: '#0d1117'
              }}>
                <span>Total</span>
                <span>${pedido.total?.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', gap: '20px', fontSize: '0.85rem', color: '#6b7280' }}>
                <span>📍 {pedido.ciudad}</span>
                <span>👤 {pedido.cliente_nombre}</span>
              </div>
            </div>

            {/* WhatsApp Support */}
            <div style={{ textAlign: 'center' }}>
              <a href="https://wa.me/573123456789" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                color: '#25d366', textDecoration: 'none', fontWeight: '600',
                fontSize: '0.9rem', padding: '10px 20px',
                border: '1px solid #25d366', borderRadius: '12px',
                transition: 'all 0.2s'
              }}>
                💬 ¿Dudas? Escríbenos por WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(45, 212, 139, 0.2); }
          50% { box-shadow: 0 0 0 8px rgba(45, 212, 139, 0.1); }
        }
      `}</style>
    </div>
  )
}

export default Rastreo
