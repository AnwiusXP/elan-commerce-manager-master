import api from './api'

export const getPrediccion = async (producto = 'Todos') => {
  const res = await api.get('/api/ia/predict', { params: { producto } })
  return res.data
}
