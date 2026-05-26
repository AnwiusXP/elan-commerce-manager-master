import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, ShieldCheck, Search } from 'lucide-react'

export default function NavbarPublico({ totalCarrito, busqueda, setBusqueda, showSearch = false }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
        <img 
          src="/images/elan-logo.png" 
          alt="Élan Pure" 
          style={{ height: '40px', objectFit: 'contain', filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.05))' }} 
          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} 
        />
        <span style={{ color: 'var(--color-text-main)', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '1px', display: 'none' }}>
          Élan Pure
        </span>
      </Link>

      {/* Search Bar (Opcional) */}
      {showSearch && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar limpiadores, aromatizantes..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              background: 'var(--color-bg-base)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-main)',
              borderRadius: '24px',
              padding: '10px 20px 10px 42px',
              fontSize: '0.95rem',
              width: '320px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--color-brand-primary)';
              e.target.style.boxShadow = '0 0 0 3px rgba(0, 166, 80, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--color-border)';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>
      )}

      {/* Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link to="/carrito" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--color-brand-primary)', textDecoration: 'none', fontSize: '0.95rem', fontWeight: '600',
          background: 'rgba(0, 166, 80, 0.08)', border: '1px solid rgba(0, 166, 80, 0.2)',
          borderRadius: '24px', padding: '8px 18px', transition: 'all 0.2s'
        }}>
          <ShoppingCart size={18} />
          Carrito ({totalCarrito || 0})
        </Link>
        <Link to="/rastreo" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500',
          border: '1px solid var(--color-border)', borderRadius: '24px', padding: '8px 18px',
          transition: 'all 0.2s'
        }}>
          <Package size={18} />
          Rastrear Pedido
        </Link>
        <Link to="/login" style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500',
          border: '1px solid var(--color-border)', borderRadius: '24px', padding: '8px 18px',
          transition: 'all 0.2s'
        }}>
          <ShieldCheck size={18} />
          Admin
        </Link>
      </div>
    </div>
  )
}
