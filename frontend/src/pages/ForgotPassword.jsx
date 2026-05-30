import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword, verifyOTP } from '../services/authService'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [stage, setStage] = useState('email')
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
      navigate('/restablecer-password', { state: { email, token: otp } })
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

  return (
    <div className="theme-public-clean" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#ffffff', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '48px 40px', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-md)' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--color-text-main)', fontSize: '1.4rem', fontWeight: '700' }}>Recuperar Contraseña</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {stage === 'email' ? 'Te enviaremos un código de verificación' : 'Ingresa el código que recibiste'}
          </p>
        </div>

        {mensaje && <div style={msgStyle}>{mensaje}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ color: '#374151', fontSize: '0.9rem', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(false); setMensaje(null) }}
            placeholder="ejemplo@yopmail.com"
            disabled={stage === 'verify'}
            style={{
              width: '100%', background: '#f8fafc', border: '1px solid #d1d5db',
              color: stage === 'verify' ? '#9ca3af' : 'var(--color-text-main)', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s'
            }}
          />
        </div>

        {stage === 'verify' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#374151', fontSize: '0.9rem', display: 'block', marginBottom: '6px', fontWeight: '500' }}>Código de Verificación</label>
            <input
              type="text"
              value={otp}
              maxLength={6}
              onChange={e => { setOtp(e.target.value); setError(false); setMensaje(null) }}
              placeholder="6 dígitos"
              style={{
                width: '100%', background: '#f8fafc', border: '1px solid #d1d5db',
                color: 'var(--color-text-main)', borderRadius: '8px', padding: '10px 14px',
                fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
                letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
        )}

        <button
          onClick={stage === 'email' ? enviarCodigo : verificarCodigo}
          disabled={cargando}
          style={{
            width: '100%', background: cargando ? '#0d9488' : 'var(--color-primary)', border: 'none',
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
              style={{ color: 'var(--color-primary)', fontSize: '0.85rem', textDecoration: 'none' }}>
              Reenviar código
            </a>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <a href="/login" style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← Volver a Iniciar Sesión
          </a>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
