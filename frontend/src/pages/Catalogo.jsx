import { useState, useEffect } from 'react'
import api from '../services/api'
import NavbarPublico from '../components/NavbarPublico'
import ProductImage from '../components/ProductImage'
import { estaAutenticado, obtenerUsuario, logout } from '../services/authService'
import { getCategorias } from '../services/categoriaService'
import { useCarrito } from '../context/CarritoContext'
import CarruselPromo from '../components/CarruselPromo'
import CarritoDrawer from '../components/CarritoDrawer'

function Catalogo() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const { agregarAlCarrito: agregarAlContexto } = useCarrito()
  const autenticado = estaAutenticado()
  const [usuario] = useState(obtenerUsuario)
  
  // Estado para la Vista Previa (Modal)
  const [previewItem, setPreviewItem] = useState(null)

  async function cargarCategorias() {
    try {
      const data = await getCategorias()
      setCategorias(data)
    } catch (e) {
      console.error('Error cargando categorías:', e)
    }
  }

  async function cargarCatalogo() {
    setCargando(true)
    try {
      const res = await api.get('/api/catalogo')
      const normalizados = (res.data || []).map(p => ({
        ...p,
        categoria_id: p.categoria_id || null,
        categoria: p.categoria || 'Sin categoría'
      }))
      setProductos(normalizados)
    } catch (error) {
      console.error('Error cargando el catálogo:', error)
      setProductos([])
    }
    setCargando(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarCatalogo()
    cargarCategorias()
  }, [])

  const filtrados = productos.filter(p => {
    if (categoriaActiva && p.categoria_id !== categoriaActiva) return false
    return (p?.nombre || "").toLowerCase().includes((busqueda || "").toLowerCase())
  })

  function agregarAlCarrito(p) {
    agregarAlContexto(p)
    if (previewItem) {
      setPreviewItem(null)
    }
  }

  return (
    <div className="theme-public-clean">
      
      <NavbarPublico busqueda={busqueda} setBusqueda={setBusqueda} showSearch={true} usuario={usuario} onLogout={() => { logout(); window.location.reload() }} />

      {/* Hero / Carrusel */}
      <CarruselPromo />

      {/* Filtro por Categorías */}
      <div className="catalog-category-filter" style={{ padding: '24px 32px 0', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setCategoriaActiva(null)}
            style={{
              background: !categoriaActiva ? 'var(--color-brand-primary)' : '#f3f4f6',
              color: !categoriaActiva ? '#fff' : '#4b5563',
              border: 'none', borderRadius: '999px', padding: '8px 18px',
              fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Todas
          </button>
          {categorias.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoriaActiva(cat.id)}
              style={{
                background: categoriaActiva === cat.id ? 'var(--color-brand-primary)' : '#f3f4f6',
                color: categoriaActiva === cat.id ? '#fff' : '#4b5563',
                border: 'none', borderRadius: '999px', padding: '8px 18px',
                fontSize: '0.88rem', fontWeight: '600', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Productos */}
      <div className="catalog-products-section" style={{ padding: '32px 32px 56px', maxWidth: '1200px', margin: '0 auto' }} id="productos">
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0d1117', marginBottom: '32px' }}>
          Lo más vendido
        </h3>

        {cargando ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px', fontSize: '1.1rem' }}>
            Cargando catálogo premium...
          </div>
        ) : filtrados.length === 0 ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '60px', fontSize: '1.1rem', background: '#fff', borderRadius: '16px', border: '1px solid #e1e4e8' }}>
            No se encontraron productos disponibles.{categoriaActiva ? ' Intenta con otra categoría.' : ''}
          </div>
        ) : (
          <div id="productos-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
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
                  <ProductImage 
                    id={p.id} 
                    alt={p.nombre}
                    style={{ maxHeight: '100%', objectFit: 'cover', borderRadius: '0' }}
                  />
                  {usuario?.role === 'admin' && p.stock <= 5 && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'rgba(248, 81, 73, 0.9)', color: '#fff',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700'
                    }}>
                      ¡Solo quedan {p.stock}!
                    </div>
                  )}
                  {usuario?.role !== 'admin' && p.stock <= 0 && (
                    <div style={{
                      position: 'absolute', top: '12px', right: '12px',
                      background: 'rgba(248, 81, 73, 0.9)', color: '#fff',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700'
                    }}>
                      ❌ Agotado
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ color: '#6c757d', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                      {(p?.categoria) || 'Sin categoría'}
                    </div>
                    <div style={{ fontWeight: '700', color: '#212529', fontSize: '1.1rem', marginBottom: '12px', lineHeight: '1.3' }}>
                      {p.nombre}
                    </div>
                  </div>
                    {autenticado && p.precio != null ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                        <div style={{ color: 'var(--color-brand-primary)', fontSize: '1.25rem', fontWeight: '700' }}>
                          ${(p.precio || 0).toLocaleString('es-CO')}
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
                    ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Modal Vista Previa --- */}
      {previewItem && (
        <div 
          className="preview-overlay"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(13, 17, 23, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setPreviewItem(null)}
        >
          <div 
            className="preview-modal"
            style={{
              background: '#fff', borderRadius: '24px', overflow: 'hidden',
              display: 'flex', width: '100%', maxWidth: '850px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)', minHeight: '450px'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Left side: Image */}
            <div className="preview-modal-media" style={{ flex: '1', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <ProductImage 
                id={previewItem.id} 
                alt={previewItem.nombre}
                style={{ maxHeight: '400px', objectFit: 'contain', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))' }}
              />
            </div>
            
            {/* Right side: Details */}
            <div className="preview-modal-content" style={{ flex: '1', padding: '48px 40px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-brand-primary)', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {(previewItem?.categoria) || 'Sin categoría'}
                </span>
                <button 
                  onClick={() => setPreviewItem(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#adb5bd', cursor: 'pointer', lineHeight: '1' }}
                >
                  ✕
                </button>
              </div>
              
              <h2 className="preview-modal-title" style={{ fontSize: '2.2rem', color: '#212529', fontWeight: '800', lineHeight: '1.2', marginBottom: '16px' }}>
                {previewItem.nombre}
              </h2>
              
              {autenticado && previewItem.precio != null ? (
                <>
                  <div style={{ fontSize: '1.8rem', color: 'var(--color-brand-primary)', fontWeight: '700', marginBottom: '24px' }}>
                    ${(previewItem.precio || 0).toLocaleString('es-CO')}
                  </div>
                  
                  <p style={{ color: '#6c757d', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px', flex: '1' }}>
                    Producto premium de nuestra línea {(previewItem?.categoria) || 'Sin categoría'} para el cuidado de tu hogar. Formulado con ingredientes de alta calidad para garantizar limpieza y frescura excepcionales.
                  </p>
                  
                  <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: previewItem.stock > 5 ? '#2dd48b' : '#f85149' }}></div>
                    <span style={{ color: '#495057', fontWeight: '600', fontSize: '0.95rem' }}>
                      {usuario?.role === 'admin' ? `${previewItem.stock} unidades en stock` : (previewItem.stock > 0 ? '✅ Disponible' : '❌ Agotado')}
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
                </>
              ) : (
                <p style={{ color: '#6c757d', fontSize: '1rem', lineHeight: '1.6', marginBottom: '32px', flex: '1', marginTop: 'auto', display: 'flex', alignItems: 'flex-end' }}>
                  Producto premium de nuestra línea {(previewItem?.categoria) || 'Sin categoría'} para el cuidado de tu hogar. Formulado con ingredientes de alta calidad para garantizar limpieza y frescura excepcionales.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <CarritoDrawer />
    </div>
  )
}

export default Catalogo
