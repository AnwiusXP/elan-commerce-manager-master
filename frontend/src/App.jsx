import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Ventas from './pages/Ventas'
import Inventario from './pages/Inventario'
import Reportes from './pages/Reportes'
import Catalogo from './pages/Catalogo'
import Carrito from './pages/Carrito'
import Checkout from './pages/Checkout'
import Rastreo from './pages/Rastreo'
import PrivateRoute from './components/PrivateRoute'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Usuarios from './pages/Usuarios'
import Register from './pages/Register'
import ActivationPage from './pages/ActivationPage'
import Pedidos from './pages/Pedidos'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas — cualquiera puede entrar */}
        <Route path="/" element={<Catalogo />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/rastreo" element={<Rastreo />} />
        <Route path="/login" element={<Login />} />
        <Route path="/recuperar-password" element={<ForgotPassword />} />
        <Route path="/restablecer-password" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/activate/*" element={<ActivationPage />} />

        {/* Rutas protegidas — solo si está autenticado */}
        <Route path="/dashboard" element={<PrivateRoute allowedRoles={['admin']}><Dashboard /></PrivateRoute>} />
        <Route path="/productos" element={<PrivateRoute allowedRoles={['admin']}><Productos /></PrivateRoute>} />
        <Route path="/ventas" element={<PrivateRoute allowedRoles={['admin']}><Ventas /></PrivateRoute>} />
        <Route path="/pedidos" element={<PrivateRoute allowedRoles={['admin']}><Pedidos /></PrivateRoute>} />
        <Route path="/inventario" element={<PrivateRoute allowedRoles={['admin']}><Inventario /></PrivateRoute>} />
        <Route path="/reportes" element={<PrivateRoute allowedRoles={['admin']}><Reportes /></PrivateRoute>} />
        <Route path="/usuarios" element={<PrivateRoute allowedRoles={['admin']}><Usuarios /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}


export default App
