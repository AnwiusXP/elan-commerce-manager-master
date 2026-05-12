import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

export default function ActivationPage() {
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const path = window.location.pathname
    const match = path.match(/\/activate\/([a-f0-9-]+)/i)
    const token = match ? match[1] : null

    if (!token) {
      setStatus('error')
      setMessage('Enlace de activación inválido.')
      return
    }

    api.get(`/auth/activate/${token}`)
      .then(() => {
        setStatus('success')
        setMessage('¡Tu cuenta ha sido activada! Ya puedes iniciar sesión.')
      })
      .catch(err => {
        const detail = err?.response?.data?.detail || 'No se pudo activar la cuenta.'
        if (detail.includes('expirado')) {
          setStatus('expired')
          setMessage('El enlace ha expirado. Por favor, regístrate nuevamente.')
        } else {
          setStatus('error')
          setMessage(detail)
        }
      })
  }, [])

  if (status === 'loading') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚙️</div>
            <p style={{ color: '#8b949e' }}>Activando tu cuenta...</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ color: '#e6edf3', marginBottom: '12px' }}>¡Cuenta activada!</h2>
            <p style={{ color: '#8b949e', marginBottom: '32px' }}>{message}</p>
            <button onClick={() => navigate('/login')} style={buttonStyle}>
              Iniciar Sesión
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
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⛔</div>
          <h2 style={{ color: '#e6edf3', marginBottom: '12px' }}>Activación fallida</h2>
          <p style={{ color: '#8b949e', marginBottom: '32px' }}>{message}</p>
          <Link to="/register" style={{ ...buttonStyle, display: 'inline-block', textAlign: 'center', textDecoration: 'none' }}>
            Registrarse de nuevo
          </Link>
        </div>
      </div>
    </div>
  )
}

const containerStyle = { minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }
const cardStyle = { background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px' }
const buttonStyle = { display: 'inline-block', background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px 32px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' }