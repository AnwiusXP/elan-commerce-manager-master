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
    if (location.state?.email && location.state?.token) {
      setEmail(location.state.email)
      setToken(location.state.token)
    } else {
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
    background: error ? 'rgba(248,81,73,0.08)' : 'rgba(46,160,67,0.08)',
    border: `1px solid ${error ? 'rgba(248,81,73,0.3)' : 'rgba(46,160,67,0.3)'}`,
    color: error ? '#b91c1c' : '#166534',
    borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.88rem', marginBottom: '16px'
  }

  const inputStyle = {
    width: '100%', background: '#f8fafc', border: '1px solid #d1d5db',
    color: 'var(--color-text-main)', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
  }

  return (
    <div className="theme-public-clean" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-md)' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--color-text-main)', fontSize: '1.4rem', fontWeight: '700' }}>Nueva Contraseña</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Define tu nueva contraseña para <strong style={{ color: 'var(--color-text-main)' }}>{email}</strong>
          </p>
        </div>

        {mensaje && <div style={msgStyle}>{mensaje}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#374151', fontSize: '0.9rem', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Nueva Contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={e => { setNewPassword(e.target.value); setError(false); setMensaje(null) }}
            placeholder="Mínimo 6 caracteres"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#374151', fontSize: '0.9rem', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Confirmar Contraseña</label>
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
            width: '100%', background: cargando ? '#0d9488' : 'var(--color-primary)', border: 'none',
            color: '#fff', borderRadius: '8px', padding: '11px',
            fontSize: '0.95rem', fontWeight: '600', cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '8px'
          }}
        >
          {cargando ? 'Actualizando...' : 'Restablecer contraseña'}
        </button>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/login" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver a Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
