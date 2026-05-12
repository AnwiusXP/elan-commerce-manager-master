import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkout } from '../services/ventaService'

const BANCOS_MOCK = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco de Occidente',
  'Banco Popular', 'Scotiabank Colpatria', 'Banco Agrario', 'AV Villas', 'TEST_FAIL'
]

function Checkout() {
  const [carrito, setCarrito] = useState([])
  const [metodo, setMetodo] = useState('NEQUI')
  const [cargando, setCargando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Nequi fields
  const [telefono, setTelefono] = useState('')
  // PSE fields
  const [banco, setBanco] = useState('')
  const [tipoPersona, setTipoPersona] = useState('NATURAL')
  const [tipoDoc, setTipoDoc] = useState('CC')
  const [numDoc, setNumDoc] = useState('')

  useEffect(() => {
    const c = JSON.parse(localStorage.getItem('carrito')) || []
    if (c.length === 0) navigate('/carrito')
    setCarrito(c)
  }, [navigate])

  const total = carrito.reduce((a, it) => a + it.precio * it.cantidad, 0)

  function validarFormulario() {
    if (metodo === 'NEQUI') {
      if (!/^3[0-9]{9}$/.test(telefono)) return 'Número Nequi inválido. Debe ser 10 dígitos y comenzar por 3.'
    } else {
      if (!banco) return 'Selecciona un banco.'
      if (!numDoc || numDoc.length < 5) return 'Número de documento inválido (mín. 5 dígitos).'
    }
    return null
  }

  async function handleCheckout() {
    setError('')
    const err = validarFormulario()
    if (err) { 
      alert(err)
      return 
    }

    // Ensure producto_id is a valid integer to avoid Pydantic 422 errors
    const items = carrito.map(it => ({
      producto_id: parseInt(it.id || it.producto_id || 0, 10),
      nombre_producto: it.nombre,
      cantidad: parseInt(it.cantidad || 1, 10),
      precio: parseFloat(it.precio || 0)
    }))

    const pago = metodo === 'NEQUI'
      ? { metodo: 'NEQUI', telefono }
      : { metodo: 'PSE', banco, tipo_persona: tipoPersona, tipo_doc: tipoDoc, num_doc: numDoc }

    setCargando(true)
    const res = await checkout(items, pago)
    setCargando(false)

    if (res.ok) {
      alert('¡Compra Exitosa!')
      localStorage.setItem('carrito', JSON.stringify([]))
      setCarrito([])
      navigate('/')
    } else {
      const msjError = res.mensaje || 'Error al procesar el pago.'
      alert(`Error: ${msjError}`)
      navigate('/')
    }
  }

  // --- Pantalla de éxito (Removida por requisito de alerta + redirección forzosa) ---

  // --- Formulario de Checkout ---
  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ background: '#0d1117', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/carrito" style={{ color: '#e6edf3', fontWeight: '700', fontSize: '1.1rem', textDecoration: 'none' }}>← Volver al Carrito</Link>
        <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>Checkout Seguro 🔒</span>
      </div>

      <div style={{ maxWidth: '960px', margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0d1117', marginBottom: '32px' }}>Información de Pago</h1>

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
          {/* Payment form */}
          <div style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '16px', padding: '32px' }}>
            {/* Method selector */}
            <p style={{ fontWeight: '700', color: '#374151', marginBottom: '16px', fontSize: '0.95rem' }}>Método de pago</p>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '28px' }}>
              {['NEQUI', 'PSE'].map(m => (
                <button key={m} onClick={() => { setMetodo(m); setError('') }} style={{
                  flex: 1, padding: '14px', borderRadius: '10px', cursor: 'pointer',
                  fontWeight: '700', fontSize: '0.95rem', transition: 'all 0.2s',
                  background: metodo === m ? (m === 'NEQUI' ? '#e91e8c' : '#0052cc') : '#f9fafb',
                  color: metodo === m ? '#fff' : '#374151',
                  border: metodo === m ? 'none' : '1px solid #d1d5db'
                }}>
                  {m === 'NEQUI' ? '📱 Nequi' : '🏦 PSE'}
                </button>
              ))}
            </div>

            {/* Nequi form */}
            {metodo === 'NEQUI' && (
              <div>
                <label style={formLabel}>Número de celular Nequi</label>
                <input
                  type="tel" value={telefono} onChange={e => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="3001234567" maxLength={10}
                  style={formInput}
                />
                <span style={formHint}>10 dígitos, debe comenzar por 3</span>
              </div>
            )}

            {/* PSE form */}
            {metodo === 'PSE' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={formLabel}>Banco</label>
                  <select value={banco} onChange={e => setBanco(e.target.value)} style={{ ...formInput, cursor: 'pointer' }}>
                    <option value="">Seleccionar banco...</option>
                    {BANCOS_MOCK.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={formLabel}>Tipo de persona</label>
                    <select value={tipoPersona} onChange={e => setTipoPersona(e.target.value)} style={{ ...formInput, cursor: 'pointer' }}>
                      <option value="NATURAL">Natural</option>
                      <option value="JURIDICA">Jurídica</option>
                    </select>
                  </div>
                  <div>
                    <label style={formLabel}>Tipo de documento</label>
                    <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)} style={{ ...formInput, cursor: 'pointer' }}>
                      <option value="CC">Cédula (CC)</option>
                      <option value="CE">Cédula Extranjería (CE)</option>
                      <option value="NIT">NIT</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={formLabel}>Número de documento</label>
                  <input
                    type="text" value={numDoc} onChange={e => setNumDoc(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234567890" style={formInput}
                  />
                </div>
              </div>
            )}
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
              {cargando ? 'Procesando pago...' : `Pagar $${total.toLocaleString('es-CO')}`}
            </button>
            <p style={{ color: '#9ca3af', fontSize: '0.78rem', textAlign: 'center', marginTop: '12px' }}>
              Entorno de simulación — no se realizan cobros reales.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const formLabel = { display: 'block', fontWeight: '600', color: '#374151', marginBottom: '6px', fontSize: '0.88rem' }
const formInput = { width: '100%', padding: '11px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#f9fafb', color: '#111827' }
const formHint = { display: 'block', color: '#9ca3af', fontSize: '0.78rem', marginTop: '4px' }
const facturaRow = { display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }
const facturaLabel = { color: '#4b5563' }
const facturaValue = { color: '#0d1117', fontWeight: '600' }

export default Checkout
