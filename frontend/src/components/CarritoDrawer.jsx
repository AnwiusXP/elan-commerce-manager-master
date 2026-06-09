import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCarrito } from '../context/CarritoContext';
import ProductImage from './ProductImage';

export default function CarritoDrawer() {
  const { carrito, totalPrecio, eliminarDelCarrito, drawerAbierto, cerrarDrawer } = useCarrito();
  const navigate = useNavigate();

  // Cerrar con Escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') cerrarDrawer();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [cerrarDrawer]);

  const irACheckout = () => {
    cerrarDrawer();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay oscuro */}
      {drawerAbierto && (
        <div
          onClick={cerrarDrawer}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(13, 17, 23, 0.5)',
            zIndex: 1000,
            transition: 'opacity 0.3s ease'
          }}
        />
      )}

      {/* Panel lateral */}
      <div
        className="carrito-drawer"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: '380px', maxWidth: '100%',
          background: '#fff',
          zIndex: 1001,
          boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
          transform: drawerAbierto ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          display: 'flex', flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--color-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--color-bg-light)'
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-main)', margin: 0 }}>
            Tu Carrito 🛍️
          </h2>
          <button
            onClick={cerrarDrawer}
            style={{
              background: 'none', border: 'none', fontSize: '1.5rem',
              color: 'var(--color-text-muted)', cursor: 'pointer', lineHeight: '1'
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {carrito.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '40px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🛒</div>
              <p>Tu carrito está vacío.</p>
              <button
                onClick={cerrarDrawer}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-brand-primary)',
                  fontWeight: '600', cursor: 'pointer', marginTop: '12px'
                }}
              >
                ← Seguir comprando
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {carrito.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', gap: '16px', alignItems: 'center',
                  padding: '12px', background: '#fff',
                  border: '1px solid var(--color-border)', borderRadius: '12px'
                }}>
                  <div style={{
                    width: '60px', height: '60px', background: '#f8f9fa',
                    borderRadius: '8px', overflow: 'hidden', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <ProductImage id={item.producto_id} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>{item.nombre}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cant: {item.cantidad}</div>
                    <div style={{ color: 'var(--color-brand-primary)', fontWeight: '700', fontSize: '0.95rem' }}>
                      ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                    </div>
                  </div>

                  <button
                    onClick={() => eliminarDelCarrito(idx)}
                    style={{
                      background: 'rgba(248,81,73,0.1)', border: 'none',
                      color: '#f85149', borderRadius: '50%', width: '32px', height: '32px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0
                    }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {carrito.length > 0 && (
          <div style={{
            padding: '24px', borderTop: '1px solid var(--color-border)',
            background: 'var(--color-bg-light)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-text-muted)' }}>Subtotal</span>
              <span style={{ fontWeight: '700', color: 'var(--color-brand-primary)', fontSize: '1.2rem' }}>
                ${totalPrecio.toLocaleString('es-CO')}
              </span>
            </div>
            
            <button
              onClick={irACheckout}
              style={{
                width: '100%', padding: '14px', background: 'var(--color-brand-primary)',
                color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1.05rem',
                fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = 'var(--color-brand-primary-hover)'}
              onMouseLeave={(e) => e.target.style.background = 'var(--color-brand-primary)'}
            >
              Ir al Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
