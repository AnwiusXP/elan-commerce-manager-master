import { Navigate } from 'react-router-dom'
import { estaAutenticado, obtenerRol } from '../services/authService'

function PrivateRoute({ children, allowedRoles }) {
  if (!estaAutenticado()) {
    return <Navigate to="/login" />
  }
  if (allowedRoles?.length && !allowedRoles.includes(obtenerRol())) {
    return <Navigate to="/" replace />
  }
  return children
}

export default PrivateRoute
