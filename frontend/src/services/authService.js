import api from './api'

export const login = async (usuario, contrasena) => {
  try {
    const res = await api.post('/api/login', { usuario, contrasena })
    if (res.data.access_token) {
      localStorage.setItem('token', res.data.access_token)
      localStorage.setItem('user', JSON.stringify(res.data.user))
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.message || 'Usuario o contraseña incorrectos.' }
  }
}

export const logout = async () => {
  try {
    await api.post('/api/logout')
  } catch (error) {
    // Ignorar error de logout, pero eliminar el token local.
  }
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export const estaAutenticado = () => {
  return !!localStorage.getItem('token')
}

export const obtenerUsuario = () => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export const obtenerRol = () => {
  const user = obtenerUsuario()
  return user ? user.role : null
}

export const forgotPassword = async (email) => {
  try {
    const res = await api.post('/api/auth/forgot-password', { email })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Error al solicitar recuperación.' }
  }
}

export const verifyOTP = async (email, token) => {
  try {
    const res = await api.post('/api/auth/verify-otp', { email, token })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Código inválido o expirado.' }
  }
}

export const resetPassword = async (email, token, new_password) => {
  try {
    const res = await api.post('/api/auth/reset-password', { email, token, new_password })
    return { ok: true, mensaje: res.data.message }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.detail || 'Error al restablecer contraseña.' }
  }
}
