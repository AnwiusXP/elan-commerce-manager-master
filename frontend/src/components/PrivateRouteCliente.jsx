import { Navigate } from 'react-router-dom'
import { estaAutenticado, obtenerRol } from '../services/authService'

function PrivateRouteCliente({ children }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" />
  }
  const rol = obtenerRol()
  if (rol !== 'cliente_base' && rol !== 'distribuidor') {
    return <Navigate to="/" replace />
  }
  return children
}

export default PrivateRouteCliente
