import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword, verifyOTP } from '../services/authService'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState('email') // 'email' | 'verify'
  const [mensaje, setMensaje] = useState(null)
  const [error, setError] = useState(false)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  async function enviarCodigo() {
    if (!email) { setError(true); setMensaje('Ingresa tu correo electrónico'); return }
    setCargando(true); setError(false); setMensaje(null)
    const res = await forgotPassword(email)
    setCargando(false)
    if (res.ok) {
      setMensaje(res.mensaje)
      setError(false)
      setStage('verify')
    } else {
      setMensaje(res.mensaje)
      setError(true)
    }
  }

  async function verificarCodigo() {
    if (!otp) { setError(true); setMensaje('Ingresa el código de verificación'); return }
    setCargando(true); setError(false); setMensaje(null)
    const res = await verifyOTP(email, otp)
    setCargando(false)
    if (res.ok) {
      // Código validado, redirigir a la vista de nueva contraseña
      navigate('/restablecer-password', { state: { email, token: otp } })
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

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: '#e6edf3', fontSize: '1.4rem', fontWeight: '700' }}>Recuperar Contraseña</h1>
          <p style={{ color: '#8b949e', fontSize: '0.9rem', marginTop: '4px' }}>
            {stage === 'email' ? 'Te enviaremos un código de verificación' : 'Ingresa el código que recibiste'}
          </p>
        </div>

        {mensaje && <div style={msgStyle}>{mensaje}</div>}

        {/* Campo de email (siempre visible) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(false); setMensaje(null) }}
            placeholder="ejemplo@yopmail.com"
            disabled={stage === 'verify'}
            style={{
              width: '100%', background: '#0d1117', border: '1px solid #30363d',
              color: stage === 'verify' ? '#8b949e' : '#e6edf3', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Campo de código de verificación (aparece tras enviar email) */}
        {stage === 'verify' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#c9d1d9', fontSize: '0.9rem', display: 'block', marginBottom: '6px' }}>Código de Verificación</label>
            <input
              type="text"
              value={otp}
              maxLength={6}
              onChange={e => { setOtp(e.target.value); setError(false); setMensaje(null) }}
              placeholder="6 dígitos"
              style={{
                width: '100%', background: '#0d1117', border: '1px solid #30363d',
                color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
                fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold'
              }}
            />
          </div>
        )}

        <button
          onClick={stage === 'email' ? enviarCodigo : verificarCodigo}
          disabled={cargando}
          style={{
            width: '100%', background: cargando ? '#145c3f' : '#1e8a5e', border: 'none',
            color: '#fff', borderRadius: '8px', padding: '11px',
            fontSize: '0.95rem', fontWeight: '600', cursor: cargando ? 'not-allowed' : 'pointer',
            marginTop: '8px'
          }}
        >
          {cargando
            ? (stage === 'email' ? 'Enviando...' : 'Verificando...')
            : (stage === 'email' ? 'Enviar código' : 'Verificar código')
          }
        </button>

        {stage === 'verify' && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <a href="#" onClick={e => { e.preventDefault(); setStage('email'); setOtp(''); setMensaje(null) }}
              style={{ color: '#1e8a5e', fontSize: '0.85rem', textDecoration: 'none' }}>
              Reenviar código
            </a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/login" style={{ color: '#8b949e', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver a Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
