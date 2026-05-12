import api from './api'

export const getUsers = async () => {
  const res = await api.get('/users')
  return res.data
}

export const createUser = async (username, email, password) => {
  const res = await api.post('/users', { username, email, password })
  return res.data
}

export const deleteUser = async (userId) => {
  const res = await api.delete(`/users/${userId}`)
  return res.data
}
