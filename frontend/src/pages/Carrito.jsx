import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import NavbarPublico from '../components/NavbarPublico'
import ProductImage from '../components/ProductImage'
import { obtenerUsuario, logout } from '../services/authService'
import { useCarrito } from '../context/CarritoContext'
import CarritoDrawer from '../components/CarritoDrawer'

function Carrito() {
  const { carrito, totalPrecio: total, eliminarDelCarrito: eliminar } = useCarrito()
  const [usuario] = useState(obtenerUsuario)
  const navigate = useNavigate()

  function irACheckout() {
    if (carrito.length === 0) return
    navigate('/checkout')
  }

  return (
    <div className="theme-public-clean">

      <NavbarPublico showSearch={false} usuario={usuario} onLogout={() => { logout(); navigate('/') }} />

      <div className="cart-page-content" style={{ padding: '40px 32px' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#0d1117', marginBottom: '28px' }}>
          Mi carrito
        </h1>

        {carrito.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8b949e' }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>🛒</div>
            <div>Tu carrito está vacío.</div>
            <Link to="/" style={{ color: 'var(--color-brand-primary)', textDecoration: 'none', marginTop: '12px', display: 'inline-block' }}>
              ← Ver productos
            </Link>
          </div>
        ) : (
          <div className="cart-page-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div>
              {carrito.map((it, i) => (
                <div key={i} className="cart-page-item" style={{
                  background: '#fff', border: '1px solid #e1e4e8', borderRadius: '10px',
                  padding: '16px 20px', marginBottom: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div className="cart-page-item-info" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    {/* Thumbnail */}
                    <div style={{ width: '60px', height: '60px', background: '#f8f9fa', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #eee' }}>
                      <ProductImage 
                        id={it.producto_id || it.id} 
                        alt={it.nombre} 
                        style={{ width: '100%', height: '100%', borderRadius: '0' }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0d1117', marginBottom: '4px' }}>{it.nombre}</div>
                      <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Cantidad: {it.cantidad}</div>
                      <div style={{ color: 'var(--color-brand-primary)', fontWeight: '700' }}>${it.precio.toLocaleString('es-CO')}</div>
                    </div>
                  </div>
                  <button onClick={() => eliminar(i)} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '1.1rem' }}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary" style={{ background: '#fff', border: '1px solid #e1e4e8', borderRadius: '12px', padding: '24px', height: 'fit-content' }}>
              <h6 style={{ fontWeight: '700', color: '#0d1117', marginBottom: '16px' }}>Resumen</h6>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Subtotal</span><span>${total.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-brand-primary)', fontSize: '1.1rem', fontWeight: '700', borderTop: '1px solid #e1e4e8', paddingTop: '12px' }}>
                <span>Total</span><span>${total.toLocaleString('es-CO')}</span>
              </div>
              <button onClick={irACheckout} style={{
                background: 'var(--color-brand-primary)', border: 'none', color: '#fff',
                borderRadius: '8px', padding: '12px', fontWeight: '600',
                width: '100%', marginTop: '16px', cursor: 'pointer', fontSize: '0.95rem'
              }}>
                Proceder al Pago
              </button>
            </div>
          </div>
        )}
      </div>
      <CarritoDrawer />
    </div>
  )
}

export default Carrito
