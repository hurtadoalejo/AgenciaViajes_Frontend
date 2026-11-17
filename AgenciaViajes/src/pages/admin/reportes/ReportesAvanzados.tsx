import { useState, useEffect, useRef } from 'react';
import styles from '../AdminCrud.module.css';
import type { ClienteGastoItem, RutaPasajerosItem } from '../../../types';
import { exportarReportePdf } from '../../../utils/exportarReportePdf';
import GraficoBarrasReporte from './GraficoBarrasReporte';

const API_BASE = 'http://localhost:8080/api';

type ReporteAvanzadoId =
  | 'CLIENTES_SOBRE_PROMEDIO'
  | 'RUTAS_SOBRE_PROMEDIO'
  | 'RUTAS_BAJO_PROMEDIO';

function obtenerFechaLocalISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

export default function ReportesAvanzados() {
  const [reporteActivo, setReporteActivo] = useState<ReporteAvanzadoId>(
    'CLIENTES_SOBRE_PROMEDIO'
  );

  const [clientesVip, setClientesVip] = useState<ClienteGastoItem[]>([]);
  const [rutasSobrePromedio, setRutasSobrePromedio] = useState<RutaPasajerosItem[]>([]);
  const [rutasBajoPromedio, setRutasBajoPromedio] = useState<RutaPasajerosItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtro de transporte para los reportes de rutas con subconsulta
  const [filtroTipoTransporte, setFiltroTipoTransporte] = useState<string>('');

  const canvasGraficoRef = useRef<HTMLCanvasElement | null>(null);
  const fechaHoy = obtenerFechaLocalISO();

  useEffect(() => {
    let activo = true;

    const cargarReportesAvanzados = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryTipo = filtroTipoTransporte
          ? `?tipo=${encodeURIComponent(filtroTipoTransporte)}`
          : '';

        const [clientesRes, sobreRes, bajoRes] = await Promise.all([
          fetch(`${API_BASE}/reportes/clientes-sobre-promedio`),
          fetch(`${API_BASE}/reportes/rutas-sobre-promedio${queryTipo}`),
          fetch(`${API_BASE}/reportes/rutas-bajo-promedio${queryTipo}`),
        ]);

        if (!clientesRes.ok || !sobreRes.ok || !bajoRes.ok) {
          throw new Error('No se pudieron cargar los reportes avanzados desde el servidor.');
        }

        const [clientesData, sobreData, bajoData]: [
          ClienteGastoItem[],
          RutaPasajerosItem[],
          RutaPasajerosItem[],
        ] = await Promise.all([clientesRes.json(), sobreRes.json(), bajoRes.json()]);

        if (activo) {
          setClientesVip(clientesData);
          setRutasSobrePromedio(sobreData);
          setRutasBajoPromedio(bajoData);
        }
      } catch (err) {
        if (activo) {
          setError(err instanceof Error ? err.message : 'Error de conexión con el servidor.');
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    };

    cargarReportesAvanzados();

    return () => {
      activo = false;
    };
  }, [filtroTipoTransporte]);

  const promedioGeneralClientes =
    clientesVip.length > 0 ? Number(clientesVip[0].promedioClientes) : 0;
  const totalGastadoClientesVip = clientesVip.reduce(
    (acc, c) => acc + Number(c.totalGastado),
    0
  );

  const rutasActuales =
    reporteActivo === 'RUTAS_SOBRE_PROMEDIO' ? rutasSobrePromedio : rutasBajoPromedio;
  const totalPasajerosRutas = rutasActuales.reduce((acc, r) => acc + Number(r.pasajeros), 0);

  const cantidadRegistrosActual =
    reporteActivo === 'CLIENTES_SOBRE_PROMEDIO' ? clientesVip.length : rutasActuales.length;

  const handleExportarPDF = () => {
    if (reporteActivo === 'CLIENTES_SOBRE_PROMEDIO') {
      const imagenGrafico = canvasGraficoRef.current?.toDataURL('image/png');
      exportarReportePdf({
        tituloReporte: 'Reporte de Clientes VIP (Gasto Superior al Promedio)',
        subtituloTabla: 'Reporte Avanzado (Subconsulta escalar sobre promedio global de clientes)',
        resumenKpis: `Clientes sobre promedio: ${clientesVip.length}   |   Promedio global: ${formatearMoneda(promedioGeneralClientes)}   |   Gasto acumulado VIP: ${formatearMoneda(totalGastadoClientesVip)}`,
        filtrosTexto: 'Clientes con pagos aprobados superiores al promedio general',
        columnas: ['ID', 'Cliente', 'Correo', 'Reservas', 'Total Gastado', 'Promedio Global'],
        filas: clientesVip.map((c) => [
          `#${c.idCliente}`,
          c.nombreCliente,
          c.correo,
          c.cantidadReservas,
          formatearMoneda(Number(c.totalGastado)),
          formatearMoneda(Number(c.promedioClientes)),
        ]),
        nombreArchivo: `ViajaPorEuropa_ClientesSobrePromedio_${fechaHoy}.pdf`,
        imagenGrafico,
      });
      return;
    }

    const esSobre = reporteActivo === 'RUTAS_SOBRE_PROMEDIO';
    exportarReportePdf({
      tituloReporte: esSobre
        ? 'Rutas Líderes (Ocupación Superior al Promedio de su Categoría)'
        : 'Rutas de Baja Ocupación (Inferior al Promedio de su Categoría)',
      subtituloTabla:
        'Reporte Avanzado (Subconsulta correlacionada por tipo de transporte en HAVING)',
      resumenKpis: `Rutas detectadas: ${rutasActuales.length}   |   Pasajeros acumulados: ${totalPasajerosRutas}   |   Categoría: ${filtroTipoTransporte || 'Todas'}`,
      filtrosTexto: `Tipo de transporte: ${filtroTipoTransporte || 'Todos (AVION, BUS, TREN)'}`,
      columnas: [
        'ID Ruta',
        'Origen',
        'Destino',
        'Transporte',
        'Reservas',
        'Pasajeros',
        'Promedio Categoría',
      ],
      filas: rutasActuales.map((r) => [
        `#${r.idRuta}`,
        r.origen,
        r.destino,
        r.tipoTransporte,
        r.reservas,
        `${r.pasajeros} pax`,
        r.promedioCategoria !== null ? `${Number(r.promedioCategoria).toFixed(1)} pax` : 'N/A',
      ]),
      nombreArchivo: `ViajaPorEuropa_${esSobre ? 'RutasSobrePromedio' : 'RutasBajoPromedio'}_${fechaHoy}.pdf`,
    });
  };

  return (
    <>
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="selectorReporteAvanzado">
              Seleccionar reporte avanzado (Subconsultas SQL)
            </label>
            <select
              id="selectorReporteAvanzado"
              value={reporteActivo}
              onChange={(e) => setReporteActivo(e.target.value as ReporteAvanzadoId)}
            >
              <option value="CLIENTES_SOBRE_PROMEDIO">
                Reporte 8: Clientes con Gasto Superior al Promedio (Con Gráfico)
              </option>
              <option value="RUTAS_SOBRE_PROMEDIO">
                Reporte 9: Rutas Más Vendidas vs. Promedio de su Categoría
              </option>
              <option value="RUTAS_BAJO_PROMEDIO">
                Reporte 10: Rutas Menos Eficientes vs. Promedio de su Categoría
              </option>
            </select>
          </div>

          {reporteActivo !== 'CLIENTES_SOBRE_PROMEDIO' && (
            <div className={styles.inputGroup}>
              <label htmlFor="filtroTipoTransporte">Filtrar por tipo de transporte</label>
              <select
                id="filtroTipoTransporte"
                value={filtroTipoTransporte}
                onChange={(e) => setFiltroTipoTransporte(e.target.value)}
              >
                <option value="">Todos los tipos</option>
                <option value="AVION">AVIÓN</option>
                <option value="BUS">BUS</option>
                <option value="TREN">TREN</option>
              </select>
            </div>
          )}
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            {reporteActivo === 'CLIENTES_SOBRE_PROMEDIO'
              ? `Clientes VIP: ${clientesVip.length} | Promedio general de gasto: ${formatearMoneda(promedioGeneralClientes)} | Total acumulado VIP: ${formatearMoneda(totalGastadoClientesVip)}`
              : `Rutas identificadas: ${rutasActuales.length} | Pasajeros acumulados: ${totalPasajerosRutas}`}
          </span>

          <button
            type="button"
            onClick={handleExportarPDF}
            disabled={loading || cantidadRegistrosActual === 0}
            className={styles.primaryButton}
          >
            Exportar a PDF
          </button>
        </div>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}

      {/* Gráfico estadístico #3: Clientes VIP vs. Promedio Global */}
      {!loading && reporteActivo === 'CLIENTES_SOBRE_PROMEDIO' && clientesVip.length > 0 && (
        <GraficoBarrasReporte
          canvasRef={canvasGraficoRef}
          titulo="Clientes con Mayor Facturación frente al Promedio General"
          subtitulo="Comparativa de gasto acumulado por cliente frente al umbral promedio de Viaja por Europa"
          colorBarra="#1d4ed8"
          lineaReferencia={{
            valor: promedioGeneralClientes,
            etiqueta: `Promedio general: ${formatearMoneda(promedioGeneralClientes)}`,
          }}
          datos={clientesVip.slice(0, 10).map((c) => ({
            etiqueta: c.nombreCliente,
            valor: Number(c.totalGastado),
            valorFormateado: formatearMoneda(Number(c.totalGastado)),
          }))}
        />
      )}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Ejecutando análisis con subconsultas SQL...</div>
        ) : cantidadRegistrosActual === 0 ? (
          <div className={styles.emptyState}>
            No se encontraron registros que cumplan la condición de la subconsulta.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            {reporteActivo === 'CLIENTES_SOBRE_PROMEDIO' ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Correo Electrónico</th>
                    <th>Reservas</th>
                    <th>Total Gastado</th>
                    <th>Promedio General</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesVip.map((c) => (
                    <tr key={c.idCliente}>
                      <td>
                        <span className={styles.secondaryText}>#{c.idCliente}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{c.nombreCliente}</span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{c.correo}</span>
                      </td>
                      <td>
                        <span className={styles.badgeAdmin}>{c.cantidadReservas} reservas</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {formatearMoneda(Number(c.totalGastado))}
                        </span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>
                          {formatearMoneda(Number(c.promedioClientes))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Ruta</th>
                    <th>Trayecto (Origen → Destino)</th>
                    <th>Transporte</th>
                    <th>Reservas</th>
                    <th>Pasajeros</th>
                    <th>Promedio de su Categoría</th>
                  </tr>
                </thead>
                <tbody>
                  {rutasActuales.map((r) => (
                    <tr key={r.idRuta}>
                      <td>
                        <span className={styles.secondaryText}>#{r.idRuta}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {r.origen} → {r.destino}
                        </span>
                      </td>
                      <td>
                        <span className={styles.badgeEmpleado}>{r.tipoTransporte}</span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{r.reservas} reservas</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{r.pasajeros} pasajeros</span>
                      </td>
                      <td>
                        <span
                          className={
                            reporteActivo === 'RUTAS_SOBRE_PROMEDIO'
                              ? styles.badgeAdmin
                              : styles.badgeEmpleado
                          }
                          style={
                            reporteActivo === 'RUTAS_SOBRE_PROMEDIO'
                              ? { backgroundColor: '#dcfce7', color: '#15803d' }
                              : { backgroundColor: '#fee2e2', color: '#b91c1c' }
                          }
                        >
                          {r.promedioCategoria !== null
                            ? `${Number(r.promedioCategoria).toFixed(1)} pasajeros`
                            : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}