import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const validateUsername = (v) => {
    if (!v) return 'El nombre de usuario es obligatorio.'
    if (!USERNAME_REGEX.test(v)) return 'El usuario debe ser alfanumérico (3-30 caracteres, sin espacios).'
    return null
  }

  const validateEmail = (v) => {
    if (!v) return 'El correo electrónico es obligatorio.'
    if (!EMAIL_REGEX.test(v)) return 'Formato de correo inválido.'
    return null
  }

  const validatePassword = (v) => {
    if (!v) return 'La contraseña es obligatoria.'
    if (v.length < 4) return 'La contraseña debe tener al menos 4 caracteres.'
    return null
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')

    const userErr = validateUsername(username)
    if (userErr) { setError(userErr); return }

    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }

    const passErr = validatePassword(password)
    if (passErr) { setError(passErr); return }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setCargando(true)
    try {
      await api.post('/users', { username, email, password })
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Error al crear la cuenta.')
    } finally {
      setCargando(false)
    }
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ color: '#e6edf3', marginBottom: '12px' }}>Registro recibido</h2>
            <p style={{ color: '#8b949e', marginBottom: '24px', lineHeight: '1.6' }}>
              Te hemos enviado un correo de activación a:<br />
              <strong style={{ color: '#e6edf3' }}>{email}</strong>
            </p>
            <p style={{ color: '#8b949e', marginBottom: '32px', lineHeight: '1.6', fontSize: '0.88rem' }}>
              Abre la interfaz de <strong style={{ color: '#1e8a5e' }}>Mailpit</strong> en<br />
              <a href="http://localhost:8025" target="_blank" rel="noopener noreferrer" style={{ color: '#1e8a5e', textDecoration: 'none', fontWeight: 'bold' }}>http://localhost:8025</a><br />
              para activar tu cuenta.
            </p>
            <button onClick={() => navigate('/login')} style={{ ...buttonStyle, marginBottom: '12px' }}>
              Ir a Iniciar Sesión
            </button>
            <div>
              <Link to="/" style={{ color: '#8b949e', fontSize: '0.85rem', textDecoration: 'none' }}>← Ver catálogo</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#e6edf3', fontSize: '1.4rem', fontWeight: '700' }}>Crear Cuenta</h1>
          <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '4px' }}>Élan Pure Commerce</p>
        </div>

        {error && <div style={errorBoxStyle}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="mi_usuario"
              style={inputStyle}
              autoComplete="username"
            />
            <span style={{ color: '#6e7681', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
              Alfanumérico, 3-30 caracteres. Este será tu identificador de acceso.
            </span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com"
              style={inputStyle}
            />
            <span style={{ color: '#6e7681', fontSize: '0.78rem', marginTop: '4px', display: 'block' }}>
              Se usará para notificaciones y recuperación de contraseña.
            </span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Confirmar Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              style={inputStyle}
            />
          </div>
          <button type="submit" disabled={cargando} style={buttonStyle}>
            {cargando ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <Link to="/login" style={{ color: '#8b949e', fontSize: '0.85rem', textDecoration: 'none' }}>
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </div>
    </div>
  )
}

const containerStyle = { minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }
const cardStyle = { background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px' }
const labelStyle = { color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }
const inputStyle = { width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '8px', padding: '10px 14px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }
const buttonStyle = { width: '100%', background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }
const errorBoxStyle = { background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', borderRadius: '8px', padding: '10px 14px', fontSize: '0.88rem', marginBottom: '16px' }