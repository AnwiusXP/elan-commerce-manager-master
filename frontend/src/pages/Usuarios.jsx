import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getUsers, createUser, deleteUser, updateUserStatus, updateUser } from '../services/userService'
import { ArrowLeft } from 'lucide-react'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState('cliente_base')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ text: '', type: '' })
  const [editModal, setEditModal] = useState(false)
  const [editUserData, setEditUserData] = useState(null)
  const [editUsername, setEditUsername] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editRol, setEditRol] = useState('')
  const [editCargando, setEditCargando] = useState(false)
  const [mobilePanelUserId, setMobilePanelUserId] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      const data = await getUsers()
      setUsuarios(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!username || !email || !password) return
    setCargando(true)
    try {
      await createUser(username, email, password, rol)
      setMensaje({ text: 'Usuario creado con éxito', type: 'success' })
      setUsername('')
      setEmail('')
      setPassword('')
      setRol('cliente_base')
      fetchUsers()
    } catch (error) {
      setMensaje({ text: error.response?.data?.detail || 'Error al crear usuario', type: 'error' })
    }
    setCargando(false)
  }

  async function handleDelete(id) {
    if (!window.confirm('¿Eliminar este usuario?')) return
    try {
      await deleteUser(id)
      setMensaje({ text: 'Usuario eliminado', type: 'success' })
      fetchUsers()
    } catch (error) {
      setMensaje({ text: error.response?.data?.detail || 'Error al eliminar', type: 'error' })
    }
  }

  async function toggleUserStatus(user) {
    const newStatus = !user.is_active
    try {
      await updateUserStatus(user.id, newStatus)
      setUsuarios(usuarios.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u))
      setMensaje({ text: newStatus ? 'Usuario activado' : 'Usuario desactivado', type: 'success' })
    } catch (error) {
      setMensaje({ text: error.response?.data?.detail || 'Error al actualizar estado', type: 'error' })
    }
  }

  function abrirEditModal(user) {
    setEditUserData(user)
    setEditUsername(user.username)
    setEditEmail(user.email)
    setEditRol(user.rol)
    setEditModal(true)
  }

  function cerrarEditModal() {
    setEditModal(false)
    setEditUserData(null)
    setEditUsername('')
    setEditEmail('')
    setEditRol('')
  }

  async function handleEditSubmit(e) {
    e.preventDefault()
    if (!editUsername || !editEmail) return
    setEditCargando(true)
    try {
      const updated = await updateUser(editUserData.id, {
        username: editUsername,
        email: editEmail,
        rol: editRol,
      })
      setUsuarios(usuarios.map(u => u.id === updated.id ? updated : u))
      setMensaje({ text: 'Usuario actualizado con éxito', type: 'success' })
      cerrarEditModal()
    } catch (error) {
      setMensaje({ text: error.response?.data?.detail || 'Error al actualizar usuario', type: 'error' })
    }
    setEditCargando(false)
  }

  return (
    <div className="admin-layout" style={{ display: 'flex' }}>
      <Sidebar active="Usuarios" />
      <div className="admin-content">
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '28px' }}>Gestión de Usuarios</h1>

        {mensaje.text && (
          <div style={{ 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            background: mensaje.type === 'success' ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${mensaje.type === 'success' ? '#2ea043' : '#f85149'}`,
            color: mensaje.type === 'success' ? '#3fb950' : '#f85149'
          }}>
            {mensaje.text}
          </div>
        )}

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Registrar Nuevo Usuario</h2>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Username" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              style={inputStyle} 
              required
            />
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={inputStyle} 
              required
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={inputStyle} 
              required
            />
            <select 
              value={rol} 
              onChange={e => setRol(e.target.value)} 
              style={{
                background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d',
                borderRadius: '8px', padding: '10px', outline: 'none', minWidth: '150px'
              }}
            >
              <option value="cliente_base">Cliente Base</option>
              <option value="distribuidor">Distribuidor</option>
              <option value="admin">Administrador</option>
            </select>
            <button type="submit" disabled={cargando} style={buttonStyle}>
              {cargando ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>
        {/* Mobile full-screen user panel */}
        {mobilePanelUserId && (() => {
          const u = usuarios.find(x => x.id === mobilePanelUserId)
          if (!u) return null
          return (
            <div className="admin-mobile-panel-overlay" onClick={() => setMobilePanelUserId(null)}>
              <div className="admin-mobile-panel" onClick={e => e.stopPropagation()}>
                <div className="panel-header">
                  <button onClick={() => setMobilePanelUserId(null)} style={{ background: 'none', border: 'none', color: '#8b949e', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Volver
                  </button>
                  <div style={{ fontWeight: 700, color: '#e6edf3' }}>{u.username}</div>
                </div>
                <div>
                  <h4 style={{ color: '#e6edf3', marginBottom: 6 }}>Usuario #{u.id}</h4>
                  <div style={{ color: '#c9d1d9', marginBottom: 10 }}>{u.email}</div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ background: '#161b22', border: '1px solid #30363d', padding: '6px 10px', borderRadius: 8 }}>{u.rol}</span>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => { abrirEditModal(u); setMobilePanelUserId(null) }} style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8 }}>Editar</button>
                    <button onClick={() => { toggleUserStatus(u); setMobilePanelUserId(null) }} style={{ background: u.is_active ? 'transparent' : '#2ea043', color: u.is_active ? '#8b949e' : '#fff', border: '1px solid #30363d', padding: '10px 14px', borderRadius: 8 }}>{u.is_active ? 'Desactivar' : 'Activar'}</button>
                    <button onClick={() => { if (window.confirm('¿Eliminar este usuario?')) { handleDelete(u.id); setMobilePanelUserId(null) } }} style={{ background: 'transparent', color: '#f85149', border: '1px solid rgba(248,81,73,0.2)', padding: '10px 14px', borderRadius: 8 }}>Eliminar</button>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Mobile list view */}
        <div className="admin-mobile-list">
          {usuarios.map(u => (
            <div key={u.id} className="admin-mobile-item" onClick={() => setMobilePanelUserId(u.id)}>
              <div className="meta">
                <div className="line-1">#{u.id} — {u.username}</div>
                <div className="line-2">{u.email}</div>
              </div>
              <div style={{ color: u.is_active ? '#3fb950' : '#f85149', fontWeight: 700 }}>{u.is_active ? 'Activo' : 'Inactivo'}</div>
            </div>
          ))}
        </div>

        <div className="table-responsive" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#21262d', textAlign: 'left' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid #30363d' }}>
                  <td style={tdStyle}>{u.id}</td>
                  <td style={{ ...tdStyle, fontWeight: '600', color: '#e6edf3' }}>{u.username}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{
                      background: u.rol === 'admin' ? 'rgba(0,162,154,0.15)' : u.rol === 'distribuidor' ? 'rgba(0,255,204,0.1)' : 'rgba(255,255,255,0.05)',
                      color: u.rol === 'admin' ? 'var(--color-primary)' : '#e6edf3',
                      border: '1px solid ' + (u.rol === 'admin' ? 'var(--color-primary-border)' : '#30363d'),
                      borderRadius: '6px', padding: '4px 10px', fontSize: '0.82rem', fontWeight: '500'
                    }}>
                      {u.rol === 'admin' ? 'Admin' : u.rol === 'distribuidor' ? 'Distribuidor' : 'Cliente Base'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <div style={{
                        position: 'relative',
                        width: '42px',
                        height: '22px',
                        background: u.is_active ? 'var(--color-primary)' : '#30363d',
                        borderRadius: '11px',
                        transition: 'background 0.2s ease'
                      }}>
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          onChange={() => toggleUserStatus(u)}
                          style={{ display: 'none' }}
                        />
                        <div style={{
                          position: 'absolute',
                          top: '2px',
                          left: u.is_active ? '22px' : '2px',
                          width: '18px',
                          height: '18px',
                          background: '#fff',
                          borderRadius: '50%',
                          transition: 'left 0.2s ease'
                        }} />
                      </div>
                      <span style={{
                        marginLeft: '10px',
                        fontSize: '0.8rem',
                        color: u.is_active ? '#3fb950' : '#f85149'
                      }}>
                        {u.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </label>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => abrirEditModal(u)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.9rem', marginRight: '12px' }}
                    >
                      Editar
                    </button>
                    <button 
                      onClick={() => handleDelete(u.id)} 
                      style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer', fontSize: '0.9rem' }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '400px' }}>
            <h5 style={{ marginBottom: '24px', fontWeight: '700' }}>Editar Usuario</h5>
            <form onSubmit={handleEditSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Username</label>
                <input type="text" value={editUsername} onChange={e => setEditUsername(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Rol</label>
                <select value={editRol} onChange={e => setEditRol(e.target.value)} style={inputStyle}>
                  {editUserData && editUserData.rol === 'admin' ? (
                    <>
                      <option value="admin">Administrador</option>
                      <option value="distribuidor">Distribuidor</option>
                      <option value="cliente_base">Cliente Base</option>
                    </>
                  ) : (
                    <>
                      <option value="cliente_base">Cliente Base</option>
                      <option value="distribuidor">Distribuidor</option>
                    </>
                  )}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" onClick={cerrarEditModal} style={{ flex: 1, background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={editCargando} style={{ flex: 1, background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>
                  {editCargando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '8px', padding: '10px', flex: 1, outline: 'none', minWidth: '140px' }
const buttonStyle = { background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' }
const thStyle = { padding: '12px 16px', fontSize: '0.85rem', color: '#8b949e' }
const tdStyle = { padding: '12px 16px', fontSize: '0.95rem' }

export default Usuarios
