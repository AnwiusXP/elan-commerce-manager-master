import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { crearPedido } from '../services/pedidoService'

function Checkout() {
  const [carrito, setCarrito] = useState([])
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [copiado, setCopiado] = useState(false)
  const navigate = useNavigate()

  // Form fields
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [ciudad, setCiudad] = useState('')
  const [nequiCelular, setNequiCelular] = useState('')

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem('carrito')) || []
    if (c.length === 0) navigate('/carrito')
    setCarrito(c)
  }, [navigate])

  const total = carrito.reduce((a, it) => a + it.precio * it.cantidad, 0)

  function validarFormulario() {
    if (!nombre.trim() || nombre.trim().length < 3) return 'Ingresa tu nombre completo (mínimo 3 caracteres).'
    if (!/^3[0-9]{9}$/.test(telefono)) return 'Teléfono inválido. Debe ser 10 dígitos y comenzar por 3.'
    if (!direccion.trim() || direccion.trim().length < 5) return 'Ingresa una dirección de envío válida.'
    if (!ciudad.trim() || ciudad.trim().length < 2) return 'Ingresa la ciudad de destino.'
    if (!/^3[0-9]{9}$/.test(nequiCelular)) return 'Número Nequi inválido. Debe ser 10 dígitos y comenzar por 3.'
    return null
  }

  async function handleCheckout() {
    setError('')
    const err = validarFormulario()
    if (err) {
      setError(err)
      return
    }

    const items = carrito.map(it => ({
      producto_id: parseInt(it.id || it.producto_id || 0, 10),
      cantidad: parseInt(it.cantidad || 1, 10),
    }))

    setCargando(true)
    const res = await crearPedido({
      cliente_nombre: nombre.trim(),
      cliente_telefono: telefono,
      cliente_direccion: direccion.trim(),
      cliente_ciudad: ciudad.trim(),
      nequi_celular: nequiCelular,
      items,
    })
    setCargando(false)

    if (res.ok) {
      localStorage.setItem('carrito', JSON.stringify([]))
      setCarrito([])
      setResultado(res.data)
    } else {
      setError(res.mensaje || 'Error al procesar el pedido.')
    }
  }

  function copiarGuia() {
    if (resultado?.guia_rastreo) {
      navigator.clipboard.writeText(resultado.guia_rastreo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  // --- Pantalla de Confirmación de Pedido ---
  if (resultado) {
    return (
      <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
        <div style={{ background: '#0d1117', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ color: '#e6edf3', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'none' }}>← Élan Pure</Link>
          <span style={{ color: '#2dd48b', fontSize: '0.9rem', fontWeight: '600' }}>✅ Pedido Registrado</span>
        </div>

        <div style={{ maxWidth: '680px', margin: '48px auto', padding: '0 20px' }}>
          {/* Success Card */}
          <div style={{
            background: '#fff', border: '1px solid #e1e4e8', borderRadius: '20px',
            padding: '48px 40px', textAlign: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>🎉</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0d1117', marginBottom: '8px' }}>
              ¡Pedido Registrado Exitosamente!
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '32px' }}>
              Tu pedido ha sido recibido. Sigue los pasos para confirmar tu pago por Nequi.
            </p>

            {/* Tracking Number */}
            <div style={{
              background: 'linear-gradient(135deg, #0d1117 0%, #1a2332 100%)',
              borderRadius: '16px', padding: '28px', marginBottom: '32px',
              color: '#e6edf3'
            }}>
              <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8b949e', marginBottom: '8px' }}>
                Tu Número de Guía
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800', letterSpacing: '3px', marginBottom: '12px', color: '#2dd48b' }}>
                {resultado.guia_rastreo}
              </div>
              <button onClick={copiarGuia} style={{
                background: copiado ? '#2dd48b' : 'rgba(255,255,255,0.1)',
                color: copiado ? '#0d1117' : '#e6edf3',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '8px', padding: '8px 20px', cursor: 'pointer',
                fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.3s'
              }}>
                {copiado ? '✅ Copiado' : '📋 Copiar Guía'}
              </button>
            </div>

            {/* Payment Instructions */}
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16px',
              padding: '28px', textAlign: 'left', marginBottom: '32px'
            }}>
              <h3 style={{ color: '#166534', fontWeight: '700', marginBottom: '20px', fontSize: '1rem' }}>
                📱 Instrucciones de Pago por Nequi
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    background: '#1e8a5e', color: '#fff', borderRadius: '50%',
                    width: '28px', height: '28px', minWidth: '28px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem'
                  }}>1</div>
                  <p style={{ color: '#374151', fontSize: '0.92rem', margin: 0, lineHeight: '1.5' }}>
                    Abre tu app <strong>Nequi</strong> y selecciona <strong>"Enviar plata"</strong>.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    background: '#1e8a5e', color: '#fff', borderRadius: '50%',
                    width: '28px', height: '28px', minWidth: '28px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem'
                  }}>2</div>
                  <p style={{ color: '#374151', fontSize: '0.92rem', margin: 0, lineHeight: '1.5' }}>
                    Envía el total de <strong style={{ color: '#1e8a5e' }}>${resultado.total?.toLocaleString('es-CO')}</strong> al número de Nequi:
                    <span style={{
                      display: 'block', background: '#dcfce7', borderRadius: '8px',
                      padding: '8px 14px', marginTop: '8px', fontWeight: '700',
                      fontSize: '1.1rem', color: '#166534', letterSpacing: '1px'
                    }}>
                      📞 {resultado.nequi_duena}
                    </span>
                    <span style={{ display: 'block', color: '#6b7280', fontSize: '0.82rem', marginTop: '4px' }}>
                      A nombre de: {resultado.propietario_nequi}
                    </span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    background: '#1e8a5e', color: '#fff', borderRadius: '50%',
                    width: '28px', height: '28px', minWidth: '28px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem'
                  }}>3</div>
                  <p style={{ color: '#374151', fontSize: '0.92rem', margin: 0, lineHeight: '1.5' }}>
                    Una vez verificado tu pago, <strong>aprobaremos tu pedido</strong> y lo enviaremos a tu dirección.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to={`/rastreo?guia=${resultado.guia_rastreo}`} style={{
                background: '#1e8a5e', color: '#fff', textDecoration: 'none',
                borderRadius: '12px', padding: '14px 28px', fontWeight: '700',
                fontSize: '0.95rem', transition: 'background 0.2s', display: 'inline-flex',
                alignItems: 'center', gap: '8px'
              }}>
                📦 Rastrear Mi Pedido
              </Link>
              <Link to="/" style={{
                background: '#f9fafb', color: '#374151', textDecoration: 'none',
                border: '1px solid #d1d5db', borderRadius: '12px', padding: '14px 28px',
                fontWeight: '600', fontSize: '0.95rem', transition: 'all 0.2s'
              }}>
                ← Volver al Catálogo
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Formulario de Checkout ---
  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ background: '#0d1117', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/carrito" style={{ color: '#e6edf3', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'none' }}>← Volver al Carrito</Link>
        <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>Nequi Contra Entrega 📱</span>
      </div>

      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0d1117', marginBottom: '32px' }}>Datos de Envío y Pago</h1>

        {error && (
          <div style={{
            background: 'rgba(248,81,73,0.08)', border: '1px solid rgba(248,81,73,0.3)',
            color: '#dc2626', borderRadius: '10px', padding: '14px 18px',
            fontSize: '0.9rem', marginBottom: '24px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '28px', alignItems: 'start' }}>
          {/* Shipping + Payment Form */}
          <div style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '16px', padding: '32px' }}>
            <p style={{ fontWeight: '700', color: '#374151', marginBottom: '20px', fontSize: '0.95rem' }}>📍 Información de envío</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div>
                <label style={formLabel}>Nombre completo</label>
                <input
                  type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                  placeholder="Carlos Gómez" style={formInput}
                />
              </div>
              <div>
                <label style={formLabel}>Teléfono de contacto</label>
                <input
                  type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3001234567" maxLength={10} style={formInput}
                />
                <span style={formHint}>10 dígitos, debe comenzar por 3</span>
              </div>
              <div>
                <label style={formLabel}>Dirección de envío</label>
                <input
                  type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                  placeholder="Calle 45 #12-34, Barrio Centro" style={formInput}
                />
              </div>
              <div>
                <label style={formLabel}>Ciudad</label>
                <input
                  type="text" value={ciudad} onChange={e => setCiudad(e.target.value)}
                  placeholder="Bogotá" style={formInput}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
              <p style={{ fontWeight: '700', color: '#374151', marginBottom: '16px', fontSize: '0.95rem' }}>📱 Pago por Nequi</p>
              <div>
                <label style={formLabel}>Celular Nequi desde el que transferirás</label>
                <input
                  type="tel" value={nequiCelular} onChange={e => setNequiCelular(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3009876543" maxLength={10} style={formInput}
                />
                <span style={formHint}>10 dígitos. Este será el número desde el que enviarás el pago.</span>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '16px', padding: '28px', position: 'sticky', top: '20px' }}>
            <h3 style={{ fontWeight: '700', color: '#0d1117', marginBottom: '20px', fontSize: '1rem' }}>Resumen del pedido</h3>
            {carrito.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.88rem', color: '#4b5563' }}>
                <span>{it.nombre} <span style={{ color: '#9ca3af' }}>x{it.cantidad}</span></span>
                <span style={{ fontWeight: '600' }}>${(it.precio * it.cantidad).toLocaleString('es-CO')}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e5e7eb',
              paddingTop: '14px', marginTop: '14px', fontSize: '1.1rem', fontWeight: '800', color: '#0d1117'
            }}>
              <span>Total</span>
              <span>${total.toLocaleString('es-CO')}</span>
            </div>
            <button onClick={handleCheckout} disabled={cargando} style={{
              width: '100%', marginTop: '20px', padding: '14px',
              background: cargando ? '#6b7280' : '#1e8a5e', color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: '700',
              fontSize: '0.95rem', cursor: cargando ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}>
              {cargando ? 'Procesando pedido...' : `Confirmar Pedido — $${total.toLocaleString('es-CO')}`}
            </button>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center',
              marginTop: '14px', color: '#9ca3af', fontSize: '0.78rem'
            }}>
              <span>📱</span>
              <span>Pago seguro por Nequi Contra Entrega</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const formLabel = { display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '0.88rem' }
const formInput = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#f9fafb', color: '#111827' }
const formHint = { display: 'block', color: '#9ca3af', fontSize: '0.78rem', marginTop: '4px' }

export default Checkout
