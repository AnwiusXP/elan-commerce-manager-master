import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, forgotPassword, verifyOTP, resetPassword } from '../services/authService'

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^[a-zA-Z0-9!@#$%^&*()\-_+=.,;:]+$/

function Login() {
  const [stage, setStage] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const resetStates = () => { setError(''); setSuccess('') }

  const validateUsername = (v) => {
    if (!v) return 'El nombre de usuario es obligatorio.'
    if (!USERNAME_REGEX.test(v)) return 'El usuario debe ser alfanumérico (3-30 caracteres).'
    return null
  }

  const validateEmail = (v) => {
    if (!v) return 'El correo electrónico es obligatorio.'
    if (!EMAIL_REGEX.test(v)) return 'El formato del correo no es válido.'
    return null
  }

  const validatePassword = (v) => {
    if (!v) return 'La contraseña es obligatoria.'
    if (v.length < 4) return 'La contraseña debe tener al menos 4 caracteres.'
    if (!PASSWORD_REGEX.test(v)) return 'La contraseña contiene caracteres no permitidos.'
    return null
  }

  async function handleLogin() {
    resetStates()
    const userErr = validateUsername(username)
    if (userErr) { setError(userErr); return }
    const passErr = validatePassword(password)
    if (passErr) { setError(passErr); return }
    setCargando(true)
    const res = await login(username, password)
    setCargando(false)
    if (res.ok) navigate('/dashboard')
    else setError('Credenciales incorrectas.')
  }

  async function handleForgot() {
    resetStates()
    const emailErr = validateEmail(email)
    if (emailErr) { setError(emailErr); return }
    setCargando(true)
    const res = await forgotPassword(email)
    setCargando(false)
    if (res.ok) {
      setSuccess('Se ha enviado un código de verificación a tu correo.')
      setStage('verify')
    } else setError(res.mensaje)
  }

  async function handleVerify() {
    resetStates()
    if (!otp || otp.length < 6) { setError('Ingresa el código de 6 dígitos'); return }
    setCargando(true)
    const res = await verifyOTP(email, otp)
    setCargando(false)
    if (res.ok) setStage('reset')
    else setError(res.mensaje)
  }

  async function handleReset() {
    resetStates()
    const passErr = validatePassword(newPassword)
    if (passErr) { setError(passErr); return }
    setCargando(true)
    const res = await resetPassword(email, otp, newPassword)
    setCargando(false)
    if (res.ok) {
      setSuccess('Contraseña actualizada. Ya puedes iniciar sesión.')
      setOtp(''); setNewPassword(''); setStage('login')
    } else setError(res.mensaje)
  }

  const renderForm = () => {
    switch (stage) {
      case 'forgot':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email de recuperación</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" style={inputStyle} />
            </div>
            <button onClick={handleForgot} disabled={cargando} style={buttonStyle}>{cargando ? 'Enviando...' : 'Enviar código'}</button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setStage('login'); resetStates() }} style={linkStyle}>← Volver</a>
            </div>
          </>
        )
      case 'verify':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Código de Verificación</label>
              <input type="text" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} placeholder="6 dígitos" style={{ ...inputStyle, letterSpacing: '4px', textAlign: 'center' }} />
            </div>
            <button onClick={handleVerify} disabled={cargando} style={buttonStyle}>{cargando ? 'Verificando...' : 'Verificar código'}</button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setStage('forgot'); resetStates() }} style={linkStyle}>Reenviar código</a>
            </div>
          </>
        )
      case 'reset':
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nueva Contraseña</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" style={inputStyle} />
            </div>
            <button onClick={handleReset} disabled={cargando} style={buttonStyle}>{cargando ? 'Guardando...' : 'Actualizar Contraseña'}</button>
          </>
        )
      default:
        return (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Usuario</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="tu_usuario" style={inputStyle} autoComplete="username" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="••••••••" style={inputStyle} />
            </div>
            <button onClick={handleLogin} disabled={cargando} style={buttonStyle}>{cargando ? 'Ingresando...' : 'Iniciar sesión'}</button>
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <a href="#" onClick={(e) => { e.preventDefault(); setStage('forgot'); resetStates() }} style={linkStyle}>¿Olvidaste tu contraseña?</a>
            </div>
          </>
        )
    }
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#e6edf3', fontSize: '1.4rem', fontWeight: '700' }}>Élan Pure</h1>
          <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '4px' }}>
            {stage === 'login' ? 'Commerce Manager' : 'Recuperación de Cuenta'}
          </p>
        </div>
        {error && <div style={errorBoxStyle}>{error}</div>}
        {success && <div style={successBoxStyle}>{success}</div>}
        {renderForm()}
        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          {stage === 'login' && (
            <p style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '8px' }}>
              ¿No tienes cuenta?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/register') }} style={{ color: '#1e8a5e', textDecoration: 'none' }}>Regístrate</a>
            </p>
          )}
          <a href="/" style={{ color: '#8b949e', fontSize: '0.85rem', textDecoration: 'none' }}>← Ir al catálogo</a>
        </div>
      </div>
    </div>
  )
}

const containerStyle = { minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const cardStyle = { background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px' }
const labelStyle = { color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }
const inputStyle = { width: '100%', background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '8px', padding: '10px 14px', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }
const buttonStyle = { width: '100%', background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '11px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }
const linkStyle = { color: '#1e8a5e', fontSize: '0.85rem', textDecoration: 'none' }
const errorBoxStyle = { background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', borderRadius: '8px', padding: '10px 14px', fontSize: '0.88rem', marginBottom: '16px' }
const successBoxStyle = { background: 'rgba(46,160,67,0.1)', border: '1px solid rgba(46,160,67,0.4)', color: '#3fb950', borderRadius: '8px', padding: '10px 14px', fontSize: '0.88rem', marginBottom: '16px' }

export default Login