import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

function Catalogo() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [carrito, setCarrito] = useState([])
  
  // Estado para la Vista Previa (Modal)
  const [previewItem, setPreviewItem] = useState(null)

  useEffect(() => {
    cargarCatalogo()
    const c = JSON.parse(localStorage.getItem('carrito')) || []
    setCarrito(c)
  }, [])

  async function cargarCatalogo() {
    setCargando(true)
    try {
      // Consume the public endpoint that only returns products with stock > 0
      const res = await api.get('/catalogo')
      setProductos(res.data)
    } catch (error) {
      console.error('Error cargando el catálogo:', error)
      // Fallback in case of backend failure
      setProductos([])
    }
    setCargando(false)
  }

  const filtrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.categoria.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalCarrito = carrito.reduce((a, it) => a + it.cantidad, 0)

  function agregarAlCarrito(p) {
    const existe = carrito.find(it => it.nombre === p.nombre)
    let nuevo
    if (existe) {
      // Check stock limit
      if (existe.cantidad >= p.stock) {
        alert(`❌ No puedes agregar más. El stock máximo es de ${p.stock} unidades.`)
        return
      }
      nuevo = carrito.map(it => it.nombre === p.nombre ? { ...it, cantidad: it.cantidad + 1 } : it)
    } else {
      if (p.stock < 1) {
        alert(`❌ Producto sin stock disponible.`)
        return
      }
      nuevo = [...carrito, { id: p.id, producto_id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 }]
    }
    setCarrito(nuevo)
    localStorage.setItem('carrito', JSON.stringify(nuevo))
    
    // Auto-close modal if it's open
    if (previewItem) {
      setPreviewItem(null)
    }
  }

  // Lógica de Imagen Segura (Fallback al placeholder)
  const handleImageError = (e) => {
    e.target.onerror = null; // Prevent infinite loop if fallback also fails
    e.target.src = '/placeholder.png'
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh', fontFamily: 'Segoe UI, sans-serif' }}>
      
      {/* Navbar */}
      <div style={{
        background: '#0d1117', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '14px 32px',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ color: '#e6edf3', fontWeight: '700', fontSize: '1.2rem', letterSpacing: '1px' }}>
          Élan Pure
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre o categoría..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            background: '#161b22', border: '1px solid #30363d', color: '#e6edf3',
            borderRadius: '20px', padding: '8px 18px', fontSize: '0.9rem', width: '300px', outline: 'none'
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/carrito" style={{
            color: '#1e8a5e', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600',
            background: 'rgba(30, 138, 94, 0.1)', border: '1px solid #1e8a5e',
            borderRadius: '20px', padding: '7px 16px', transition: 'all 0.2s'
          }}>
            🛒 Carrito ({totalCarrito})
          </Link>
          <Link to="/login" style={{
            color: '#8b949e', textDecoration: 'none', fontSize: '0.85rem',
            border: '1px solid #30363d', borderRadius: '20px', padding: '7px 16px',
            transition: 'all 0.2s'
          }}>
            🔐 Admin
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)', 
        color: '#e6edf3', textAlign: 'center', padding: '70px 32px',
        borderBottom: '1px solid #30363d'
      }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '12px', letterSpacing: '-0.5px' }}>
          Eleva tu rutina de cuidado
        </h2>
        <p style={{ color: '#8b949e', marginBottom: '32px', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 32px' }}>
          Descubre nuestra línea exclusiva de productos premium. Formulados para resaltar tu belleza natural.
        </p>
        <a href="#productos" style={{
          background: '#e6edf3', color: '#0d1117', borderRadius: '30px',
          padding: '12px 32px', fontWeight: '600', textDecoration: 'none',
          display: 'inline-block', transition: 'transform 0.2s'
        }}>
          Explorar Catálogo
        </a>
      </div>

      {/* Productos */}
      <div style={{ padding: '56px 32px', maxWidth: '1200px', margin: '0 auto' }} id="productos">
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d1117', marginBottom: '32px' }}>
          Lo más vendido
        </h3>

        {cargando ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px', fontSize: '1.1rem' }}>
            Cargando catálogo premium...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px', fontSize: '1.1rem', background: '#fff', borderRadius: '16px', border: '1px solid #e1e4e8' }}>
            No se encontraron productos disponibles con ese nombre.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {filtrados.map((p, i) => (
              <div key={i} style={{
                background: '#fff', border: '1px solid #e1e4e8', borderRadius: '16px',
                overflow: 'hidden', display: 'flex', flexDirection: 'column', 
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              className="product-card"
              onClick={() => setPreviewItem(p)}
              >
                {/* Image Section */}
                <div style={{ background: '#f1f3f5', height: '260px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={`/images/products/${p.id}.jpg`} 
                    alt={p.nombre}
                    onError={handleImageError}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }}
                  />
                  {p.stock <= 5 && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'rgba(248, 81, 73, 0.9)', color: '#fff',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700'
                    }}>
                      ¡Solo quedan {p.stock}!
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#6c757d', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      {p.categoria}
                    </div>
                    <div style={{ fontWeight: '700', color: '#212529', fontSize: '1.1rem', marginBottom: '12px', lineHeight: '1.3' }}>
                      {p.nombre}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                    <div style={{ color: '#1e8a5e', fontSize: '1.25rem', fontWeight: '700' }}>
                      ${p.precio.toLocaleString('es-CO')}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); agregarAlCarrito(p) }} 
                      style={{
                        background: '#0d1117', color: '#fff', border: 'none',
                        borderRadius: '50%', width: '40px', height: '40px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', fontSize: '1.1rem', transition: 'background 0.2s'
                      }}
                      title="Agregar rápido"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Modal Vista Previa --- */}
      {previewItem && (
        <div 
          style={{
            position: 'fixed', inset: 0, background: 'rgba(13, 17, 23, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setPreviewItem(null)}
        >
          <div 
            style={{
              background: '#fff', borderRadius: '24px', overflow: 'hidden',
              display: 'flex', width: '100%', maxWidth: '850px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', minHeight: '450px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Left side: Image */}
            <div style={{ flex: '1', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <img 
                src={`/images/products/${previewItem.id}.jpg`} 
                alt={previewItem.nombre}
                onError={handleImageError}
                style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
              />
            </div>
            
            {/* Right side: Details */}
            <div style={{ flex: '1', padding: '48px 40px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ color: '#1e8a5e', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {previewItem.categoria}
                </span>
                <button 
                  onClick={() => setPreviewItem(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#adb5bd', cursor: 'pointer', lineHeight: '1' }}
                >
                  ✕
                </button>
              </div>
              
              <h2 style={{ fontSize: '2.2rem', color: '#212529', fontWeight: '800', lineHeight: '1.2', marginBottom: '16px' }}>
                {previewItem.nombre}
              </h2>
              
              <div style={{ fontSize: '1.8rem', color: '#1e8a5e', fontWeight: '700', marginBottom: '24px' }}>
                ${previewItem.precio.toLocaleString('es-CO')}
              </div>
              
              <p style={{ color: '#6c757d', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px', flex: '1' }}>
                Un producto premium de nuestra línea {previewItem.categoria}. Ideal para el uso diario y formulado con ingredientes de la más alta calidad para garantizar resultados excepcionales.
              </p>
              
              <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: previewItem.stock > 5 ? '#2dd48b' : '#f85149' }}></div>
                <span style={{ color: '#495057', fontWeight: '600', fontSize: '0.95rem' }}>
                  {previewItem.stock} unidades en stock
                </span>
              </div>
              
              <button 
                onClick={() => agregarAlCarrito(previewItem)}
                style={{
                  background: '#0d1117', color: '#fff', border: 'none', borderRadius: '12px',
                  padding: '16px 24px', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer',
                  width: '100%', transition: 'background 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                }}
              >
                <span>Agregar al Carrito</span>
                <span>🛍️</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Catalogo