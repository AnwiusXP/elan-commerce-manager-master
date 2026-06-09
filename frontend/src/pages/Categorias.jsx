import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getCategorias, crearCategoria, editarCategoria, eliminarCategoria, seedCategoriasOficiales } from '../services/categoriaService'

function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })

  useEffect(() => {
    cargarCategorias()
  }, [])

  async function cargarCategorias() {
    setCargando(true)
    const data = await getCategorias()
    setCategorias(data)
    setCargando(false)
  }

  async function guardar() {
    if (!form.nombre) { alert('El nombre es obligatorio'); return }
    if (editId !== null) {
      await editarCategoria(editId, form)
    } else {
      await crearCategoria(form)
    }
    await cargarCategorias()
    cerrarModal()
  }

  async function handleSeed() {
    if (!confirm('¿Crear las 6 categorías oficiales?')) return
    try {
      const result = await seedCategoriasOficiales()
      alert(`Categorías creadas/actualizadas: ${result.total}`)
      await cargarCategorias()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error al ejecutar seed.'
      alert(msg)
    }
  }

  async function handleEliminar(id, nombre) {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return
    try {
      await eliminarCategoria(id)
      await cargarCategorias()
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo eliminar la categoría.'
      alert(msg)
    }
  }

  function abrirEditar(c) {
    setForm({ nombre: c.nombre, descripcion: c.descripcion || '' })
    setEditId(c.id)
    setModal(true)
  }

  function cerrarModal() {
    setModal(false)
    setEditId(null)
    setForm({ nombre: '', descripcion: '' })
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #30363d',
    color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.9rem', outline: 'none', marginTop: '6px', boxSizing: 'border-box'
  }

  return (
    <div className="admin-layout" style={{ display: 'flex' }}>
      <Sidebar active="Categorías" />
      <div className="admin-content">
        <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Gestión de Categorías</h1>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSeed}
              style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', borderRadius: '8px', padding: '9px 20px', fontWeight: '600', cursor: 'pointer' }}
            >
              🌱 Seed oficial
            </button>
            <button
              onClick={() => setModal(true)}
              style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '8px', padding: '9px 20px', fontWeight: '600', cursor: 'pointer' }}
            >
              + Agregar categoría
            </button>
          </div>
        </div>

        {cargando ? (
          <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>Cargando categorías...</div>
        ) : (
          <div className="table-responsive" style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#21262d' }}>
                <tr>
                  {['ID', 'Nombre', 'Descripción', 'Acciones'].map(h => (
                    <th key={h} style={{ color: '#8b949e', fontSize: '0.82rem', padding: '12px 20px', textAlign: 'left', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>
                      No hay categorías. Crea una para empezar.
                    </td>
                  </tr>
                ) : (
                  categorias.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #21262d' }}>
                      <td style={{ padding: '14px 20px', color: '#8b949e' }}>{c.id}</td>
                      <td style={{ padding: '14px 20px' }}>{c.nombre}</td>
                      <td style={{ padding: '14px 20px', color: '#8b949e' }}>{c.descripcion || '—'}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <button onClick={() => abrirEditar(c)} style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid var(--color-primary)', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', marginRight: '8px' }}>✏️ Editar</button>
                        <button onClick={() => handleEliminar(c.id, c.nombre)} style={{ background: 'rgba(248,81,73,0.1)', color: '#f85149', border: '1px solid #f85149', borderRadius: '6px', padding: '4px 12px', cursor: 'pointer' }}>🗑️ Eliminar</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '440px' }}>
            <h5 style={{ marginBottom: '24px', fontWeight: '700' }}>{editId !== null ? 'Editar' : 'Agregar'} Categoría</h5>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Nombre</label>
              <input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Descripción (opcional)</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }} />
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

export default Categorias
