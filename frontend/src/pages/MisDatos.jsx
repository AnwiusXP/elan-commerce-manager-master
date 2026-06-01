import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavbarPublico from '../components/NavbarPublico'
import { obtenerUsuario, logout, updateProfile } from '../services/authService'

function MisDatos() {
  const navigate = useNavigate()
  const user = obtenerUsuario()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState({ text: '', type: '' })
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    if (user) {
      setUsername(user.username || '')
      setEmail(user.email || '')
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setCargando(true)
    setMensaje({ text: '', type: '' })
    try {
      const data = { username, email }
      if (password.trim()) {
        data.password = password
      }
      const updated = await updateProfile(data)
      setMensaje({ text: 'Perfil actualizado con éxito', type: 'success' })
      setPassword('')
    } catch (error) {
      setMensaje({ text: error.response?.data?.detail || 'Error al actualizar perfil', type: 'error' })
    }
    setCargando(false)
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #30363d',
    color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.9rem', outline: 'none', marginTop: '6px', boxSizing: 'border-box'
  }

  return (
    <div>
      <NavbarPublico
        totalCarrito={0}
        showSearch={false}
        usuario={user}
        onLogout={() => { logout(); navigate('/') }}
      />
      <div style={{ maxWidth: '500px', margin: '40px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '28px' }}>Mis Datos</h1>

        {mensaje.text && (
          <div style={{
            padding: '12px', borderRadius: '8px', marginBottom: '20px',
            background: mensaje.type === 'success' ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)',
            border: `1px solid ${mensaje.type === 'success' ? '#2ea043' : '#f85149'}`,
            color: mensaje.type === 'success' ? '#3fb950' : '#f85149'
          }}>
            {mensaje.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Usuario</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Nueva Contraseña (dejar en blanco para mantener)</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} placeholder="••••••••" />
          </div>
          <button type="submit" disabled={cargando} style={{
            width: '100%', background: 'var(--color-primary)', border: 'none', color: '#fff',
            borderRadius: '8px', padding: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem'
          }}>
            {cargando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default MisDatos
