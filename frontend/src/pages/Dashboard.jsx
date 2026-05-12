import { useEffect, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js'
import Sidebar from '../components/Sidebar'
import { getProductos } from '../services/productoService'
import { getVentas } from '../services/ventaService'
import { getPrediccion } from '../services/predictService'

ChartJS.register(CategoryScale, LinearScale, BarElement)

function Dashboard() {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [ventasDelDia, setVentasDelDia] = useState(0)
  const [prediccionNivel, setPrediccionNivel] = useState('—')
  const [ventasMensuales, setVentasMensuales] = useState({ labels: [], data: [] })

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setCargando(true)
    try {
      // Cargar productos, ventas y predicción en paralelo
      const [dataProductos, dataVentas, dataPrediccion] = await Promise.all([
        getProductos(),
        getVentas().catch(() => []),
        getPrediccion().catch(() => null)
      ])

      setProductos(dataProductos)

      // --- Ventas del día ---
      const hoy = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
      const totalHoy = dataVentas
        .filter(v => v.fecha && v.fecha.slice(0, 10) === hoy)
        .reduce((acc, v) => acc + (v.total || 0), 0)
      setVentasDelDia(totalHoy)

      // --- Predicción IA ---
      if (dataPrediccion && dataPrediccion.nivel) {
        setPrediccionNivel(dataPrediccion.nivel)
      }

      // --- Gráfica: ventas agrupadas por mes (últimos 6 meses) ---
      const ahora = new Date()
      const mesesMap = {}
      const nombresMes = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

      // Inicializar los últimos 6 meses con 0
      for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        mesesMap[key] = { label: nombresMes[d.getMonth()], total: 0 }
      }

      // Sumar totales de ventas por mes
      dataVentas.forEach(v => {
        if (!v.fecha) return
        const mesKey = v.fecha.slice(0, 7) // "YYYY-MM"
        if (mesesMap[mesKey]) {
          mesesMap[mesKey].total += v.total || 0
        }
      })

      const labels = Object.values(mesesMap).map(m => m.label)
      const data = Object.values(mesesMap).map(m => m.total)
      setVentasMensuales({ labels, data })

    } catch (err) {
      console.error('Error cargando dashboard:', err)
    }
    setCargando(false)
  }

  const bajos = productos.filter(p => p.stock <= p.stockMin).length

  const dataGrafico = {
    labels: ventasMensuales.labels,
    datasets: [{
      data: ventasMensuales.data,
      backgroundColor: '#1e8a5e',
      borderRadius: 6,
    }]
  }

  const statsStyle = {
    background: '#161b22', border: '1px solid #30363d',
    borderRadius: '12px', padding: '24px', flex: 1
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar active="Inicio" />
      <div style={{ marginLeft: '200px', padding: '32px', flex: 1 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '28px' }}>
          Dashboard
        </h1>

        {cargando ? (
          <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>Cargando datos...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Total Productos</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700' }}>{productos.length}</div>
              </div>
              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Ventas del día</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1e8a5e' }}>
                  ${ventasDelDia.toLocaleString('es-CO')}
                </div>
              </div>
              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Bajo inventario</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: bajos > 0 ? '#f85149' : '#1e8a5e' }}>
                  {bajos} productos
                </div>
              </div>
              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Predicción</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: prediccionNivel === 'Alto' ? '#f85149' : '#1e8a5e' }}>
                  {prediccionNivel === 'Alto' ? 'Alta demanda' : prediccionNivel === 'Normal' ? 'Demanda normal' : prediccionNivel}
                </div>
              </div>
            </div>

            <div style={{
              background: '#161b22', border: '1px solid #30363d',
              borderRadius: '12px', padding: '24px'
            }}>
              <div style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '16px' }}>
                Ventas del mes
              </div>
              <Bar data={dataGrafico} options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
                  y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } }
                }
              }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default Dashboard