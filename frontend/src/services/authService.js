import api from './api'

export const login = async (usuario, contrasena) => {
  try {
    const res = await api.post('/login', { usuario, contrasena })
    localStorage.setItem('token', res.data.access_token)
    return { ok: true }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.message || 'Usuario o contraseña incorrectos.' }
  }
}

export const logout = async () => {
  try {
    await api.post('/logout')
  } catch (error) {
    // Ignorar error de logout, pero eliminar el token local.
  }
  localStorage.removeItem('token')
}

export const estaAutenticado = () => {
  return !!localStorage.getItem('token')
}

export const forgotPassword = async (email) => {
  try {
    const res = await api.post('/auth/forgot-password', { email })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Error al solicitar recuperación.' }
  }
}

export const verifyOTP = async (email, token) => {
  try {
    const res = await api.post('/auth/verify-otp', { email, token })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Código inválido o expirado.' }
  }
}

export const resetPassword = async (email, token, new_password) => {
  try {
    const res = await api.post('/auth/reset-password', { email, token, new_password })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Error al restablecer contraseña.' }
  }
}
