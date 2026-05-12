import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { resetPassword } from '../services/authService'

function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    // Recibir email y token validado desde ForgotPassword
    if (location.state?.email && location.state?.token) {
      setEmail(location.state.email)
      setToken(location.state.token)
    } else {
      // Si alguien llega aquí sin haber validado el código, redirigir
      navigate('/recuperar-password')
    }
  }, [location, navigate])

  async function cambiarContrasena() {
    if (!newPassword || !confirmPassword) {
      setError(true); setMensaje('Completa todos los campos'); return
    }
    if (newPassword !== confirmPassword) {
      setError(true); setMensaje('Las contraseñas no coinciden'); return
    }
    if (newPassword.length < 6) {
      setError(true); setMensaje('La contraseña debe tener al menos 6 caracteres'); return
    }

    setCargando(true); setError(false); setMensaje(null)
    const res = await resetPassword(email, token, newPassword)
    setCargando(false)
    if (res.ok) {
      setMensaje('¡Contraseña actualizada correctamente!')
      setError(false)
      setTimeout(() => navigate('/login'), 2500)
    } else {
      setMensaje(res.mensaje)
      setError(true)
    }
  }

  const msgStyle = {
    background: error ? 'rgba(248,81,73,0.1)' : 'rgba(46,160,67,0.1)',
    border: `1px solid ${error ? 'rgba(248,81,73,0.4)' : 'rgba(46,160,67,0.4)'}`,
    color: error ? '#f85149' : '#3fb950',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.88rem', marginBottom: '16px'
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #30363d',
    color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#e6edf3', fontSize: '1.4rem', fontWeight: '700' }}>Nueva Contraseña</h1>
          <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '4px' }}>
            Define tu nueva contraseña para <strong style={{ color: '#c9d1d9' }}>{email}</strong>
          </p>
        </div>

        {mensaje && <div style={msgStyle}>{mensaje}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Nueva Contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setError(false); setMensaje(null) }}
            placeholder="Mínimo 6 caracteres"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Confirmar Contraseña</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(false); setMensaje(null) }}
            placeholder="Repite la contraseña"
            style={inputStyle}
          />
        </div>

        <button
          onClick={cambiarContrasena}
          disabled={cargando}
          style={{
            width: '100%', background: cargando ? '#145c3f' : '#1e8a5e', border: 'none',
            color: '#fff', borderRadius: '8px', padding: '11px',
            fontSize: '0.95rem', fontWeight: '600', cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '8px'
          }}
        >
          {cargando ? 'Actualizando...' : 'Restablecer contraseña'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/login" style={{ color: '#8b949e', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver a Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
