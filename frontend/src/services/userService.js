import api from './api'

export const getUsers = async () => {
  const res = await api.get('/api/users')
  return res.data
}

export const createUser = async (username, email, password) => {
  const res = await api.post('/api/users', { username, email, password })
  return res.data
}

export const deleteUser = async (userId) => {
  const res = await api.delete(`/api/users/${userId}`)
  return res.data
}
