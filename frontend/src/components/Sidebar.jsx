import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Menu, X } from 'lucide-react'
import { logout } from '../services/authService'

function Sidebar({ active }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function cerrarSesion() {
    await logout()
    navigate('/')
  }

  const items = [
    { path: '/dashboard', label: 'Inicio' },
    { path: '/productos', label: 'Productos' },
    { path: '/ventas', label: 'Ventas' },
    { path: '/pedidos', label: 'Pedidos' },
    { path: '/inventario', label: 'Inventario' },
    { path: '/reportes', label: 'Reportes' },
    { path: '/categorias', label: 'Categorias' },
    { path: '/usuarios', label: 'Usuarios' },
  ]

  return (
    <>
      <div className="admin-mobile-bar">
        <button
          className="admin-menu-button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu de administracion"
        >
          <Menu size={22} />
        </button>
        <div>
          <span>ECM</span>
          <strong>{active}</strong>
        </div>
      </div>

      {mobileOpen && (
        <button
          className="admin-sidebar-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Cerrar menu de administracion"
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? 'is-open' : ''}`} style={{
        width: '200px', minHeight: '100vh', background: '#161b22',
        borderRight: '1px solid #30363d', position: 'fixed',
        display: 'flex', flexDirection: 'column', padding: '24px 0'
      }}>
        <div className="admin-sidebar-header" style={{
          color: '#e6edf3', fontWeight: '700', fontSize: '1.1rem',
          padding: '0 24px 24px', borderBottom: '1px solid #30363d'
        }}>
          <span>ECM</span>
          <button
            className="admin-sidebar-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menu de administracion"
          >
            <X size={20} />
          </button>
        </div>

        <nav style={{ flex: 1, paddingTop: '16px' }}>
          {items.map(item => {
            const itemActivo = active === item.label || location.pathname === item.path

            return (
              <Link
                key={item.path}
                to={item.path}
                className="admin-sidebar-link"
                onClick={() => setMobileOpen(false)}
                style={{
                  display: 'block', textDecoration: 'none',
                  padding: '10px 24px', fontSize: '0.92rem',
                  color: itemActivo ? 'var(--color-primary)' : '#8b949e',
                  background: itemActivo ? 'var(--color-primary-soft)' : 'transparent',
                  borderLeft: itemActivo ? '3px solid var(--color-primary)' : '3px solid transparent',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #30363d' }}>
          <button className="admin-logout-button" onClick={cerrarSesion} style={{
            background: 'none', border: 'none', color: '#f85149',
            fontSize: '0.88rem', cursor: 'pointer'
          }}>
            <LogOut size={16} />
            Cerrar sesion
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
