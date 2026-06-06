import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Package, LogIn, Search, ChevronDown, PackageOpen, LogOut, Menu, X, User } from 'lucide-react'
import { useCarrito } from '../context/CarritoContext'

export default function NavbarPublico({ busqueda, setBusqueda, showSearch = false, usuario = null, onLogout }) {
  const { totalItems, abrirDrawer } = useCarrito()
  const [menuAbierto, setMenuAbierto] = useState(false)       // dropdown usuario (desktop)
  const [mobileMenuAbierto, setMobileMenuAbierto] = useState(false) // menú móvil completo
  const menuRef = useRef(null)
  const navigate = useNavigate()

  // Cierra dropdown de usuario si se hace click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cierra el menú móvil al navegar
  function handleMobileNav(path) {
    setMobileMenuAbierto(false)
    navigate(path)
  }

  function handleMobileLogout() {
    setMobileMenuAbierto(false)
    if (onLogout) onLogout()
  }

  function handleAbrirDrawer() {
    setMobileMenuAbierto(false)
    abrirDrawer()
  }

  const rolLabel = usuario?.role === 'distribuidor' ? 'Distribuidor' : 'Cliente'
  const userInitial = usuario?.email ? usuario.email.charAt(0).toUpperCase() : '?'

  // Dropdown usuario (desktop)
  const dropdownMenu = menuAbierto && (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      background: '#ffffff', border: '1px solid var(--color-border)',
      borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
      minWidth: '220px', padding: '8px 0', zIndex: 200
    }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontWeight: '600', color: 'var(--color-text-main)', fontSize: '0.9rem' }}>{usuario?.email}</div>
        <span style={{
          display: 'inline-block', marginTop: '4px',
          background: usuario?.role === 'distribuidor' ? 'rgba(0,255,204,0.1)' : 'rgba(0,162,154,0.1)',
          color: usuario?.role === 'distribuidor' ? '#0d9488' : 'var(--color-primary)',
          border: '1px solid ' + (usuario?.role === 'distribuidor' ? 'rgba(0,255,204,0.3)' : 'var(--color-primary-border)'),
          borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: '600'
        }}>
          {rolLabel}
        </span>
      </div>
      <button
        onClick={() => { setMenuAbierto(false); navigate('/mis-pedidos') }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.9rem', color: 'var(--color-text-main)', transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <PackageOpen size={16} style={{ color: 'var(--color-text-muted)' }} />
        Mis Pedidos / Compras
      </button>
      <button
        onClick={() => { setMenuAbierto(false); navigate('/mis-datos') }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.9rem', color: 'var(--color-text-main)', transition: 'background 0.15s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <User size={16} style={{ color: 'var(--color-text-muted)' }} />
        Mis Datos
      </button>
      <button
        onClick={() => { setMenuAbierto(false); if (onLogout) onLogout() }}
        style={{
          display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: '0.9rem', color: '#dc2626', transition: 'background 0.15s',
          borderTop: '1px solid #e5e7eb', marginTop: '4px', paddingTop: '12px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
      >
        <LogOut size={16} />
        Cerrar Sesión
      </button>
    </div>
  )

  return (
    <div className="navbar-publico" style={{
      background: 'var(--color-bg-card)',
      display: 'flex',
      alignItems: 'center',
      padding: '14px 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      borderBottom: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)',
      flexWrap: 'wrap',
      gap: '8px'
    }}>

      {/* Left: Logo */}
      <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
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
      </div>

      {/* Center: Search Bar (solo desktop) */}
      {showSearch && (
        <div className="navbar-search" style={{ flex: '1 1 auto', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '420px' }}>
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
                width: '100%',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--color-brand-primary)';
                e.target.style.boxShadow = '0 0 0 3px var(--color-focus-ring)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--color-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Right: Acciones Desktop */}
      <div className="navbar-desktop-actions" style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Botón carrito */}
        <button onClick={handleAbrirDrawer} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          color: 'var(--color-brand-primary)', fontSize: '0.95rem', fontWeight: '600',
          background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary-border)',
          borderRadius: '24px', padding: '8px 18px', transition: 'all 0.2s', cursor: 'pointer'
        }}>
          <ShoppingCart size={18} />
          Carrito ({totalItems || 0})
        </button>

        {/* Usuario logueado */}
        {usuario ? (
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuAbierto(!menuAbierto)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                color: 'var(--color-text-main)', fontSize: '0.9rem', fontWeight: '500',
                border: '1px solid var(--color-border)', borderRadius: '24px',
                padding: '6px 16px 6px 6px', cursor: 'pointer', transition: 'all 0.2s',
                background: menuAbierto ? '#f3f4f6' : 'transparent'
              }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: 'var(--color-primary)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.85rem', fontWeight: '700'
              }}>
                {userInitial}
              </div>
              <ChevronDown size={16} style={{
                color: 'var(--color-text-muted)',
                transform: menuAbierto ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s'
              }} />
            </button>
            {dropdownMenu}
          </div>
        ) : (
          <>
            <Link to="/rastreo" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '500',
              border: '1px solid var(--color-border)', borderRadius: '24px', padding: '8px 18px',
              transition: 'all 0.2s'
            }}>
              <Package size={18} />
              Rastrear
            </Link>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--color-brand-primary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600',
              background: 'var(--color-primary-soft)', border: '1px solid var(--color-primary-border)',
              borderRadius: '24px', padding: '8px 18px', transition: 'all 0.2s'
            }}>
              <LogIn size={18} />
              Iniciar sesión
            </Link>
          </>
        )}
      </div>

      {/* Right: Acciones Móvil (solo visibles en pantallas pequeñas) */}
      <div className="navbar-mobile-actions" style={{ flex: '0 0 auto', display: 'none', alignItems: 'center', gap: '8px' }}>
        {/* Icono carrito móvil con badge */}
        <button onClick={handleAbrirDrawer} style={{
          position: 'relative', background: 'none', border: 'none',
          color: 'var(--color-brand-primary)', cursor: 'pointer', padding: '8px'
        }}>
          <ShoppingCart size={26} />
          {totalItems > 0 && (
            <span style={{
              position: 'absolute', top: '2px', right: '2px',
              background: '#f85149', color: '#fff', borderRadius: '50%',
              width: '18px', height: '18px', fontSize: '0.7rem', fontWeight: 'bold',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{totalItems}</span>
          )}
        </button>

        {/* Botón hamburguesa */}
        <button
          onClick={() => setMobileMenuAbierto(!mobileMenuAbierto)}
          style={{
            background: 'none', border: 'none', color: 'var(--color-text-main)',
            cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center'
          }}
        >
          {mobileMenuAbierto ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Menú Móvil Desplegable — contiene TODAS las opciones */}
      {mobileMenuAbierto && (
        <div className="navbar-mobile-menu" style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          background: '#fff',
          borderTop: '2px solid var(--color-brand-primary)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          zIndex: 99
        }}>
          {/* Búsqueda móvil */}
          {showSearch && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 16px 10px 36px',
                    borderRadius: '20px', border: '1px solid var(--color-border)',
                    background: '#f9fafb', fontSize: '0.9rem', outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {/* Opciones de usuario logueado */}
          {usuario ? (
            <>
              <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: '700', color: 'var(--color-text-main)', fontSize: '0.95rem' }}>
                  {userInitial} {usuario.email}
                </div>
                <span style={{
                  display: 'inline-block', marginTop: '4px',
                  background: 'rgba(0,162,154,0.1)', color: 'var(--color-primary)',
                  border: '1px solid var(--color-primary-border)',
                  borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', fontWeight: '600'
                }}>
                  {rolLabel}
                </span>
              </div>
              <button onClick={() => handleMobileNav('/mis-pedidos')} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0',
                color: 'var(--color-text-main)', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left'
              }}>
                <PackageOpen size={18} style={{ color: 'var(--color-text-muted)' }} />
                Mis Pedidos / Compras
              </button>
              <button onClick={() => handleMobileNav('/rastreo')} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0',
                color: 'var(--color-text-main)', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left'
              }}>
                <Package size={18} style={{ color: 'var(--color-text-muted)' }} />
                Rastrear Pedido
              </button>
              <button onClick={handleMobileLogout} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                background: 'none', border: 'none',
                color: '#dc2626', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', textAlign: 'left'
              }}>
                <LogOut size={18} />
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <button onClick={() => handleMobileNav('/rastreo')} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                background: 'none', border: 'none', borderBottom: '1px solid #f0f0f0',
                color: 'var(--color-text-main)', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left'
              }}>
                <Package size={18} style={{ color: 'var(--color-text-muted)' }} />
                Rastrear Pedido
              </button>
              <button onClick={() => handleMobileNav('/login')} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                background: 'var(--color-primary-soft)', border: 'none',
                color: 'var(--color-brand-primary)', fontSize: '0.95rem', fontWeight: '600',
                cursor: 'pointer', textAlign: 'left'
              }}>
                <LogIn size={18} />
                Iniciar Sesión
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
