import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getUsers, createUser, deleteUser } from '../services/userService'

function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensaje, setMensaje] = useState({ text: '', type: '' })

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
      await createUser(username, email, password)
      setMensaje({ text: 'Usuario creado con éxito', type: 'success' })
      setUsername('')
      setEmail('')
      setPassword('')
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

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="Usuarios" />
      <div style={{ marginLeft: '200px', padding: '32px', flex: 1 }}>
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
            <button type="submit" disabled={cargando} style={buttonStyle}>
              {cargando ? 'Creando...' : 'Crear Usuario'}
            </button>
          </form>
        </div>

        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#21262d', textAlign: 'left' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Email</th>
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
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      background: u.is_active ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.15)',
                      color: u.is_active ? '#3fb950' : '#f85149'
                    }}>
                      {u.is_active ? 'Activo' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={tdStyle}>
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
    </div>
  )
}

const inputStyle = { background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '8px', padding: '10px', flex: 1, outline: 'none', minWidth: '140px' }
const buttonStyle = { background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer' }
const thStyle = { padding: '12px 16px', fontSize: '0.85rem', color: '#8b949e' }
const tdStyle = { padding: '12px 16px', fontSize: '0.95rem' }

export default Usuarios
