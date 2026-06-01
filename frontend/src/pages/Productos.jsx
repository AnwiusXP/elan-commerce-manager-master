import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getProductos, crearProducto, editarProducto, eliminarProducto } from '../services/productoService'
import { getCategorias } from '../services/categoriaService'

function Productos() {
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', categoria_id: '', precio_base: '', precio_distribuidor: '', stock: '' })
  const [imagen, setImagen] = useState(null)

  useEffect(() => {
    cargarProductos()
    cargarCategorias()
  }, [])

  async function cargarProductos() {
    setCargando(true)
    const data = await getProductos()
    setProductos(data)
    setCargando(false)
  }

  async function cargarCategorias() {
    try {
      const data = await getCategorias()
      setCategorias(data)
      if (data.length > 0 && !form.categoria_id) {
        setForm(prev => ({ ...prev, categoria_id: data[0].id }))
      }
    } catch (e) {
      console.error('Error cargando categorías:', e)
    }
  }

  async function guardar() {
    if (!form.nombre || !form.precio_base || !form.precio_distribuidor || !form.stock || !form.categoria_id) { alert('Completa todos los campos'); return }
    const datos = { ...form, categoria_id: Number(form.categoria_id), precio_base: parseFloat(form.precio_base), precio_distribuidor: parseFloat(form.precio_distribuidor), stock: parseInt(form.stock), stockMin: 10 }
    if (editId !== null) {
      await editarProducto(editId, datos, imagen)
    } else {
      await crearProducto(datos, imagen)
    }
    await cargarProductos()
    cerrarModal()
  }

  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await eliminarProducto(id)
    await cargarProductos()
  }

  function abrirEditar(p) {
    setForm({ nombre: p.nombre, categoria_id: p.categoria_id || (categorias.length > 0 ? categorias[0].id : ''), precio_base: p.precio_base || p.precio, precio_distribuidor: p.precio_distribuidor || p.precio, stock: p.stock })
    setEditId(p.id)
    setImagen(null)
    setModal(true)
  }

  function cerrarModal() {
    setModal(false)
    setEditId(null)
    setForm({ nombre: '', categoria_id: categorias.length > 0 ? categorias[0].id : '', precio_base: '', precio_distribuidor: '', stock: '' })
    setImagen(null)
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #30363d',
    color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.9rem', outline: 'none', marginTop: '6px', boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="Productos" />
      <div style={{ marginLeft: '200px', padding: '32px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Gestión de Productos</h1>
          <button
            onClick={() => setModal(true)}
            style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontWeight: '600', cursor: 'pointer' }}
          >
            + Agregar producto
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%', maxWidth: '400px',
              background: '#0d1117', border: '1px solid #30363d',
              color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        {cargando ? (
          <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>Cargando productos...</div>
        ) : (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#21262d' }}>
                <tr>
                  {['Nombre', 'Categoría', 'Precios', 'Stock', 'Acciones'].map(h => (
                    <th key={h} style={{ color: '#8b949e', fontSize: '0.82rem', padding: '12px 20px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productos.filter(p => {
                  const nombre = (p.nombre || '').toLowerCase()
                  const categoria = (p.categoria || '').toLowerCase()
                  const termino = (busqueda || '').toLowerCase()
                  return nombre.includes(termino) || categoria.includes(termino)
                }).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '14px 20px' }}>{p.nombre}</td>
                    <td style={{ padding: '14px 20px', color: '#8b949e' }}>{p.categoria || '—'}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{fontSize: '0.85rem'}}>Público: ${(p.precio_base || p.precio).toLocaleString('es-CO')}</div>
                      <div style={{fontSize: '0.85rem', color: '#8b949e'}}>Mayorista: ${(p.precio_distribuidor || p.precio).toLocaleString('es-CO')}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>{p.stock}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <button onClick={() => abrirEditar(p)} style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', marginRight: '8px' }}>✏️ Editar</button>
                      <button onClick={() => handleEliminar(p.id)} style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid #f85149', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>🗑️ Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <h5 style={{ marginBottom: '24px', fontWeight: '700' }}>{editId !== null ? 'Editar' : 'Agregar'} Producto</h5>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Precio Público (Base)</label>
              <input type="number" value={form.precio_base} onChange={e => setForm({ ...form, precio_base: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Precio Mayorista (Distribuidor)</label>
              <input type="number" value={form.precio_distribuidor} onChange={e => setForm({ ...form, precio_distribuidor: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Stock</label>
              <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Categoría</label>
              <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })} style={inputStyle}>
                {categorias.length === 0 && <option value="">Sin categorías</option>}
                {categorias.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Imagen (opcional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImagen(e.target.files[0] || null)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button onClick={cerrarModal} style={{ flex: 1, background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={guardar} style={{ flex: 1, background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px', fontWeight: '600', cursor: 'pointer' }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Productos
