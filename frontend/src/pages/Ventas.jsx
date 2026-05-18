import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getProductos } from '../services/productoService'
import { registrarVenta, getVentasHistorial, procesarReembolso } from '../services/ventaService'

function Ventas() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [selIndex, setSelIndex] = useState(0)
  const [cantidad, setCantidad] = useState(1)
  const [items, setItems] = useState([])
  const [alerta, setAlerta] = useState(false)
  const [exito, setExito] = useState(false)
  
  // Historial state
  const [tabIndex, setTabIndex] = useState(0) // 0 = Nueva Venta, 1 = Historial
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  useEffect(() => {
    cargarProductos()
  }, [])

  async function cargarProductos() {
    setCargando(true)
    const data = await getProductos()
    setProductos(data)
    setCargando(false)
  }

  async function cargarHistorial() {
    setCargandoHistorial(true)
    const data = await getVentasHistorial()
    setHistorial(data)
    setCargandoHistorial(false)
  }

  useEffect(() => {
    if (tabIndex === 1) cargarHistorial()
  }, [tabIndex])

  const total = items.reduce((a, it) => a + it.precio * it.cantidad, 0)

  function agregarItem() {
    const p = productos[selIndex]
    if (cantidad > p.stock) { setAlerta(true); return }
    setAlerta(false)
    const existente = items.find(it => it.nombre === p.nombre)
    if (existente) {
      setItems(items.map(it => it.nombre === p.nombre ? { ...it, cantidad: it.cantidad + cantidad } : it))
    } else {
      setItems([...items, { id: p.id, nombre: p.nombre, precio: p.precio, cantidad }])
    }
  }

  function eliminarItem(i) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  async function generarFactura() {
    if (items.length === 0) { alert('Agrega al menos un producto'); return }
    const itemsParaBackend = items.map(it => ({
      producto_id: it.id,
      nombre_producto: it.nombre,
      cantidad: it.cantidad,
      precio: it.precio
    }))
    const res = await registrarVenta(itemsParaBackend)
    if (res.ok) {
      setExito(true)
      setItems([])
      setTimeout(() => setExito(false), 3000)
    }
  }

  async function handleReembolso(ventaId) {
    if (!window.confirm(`¿Estás seguro de reembolsar la venta #${ventaId}?`)) return
    const res = await procesarReembolso(ventaId, null, 'Reembolso procesado desde Historial')
    if (res.ok) {
      alert('Reembolso procesado correctamente')
      cargarHistorial()
    } else {
      alert(`Error: ${res.mensaje}`)
    }
  }

  const inputStyle = {
    width: '100%', background: '#0d1117', border: '1px solid #30363d',
    color: '#e6edf3', borderRadius: '8px', padding: '10px 14px',
    fontSize: '0.9rem', outline: 'none', marginTop: '6px', boxSizing: 'border-box'
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="Ventas" />
      <div style={{ marginLeft: '200px', padding: '32px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', margin: 0 }}>Gestión de Ventas</h1>
          <div style={{ display: 'flex', gap: '10px', background: '#0d1117', padding: '4px', borderRadius: '8px', border: '1px solid #30363d' }}>
            <button 
              onClick={() => setTabIndex(0)}
              style={{ background: tabIndex === 0 ? '#21262d' : 'transparent', border: 'none', color: tabIndex === 0 ? '#e6edf3' : '#8b949e', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >Nueva Venta</button>
            <button 
              onClick={() => setTabIndex(1)}
              style={{ background: tabIndex === 1 ? '#21262d' : 'transparent', border: 'none', color: tabIndex === 1 ? '#e6edf3' : '#8b949e', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
            >Historial y Reembolsos</button>
          </div>
        </div>

        {tabIndex === 0 ? (
          cargando ? (
            <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>Cargando productos...</div>
          ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '28px' }}>

              {exito && (
                <div style={{ background: 'rgba(30,138,94,0.1)', border: '1px solid #1e8a5e', color: '#1e8a5e', borderRadius: '8px', padding: '10px 14px', fontSize: '0.88rem', marginBottom: '16px' }}>
                  ✅ Factura generada correctamente.
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Producto</label>
                <select value={selIndex} onChange={e => setSelIndex(parseInt(e.target.value))} style={inputStyle}>
                  {productos.map((p, i) => (
                    <option key={p.id} value={i}>{p.nombre} — ${p.precio.toLocaleString('es-CO')}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#c9d1d9', fontSize: '0.88rem' }}>Cantidad</label>
                <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value))} style={inputStyle} />
              </div>

              <button onClick={agregarItem} style={{ background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '10px 20px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
                + Agregar producto
              </button>

              {alerta && (
                <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.4)', color: '#f85149', borderRadius: '8px', padding: '10px 14px', fontSize: '0.85rem', marginTop: '12px' }}>
                  Stock insuficiente para este producto.
                </div>
              )}

              <div style={{ marginTop: '20px' }}>
                {items.map((it, i) => (
                  <div key={i} style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600' }}>{it.nombre}</div>
                      <div style={{ color: '#8b949e', fontSize: '0.85rem' }}>Cant: {it.cantidad} × ${it.precio.toLocaleString('es-CO')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#1e8a5e', fontWeight: '600' }}>${(it.precio * it.cantidad).toLocaleString('es-CO')}</span>
                      <button onClick={() => eliminarItem(i)} style={{ background: 'none', border: 'none', color: '#f85149', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', height: 'fit-content' }}>
              <div style={{ color: '#8b949e', fontSize: '0.82rem', textTransform: 'uppercase', marginBottom: '16px' }}>Resumen</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8b949e', fontSize: '0.9rem', marginBottom: '8px' }}>
                <span>Subtotal</span><span>${total.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1e8a5e', fontSize: '1.1rem', fontWeight: '700', borderTop: '1px solid #30363d', paddingTop: '12px' }}>
                <span>Total</span><span>${total.toLocaleString('es-CO')}</span>
              </div>
              <button onClick={generarFactura} style={{ background: '#1e8a5e', border: 'none', color: '#fff', borderRadius: '8px', padding: '12px', fontWeight: '600', width: '100%', marginTop: '16px', cursor: 'pointer' }}>
                Generar factura
              </button>
            </div>
          </div>
        ) : (
          cargandoHistorial ? (
            <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>Cargando historial...</div>
          ) : (
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ color: '#8b949e', fontSize: '0.85rem', textTransform: 'uppercase', borderBottom: '1px solid #30363d' }}>
                    <th style={{ padding: '12px 8px' }}>ID</th>
                    <th style={{ padding: '12px 8px' }}>Fecha</th>
                    <th style={{ padding: '12px 8px' }}>Monto</th>
                    <th style={{ padding: '12px 8px' }}>Método</th>
                    <th style={{ padding: '12px 8px' }}>Estado</th>
                    <th style={{ padding: '12px 8px', textAlign: 'right' }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #30363d' }}>
                      <td style={{ padding: '12px 8px', color: '#c9d1d9' }}>#{v.id}</td>
                      <td style={{ padding: '12px 8px', color: '#8b949e' }}>{new Date(v.fecha).toLocaleString('es-CO')}</td>
                      <td style={{ padding: '12px 8px', color: '#1e8a5e', fontWeight: '600' }}>${v.total.toLocaleString('es-CO')}</td>
                      <td style={{ padding: '12px 8px', color: '#8b949e' }}>{v.metodo_pago}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600',
                          background: v.estado === 'APROBADA' ? 'rgba(45,212,139,0.1)' : v.estado === 'REEMBOLSADA' ? 'rgba(227,179,65,0.1)' : 'rgba(248,81,73,0.1)',
                          color: v.estado === 'APROBADA' ? '#2dd48b' : v.estado === 'REEMBOLSADA' ? '#e3b341' : '#f85149'
                        }}>
                          {v.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        {v.estado === 'APROBADA' && (
                          <button onClick={() => handleReembolso(v.id)} style={{ background: 'transparent', border: '1px solid #e3b341', color: '#e3b341', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                            Reembolsar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {historial.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: '#8b949e' }}>No hay ventas registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Ventas