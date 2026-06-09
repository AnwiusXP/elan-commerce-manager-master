import api from './api'

export const login = async (usuario, contrasena) => {
  try {
    const res = await api.post('/api/login', { usuario, contrasena })
    if (res.data.access_token) {
      // Store admin sessions in sessionStorage (volatile), others in localStorage (persistent)
      const isAdmin = res.data.user?.role === 'admin' || res.data.user?.rol === 'admin'
      if (isAdmin) {
        sessionStorage.setItem('token', res.data.access_token)
        sessionStorage.setItem('user', JSON.stringify(res.data.user))
      } else {
        localStorage.setItem('token', res.data.access_token)
        localStorage.setItem('user', JSON.stringify(res.data.user))
      }
    }
    return { ok: true, user: res.data.user, role: res.data.user?.role }
  } catch (error) {
    return { ok: false, mensaje: error?.response?.data?.message || 'Usuario o contraseña incorrectos.' }
  }
}

export const logout = async () => {
  try {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('user')
  } catch (e) {
    // ignore
  }
}

export const obtenerUserId = () => {
  const user = obtenerUsuario()
  return user ? user.id : null
}

export const estaAutenticado = () => {
  return !!(sessionStorage.getItem('token') || localStorage.getItem('token'))
}

export const obtenerUsuario = () => {
  const su = sessionStorage.getItem('user')
  if (su) return JSON.parse(su)
  const lu = localStorage.getItem('user')
  return lu ? JSON.parse(lu) : null
}

export const obtenerRol = () => {
  const user = obtenerUsuario()
  return user ? (user.role || user.rol) : null
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

export const updateProfile = async (data) => {
  const res = await api.put('/api/profile', data)
  if (res.data) {
    const currentUser = obtenerUsuario()
    const updatedUser = { ...currentUser, ...res.data }
    // Update in the same storage where the token exists
    if (sessionStorage.getItem('token')) {
      sessionStorage.setItem('user', JSON.stringify(updatedUser))
    } else {
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }
  return res.data
}
