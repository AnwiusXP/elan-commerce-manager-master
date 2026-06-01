import api from './api'

export const getUsers = async () => {
  const res = await api.get('/api/users')
  return res.data
}

export const createUser = async (username, email, password, rol = 'cliente_base') => {
  const res = await api.post('/api/users', { username, email, password, rol })
  return res.data
}

export const deleteUser = async (userId) => {
  const res = await api.delete(`/api/users/${userId}`)
  return res.data
}

export const updateUserStatus = async (userId, isActive) => {
  const res = await api.put(`/api/users/${userId}/status`, { is_active: isActive })
  return res.data
}

export const updateUser = async (userId, data) => {
  const res = await api.put(`/api/users/${userId}`, data)
  return res.data
}
