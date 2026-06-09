import { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { FileDown, Loader2, Table } from 'lucide-react';
import api from '../services/api';
import { Line } from 'react-chartjs-2';
import './Reportes.css';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import Sidebar from '../components/Sidebar';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function Reportes() {
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState("");
  const [prediccion, setPrediccion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [exportandoExcel, setExportandoExcel] = useState(false);
  const [error, setError] = useState(null);
  const reporteRef = useRef(null);
  const reportePdfRef = useRef(null);

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await api.get('/api/productos');
        setProductos(response.data);
      } catch (err) {
        console.error('Error cargando productos:', err);
        setProductos([]);
      }
    };
    fetchProductos();
  }, []);

  const ejecutarAnalisis = async () => {
    if (!productoId) {
      alert("Por favor, selecciona un producto primero");
      return;
    }
    setCargando(true);
    setError(null);
    setPrediccion(null);
    try {
      const response = await api.get('/api/ia/predict', { params: { producto: productoId } });
      setPrediccion(response.data);
    } catch {
      setError('Error en la conexion con el motor de IA.');
    } finally {
      setCargando(false);
    }
  };

  const crearNombreArchivo = (extension) => {
    const producto = prediccion?.producto || productoId || 'reporte';
    const limpio = String(producto).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'reporte';
    const fecha = new Date().toISOString().slice(0, 10);
    return `reporte_ia_${limpio}_${fecha}.${extension}`;
  };

  const descargarPdf = async () => {
    if (!reportePdfRef.current) return;
    setExportandoPdf(true);
    setError(null);
    try {
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: crearNombreArchivo('pdf'),
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .from(reportePdfRef.current)
        .save();
    } catch (err) {
      console.error('Error exportando PDF:', err);
      setError('No se pudo generar el PDF del reporte.');
    } finally {
      setExportandoPdf(false);
    }
  };

  const descargarExcel = async () => {
    setExportandoExcel(true);
    setError(null);
    try {
      const response = await api.get('/api/ia/predict/export', {
        params: { producto: productoId },
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', crearNombreArchivo('xlsx'));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando Excel:', err);
      setError('No se pudo descargar el Excel del reporte.');
    } finally {
      setExportandoExcel(false);
    }
  };

  const puedeExportar = !!prediccion && !cargando && !error && prediccion.nivel !== 'Error';
  const fechaReporte = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const chartOptionsDark = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#c9d1d9' }
      }
    },
    scales: {
      x: {
        ticks: { color: '#8b949e' },
        grid: { color: '#21262d' }
      },
      y: {
        ticks: { color: '#8b949e' },
        grid: { color: '#21262d' }
      }
    }
  };

  const chartOptionsPdf = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        labels: { color: '#374151', font: { size: 11 } }
      }
    },
    scales: {
      x: {
        ticks: { color: '#4b5563', maxRotation: 0 },
        grid: { color: '#e5e7eb' }
      },
      y: {
        ticks: { color: '#4b5563' },
        grid: { color: '#e5e7eb' }
      }
    }
  };

  const datosGraficaPdf = prediccion?.datosGrafica ? {
    ...prediccion.datosGrafica,
    datasets: (prediccion.datosGrafica.datasets || []).map((dataset) => ({
      ...dataset,
      borderColor: 'var(--color-primary)',
      backgroundColor: 'rgba(30, 138, 94, 0.14)',
      pointBackgroundColor: 'var(--color-primary)',
      pointBorderColor: '#ffffff'
    }))
  } : null;

  const statsStyle = {
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    padding: '24px',
    flex: 1
  };

  const inputStyle = {
    background: '#0d1117',
    color: '#c9d1d9',
    border: '1px solid #30363d',
    padding: '10px 16px',
    borderRadius: '6px',
    outline: 'none',
    marginRight: '12px'
  };

  const buttonStyle = {
    background: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background 0.2s'
  };

  const exportButtonStyle = (variant = 'primary', disabled = false) => ({
    ...buttonStyle,
    background: variant === 'primary' ? 'var(--color-primary)' : '#3b82f6',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  return (
    <div className="admin-layout" style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0d1117', color: '#c9d1d9' }}>
      <Sidebar active="Reportes" />

      <div className="admin-content">
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '28px' }}>
          Inteligencia de Negocios (IA)
        </h1>

        <div style={{ ...statsStyle, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <select
            style={inputStyle}
            value={productoId}
            onChange={(e) => setProductoId(e.target.value)}
          >
            <option value="">-- Seleccione un producto --</option>
            <option value="Todos">Todos los productos</option>
            {productos.map(p => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
          <button
            style={{ ...buttonStyle, opacity: cargando ? 0.7 : 1, cursor: cargando ? 'not-allowed' : 'pointer' }}
            onClick={ejecutarAnalisis}
            disabled={cargando}
          >
            {cargando ? 'Analizando...' : 'Analizar Datos'}
          </button>

          <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button
              style={exportButtonStyle('primary', !puedeExportar || exportandoPdf)}
              onClick={descargarPdf}
              disabled={!puedeExportar || exportandoPdf}
              title="Descargar reporte visual en PDF"
            >
              {exportandoPdf ? <Loader2 size={16} className="spin" /> : <FileDown size={16} />}
              {exportandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
            </button>
            <button
              style={exportButtonStyle('secondary', !puedeExportar || exportandoExcel)}
              onClick={descargarExcel}
              disabled={!puedeExportar || exportandoExcel}
              title="Descargar datos y proyecciones en Excel"
            >
              {exportandoExcel ? <Loader2 size={16} className="spin" /> : <Table size={16} />}
              {exportandoExcel ? 'Generando Excel...' : 'Descargar Excel'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: '#f8514920', color: '#f85149', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #f8514950' }}>
            {error}
          </div>
        )}

        {prediccion && (
          <div ref={reporteRef} style={{ backgroundColor: '#0d1117', color: '#c9d1d9', padding: '4px' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Producto Analizado</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>
                  {prediccion.producto !== "Todos" ? `ID: ${prediccion.producto}` : "Global"}
                </div>
              </div>

              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Demanda Proyectada (Prox. Dia)</div>
                <div style={{ fontSize: '1.8rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  {prediccion.cantidad_estimada} <span style={{ fontSize: '1rem', color: '#8b949e' }}>unidades</span>
                </div>
              </div>

              <div style={statsStyle}>
                <div style={{ color: '#8b949e', fontSize: '0.82rem', marginBottom: '8px' }}>Nivel de Alerta</div>
                <div style={{
                  fontSize: '1.8rem',
                  fontWeight: '700',
                  color: prediccion.nivel === 'Alto' ? '#f85149' : (prediccion.nivel === 'Normal' ? 'var(--color-primary)' : '#e3b341')
                }}>
                  {prediccion.nivel}
                </div>
              </div>
            </div>

            <div style={{ ...statsStyle, marginBottom: '24px', borderLeft: '4px solid #3b82f6' }}>
              <div style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span aria-hidden="true">*</span> Sugerencia Estrategica (IA)
              </div>
              <div style={{ fontSize: '1rem', lineHeight: '1.5' }}>
                {prediccion.recomendacion}
              </div>
            </div>

            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px' }}>
              <div style={{ color: '#8b949e', fontSize: '0.85rem', marginBottom: '16px' }}>
                Proyeccion de Ventas (Historico + XGBoost)
              </div>

              {prediccion.datosGrafica && prediccion.datosGrafica.labels.length > 0 ? (
                <Line
                  data={prediccion.datosGrafica}
                  options={chartOptionsDark}
                />
              ) : (
                <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>
                  No hay suficientes datos para graficar.
                </div>
              )}
            </div>
          </div>
        )}

        {prediccion && (
          <div className="pdf-export-stage" aria-hidden="true">
            <div ref={reportePdfRef} className="pdf-report">
              <header className="pdf-report-header pdf-section">
                <div>
                  <div className="pdf-brand">Elan Pure</div>
                  <h1>Reporte de Inteligencia de Negocios - Elan Pure</h1>
                </div>
                <div className="pdf-report-meta">
                  <div>{fechaReporte}</div>
                  <strong>{prediccion.producto !== "Todos" ? `Producto: ${prediccion.producto}` : 'Producto: Global'}</strong>
                </div>
              </header>

              <section className="pdf-kpi-grid pdf-section">
                <div className="pdf-kpi-card">
                  <span>Demanda proyectada</span>
                  <strong>{prediccion.cantidad_estimada}</strong>
                  <small>unidades</small>
                </div>
                <div className="pdf-kpi-card">
                  <span>Nivel de alerta</span>
                  <strong className={prediccion.nivel === 'Alto' ? 'pdf-alert-high' : 'pdf-alert-normal'}>
                    {prediccion.nivel}
                  </strong>
                  <small>estado del analisis</small>
                </div>
              </section>

              <section className="pdf-section pdf-text-section">
                <div className="pdf-section-label">Resumen Ejecutivo</div>
                <p>{prediccion.recomendacion}</p>
              </section>

              <section className="pdf-section pdf-chart-section">
                <div className="pdf-section-label">Proyeccion de Ventas</div>
                {datosGraficaPdf && datosGraficaPdf.labels.length > 0 ? (
                  <div className="pdf-chart-box">
                    <Line data={datosGraficaPdf} options={chartOptionsPdf} />
                  </div>
                ) : (
                  <div className="pdf-empty-chart">No hay suficientes datos para graficar.</div>
                )}
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reportes;
