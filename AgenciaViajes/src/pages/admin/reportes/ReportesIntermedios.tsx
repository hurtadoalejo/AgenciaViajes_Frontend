import { useState, useEffect, useRef } from 'react';
import styles from '../AdminCrud.module.css';
import type {
  VentaMensualItem,
  IngresoMetodoPagoItem,
  ReservasEmpleadoItem,
  RutaPasajerosItem,
} from '../../../types';
import { exportarReportePdf } from '../../../utils/exportarReportePdf';
import GraficoBarrasReporte from './GraficoBarrasReporte';

const API_BASE = 'http://localhost:8080/api';

type ReporteIntermedioId =
  | 'VENTAS_MENSUALES'
  | 'INGRESOS_METODO_PAGO'
  | 'RESERVAS_EMPLEADO'
  | 'RUTAS_MAS_PASAJEROS';

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

export default function ReportesIntermedios() {
  const [reporteActivo, setReporteActivo] = useState<ReporteIntermedioId>('VENTAS_MENSUALES');

  const [ventasMensuales, setVentasMensuales] = useState<VentaMensualItem[]>([]);
  const [ingresosMetodo, setIngresosMetodo] = useState<IngresoMetodoPagoItem[]>([]);
  const [reservasEmpleado, setReservasEmpleado] = useState<ReservasEmpleadoItem[]>([]);
  const [rutasPasajeros, setRutasPasajeros] = useState<RutaPasajerosItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros dinámicos
  const [filtroAnio, setFiltroAnio] = useState<string>(String(new Date().getFullYear()));
  const [filtroSede, setFiltroSede] = useState<string>('');
  const [filtroCargo, setFiltroCargo] = useState<string>('');
  const [limiteRutas, setLimiteRutas] = useState<number>(10);
  const [filtroTipoRuta, setFiltroTipoRuta] = useState<string>('');

  const canvasGraficoRef = useRef<HTMLCanvasElement | null>(null);
  const fechaHoy = obtenerFechaLocalISO();

  useEffect(() => {
    let activo = true;

    const cargarReportes = async () => {
      setLoading(true);
      setError(null);

      try {
        const queryAnio = filtroAnio.trim() ? `?anio=${encodeURIComponent(filtroAnio.trim())}` : '';
        const [ventasRes, metodosRes, empleadosRes, rutasRes] = await Promise.all([
          fetch(`${API_BASE}/reportes/ventas-mensuales${queryAnio}`),
          fetch(`${API_BASE}/reportes/ingresos-metodo-pago`),
          fetch(`${API_BASE}/reportes/reservas-por-empleado`),
          fetch(`${API_BASE}/reportes/rutas-mas-pasajeros?limite=${limiteRutas}`),
        ]);

        if (!ventasRes.ok || !metodosRes.ok || !empleadosRes.ok || !rutasRes.ok) {
          throw new Error('No se pudieron cargar los reportes intermedios desde el servidor.');
        }

        const [ventasData, metodosData, empleadosData, rutasData]: [
          VentaMensualItem[],
          IngresoMetodoPagoItem[],
          ReservasEmpleadoItem[],
          RutaPasajerosItem[],
        ] = await Promise.all([
          ventasRes.json(),
          metodosRes.json(),
          empleadosRes.json(),
          rutasRes.json(),
        ]);

        if (activo) {
          setVentasMensuales(ventasData);
          setIngresosMetodo(metodosData);
          setReservasEmpleado(empleadosData);
          setRutasPasajeros(rutasData);
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

    cargarReportes();

    return () => {
      activo = false;
    };
  }, [filtroAnio, limiteRutas]);

  // Filtros en memoria para empleados y rutas
  const sedesUnicas = Array.from(new Set(reservasEmpleado.map((e) => e.sede))).sort();
  const cargosUnicos = Array.from(new Set(reservasEmpleado.map((e) => e.cargo))).sort();
  const tiposTransporteUnicos = Array.from(
    new Set(rutasPasajeros.map((r) => r.tipoTransporte))
  ).sort();

  const empleadosFiltrados = reservasEmpleado.filter((e) => {
    if (filtroSede && e.sede !== filtroSede) return false;
    if (filtroCargo && e.cargo !== filtroCargo) return false;
    return true;
  });

  const rutasFiltradas = rutasPasajeros.filter((r) => {
    if (filtroTipoRuta && r.tipoTransporte !== filtroTipoRuta) return false;
    return true;
  });

  // KPIs
  const totalVentasPeriodo = ventasMensuales.reduce((acc, v) => acc + Number(v.totalVendido), 0);
  const totalTransaccionesMes = ventasMensuales.reduce(
    (acc, v) => acc + Number(v.cantidadVentas),
    0
  );

  const totalIngresosMetodos = ingresosMetodo.reduce(
    (acc, m) => acc + Number(m.totalIngresos),
    0
  );
  const totalPagosMetodos = ingresosMetodo.reduce((acc, m) => acc + Number(m.cantidadPagos), 0);

  const totalReservasEmpleados = empleadosFiltrados.reduce(
    (acc, e) => acc + Number(e.cantidadReservas),
    0
  );
  const totalVendidoEmpleados = empleadosFiltrados.reduce(
    (acc, e) => acc + Number(e.totalVendido),
    0
  );

  const totalPasajerosRutas = rutasFiltradas.reduce((acc, r) => acc + Number(r.pasajeros), 0);
  const totalReservasRutas = rutasFiltradas.reduce((acc, r) => acc + Number(r.reservas), 0);

  const cantidadRegistrosActual =
    reporteActivo === 'VENTAS_MENSUALES'
      ? ventasMensuales.length
      : reporteActivo === 'INGRESOS_METODO_PAGO'
      ? ingresosMetodo.length
      : reporteActivo === 'RESERVAS_EMPLEADO'
      ? empleadosFiltrados.length
      : rutasFiltradas.length;

  const handleExportarPDF = () => {
    const imagenGrafico =
      reporteActivo === 'VENTAS_MENSUALES' || reporteActivo === 'INGRESOS_METODO_PAGO'
        ? canvasGraficoRef.current?.toDataURL('image/png')
        : undefined;

    if (reporteActivo === 'VENTAS_MENSUALES') {
      exportarReportePdf({
        tituloReporte: 'Reporte de Ventas Mensuales Aprobadas',
        subtituloTabla: 'Reporte Intermedio (JOIN Transaccion - Reserva + GROUP BY periodo)',
        resumenKpis: `Meses con ventas: ${ventasMensuales.length}   |   Pagos aprobados: ${totalTransaccionesMes}   |   Total vendido: ${formatearMoneda(totalVentasPeriodo)}`,
        filtrosTexto: `Año consultado: ${filtroAnio || 'Todos los años'}`,
        columnas: ['Período (Año-Mes)', 'Cantidad de Ventas', 'Total Vendido'],
        filas: ventasMensuales.map((v) => [
          v.periodo,
          `${v.cantidadVentas} ventas`,
          formatearMoneda(Number(v.totalVendido)),
        ]),
        nombreArchivo: `ViajaPorEuropa_VentasMensuales_${fechaHoy}.pdf`,
        imagenGrafico,
      });
      return;
    }

    if (reporteActivo === 'INGRESOS_METODO_PAGO') {
      exportarReportePdf({
        tituloReporte: 'Reporte de Ingresos por Método de Pago',
        subtituloTabla: 'Reporte Intermedio (JOIN Transaccion - MetodoPago + GROUP BY)',
        resumenKpis: `Métodos activos: ${ingresosMetodo.length}   |   Total pagos: ${totalPagosMetodos}   |   Recaudo total: ${formatearMoneda(totalIngresosMetodos)}`,
        filtrosTexto: 'Todos los pagos aprobados del sistema',
        columnas: ['Método de Pago', 'Cantidad de Pagos', 'Total Recaudado', 'Participación (%)'],
        filas: ingresosMetodo.map((m) => [
          m.metodoPago,
          `${m.cantidadPagos} pagos`,
          formatearMoneda(Number(m.totalIngresos)),
          `${Number(m.porcentaje).toFixed(2)}%`,
        ]),
        nombreArchivo: `ViajaPorEuropa_IngresosMetodoPago_${fechaHoy}.pdf`,
        imagenGrafico,
      });
      return;
    }

    if (reporteActivo === 'RESERVAS_EMPLEADO') {
      exportarReportePdf({
        tituloReporte: 'Reporte de Gestión Comercial por Empleado',
        subtituloTabla: 'Reporte Intermedio (Multitabla Empleado - Usuario - Sede - Reserva + GROUP BY)',
        resumenKpis: `Empleados analizados: ${empleadosFiltrados.length}   |   Reservas gestionadas: ${totalReservasEmpleados}   |   Ventas aprobadas: ${formatearMoneda(totalVendidoEmpleados)}`,
        filtrosTexto: `Sede: ${filtroSede || 'Todas'} | Cargo: ${filtroCargo || 'Todos'}`,
        columnas: ['ID', 'Empleado', 'Cargo', 'Sede', 'Reservas', 'Total Vendido'],
        filas: empleadosFiltrados.map((e) => [
          `#${e.idEmpleado}`,
          e.nombreEmpleado,
          e.cargo,
          e.sede,
          e.cantidadReservas,
          formatearMoneda(Number(e.totalVendido)),
        ]),
        nombreArchivo: `ViajaPorEuropa_ReservasPorEmpleado_${fechaHoy}.pdf`,
      });
      return;
    }

    exportarReportePdf({
      tituloReporte: `Top ${limiteRutas} Rutas con Mayor Demanda de Pasajeros`,
      subtituloTabla: 'Reporte Intermedio (Multitabla Ruta - Ciudad - Vehiculo - DetalleReserva + GROUP BY)',
      resumenKpis: `Rutas listadas: ${rutasFiltradas.length}   |   Reservas activas: ${totalReservasRutas}   |   Total pasajeros movilizados: ${totalPasajerosRutas}`,
      filtrosTexto: `Límite Top: ${limiteRutas} | Tipo de transporte: ${filtroTipoRuta || 'Todos'}`,
      columnas: ['ID Ruta', 'Origen', 'Destino', 'Transporte', 'Reservas', 'Pasajeros'],
      filas: rutasFiltradas.map((r) => [
        `#${r.idRuta}`,
        r.origen,
        r.destino,
        r.tipoTransporte,
        r.reservas,
        `${r.pasajeros} pasajeros`,
      ]),
      nombreArchivo: `ViajaPorEuropa_TopRutasPasajeros_${fechaHoy}.pdf`,
    });
  };

  return (
    <>
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="selectorReporteIntermedio">
              Seleccionar reporte intermedio (Multitabla / GROUP BY)
            </label>
            <select
              id="selectorReporteIntermedio"
              value={reporteActivo}
              onChange={(e) => setReporteActivo(e.target.value as ReporteIntermedioId)}
            >
              <option value="VENTAS_MENSUALES">
                Reporte 4: Ventas Mensuales Aprobadas (Con Gráfico)
              </option>
              <option value="INGRESOS_METODO_PAGO">
                Reporte 5: Ingresos por Método de Pago (Con Gráfico)
              </option>
              <option value="RESERVAS_EMPLEADO">
                Reporte 6: Desempeño y Reservas por Empleado
              </option>
              <option value="RUTAS_MAS_PASAJEROS">
                Reporte 7: Ranking de Rutas con Más Pasajeros
              </option>
            </select>
          </div>

          {reporteActivo === 'VENTAS_MENSUALES' && (
            <div className={styles.inputGroup}>
              <label htmlFor="filtroAnio">Filtrar por año</label>
              <select
                id="filtroAnio"
                value={filtroAnio}
                onChange={(e) => setFiltroAnio(e.target.value)}
              >
                <option value="">Todos los años</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          )}

          {reporteActivo === 'RESERVAS_EMPLEADO' && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="filtroSede">Filtrar por sede</label>
                <select
                  id="filtroSede"
                  value={filtroSede}
                  onChange={(e) => setFiltroSede(e.target.value)}
                >
                  <option value="">Todas las sedes</option>
                  {sedesUnicas.map((sede) => (
                    <option key={sede} value={sede}>
                      {sede}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroCargo">Filtrar por cargo</label>
                <select
                  id="filtroCargo"
                  value={filtroCargo}
                  onChange={(e) => setFiltroCargo(e.target.value)}
                >
                  <option value="">Todos los cargos</option>
                  {cargosUnicos.map((cargo) => (
                    <option key={cargo} value={cargo}>
                      {cargo}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reporteActivo === 'RUTAS_MAS_PASAJEROS' && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="limiteRutas">Cantidad de rutas (Top)</label>
                <select
                  id="limiteRutas"
                  value={limiteRutas}
                  onChange={(e) => setLimiteRutas(Number(e.target.value))}
                >
                  <option value={5}>Top 5 rutas</option>
                  <option value={10}>Top 10 rutas</option>
                  <option value={20}>Top 20 rutas</option>
                  <option value={50}>Top 50 rutas</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroTipoRuta">Tipo de transporte</label>
                <select
                  id="filtroTipoRuta"
                  value={filtroTipoRuta}
                  onChange={(e) => setFiltroTipoRuta(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {tiposTransporteUnicos.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            {reporteActivo === 'VENTAS_MENSUALES' &&
              `Períodos analizados: ${ventasMensuales.length} | Pagos aprobados: ${totalTransaccionesMes} | Total vendido: ${formatearMoneda(totalVentasPeriodo)}`}
            {reporteActivo === 'INGRESOS_METODO_PAGO' &&
              `Métodos de pago: ${ingresosMetodo.length} | Total pagos: ${totalPagosMetodos} | Recaudo total: ${formatearMoneda(totalIngresosMetodos)}`}
            {reporteActivo === 'RESERVAS_EMPLEADO' &&
              `Empleados listados: ${empleadosFiltrados.length} | Reservas gestionadas: ${totalReservasEmpleados} | Total vendido: ${formatearMoneda(totalVendidoEmpleados)}`}
            {reporteActivo === 'RUTAS_MAS_PASAJEROS' &&
              `Rutas listadas: ${rutasFiltradas.length} | Reservas activas: ${totalReservasRutas} | Total pasajeros: ${totalPasajerosRutas}`}
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

      {/* Gráfico estadístico #1: Ventas Mensuales */}
      {!loading && reporteActivo === 'VENTAS_MENSUALES' && ventasMensuales.length > 0 && (
        <GraficoBarrasReporte
          canvasRef={canvasGraficoRef}
          titulo="Evolución de Ventas Mensuales Aprobadas"
          subtitulo={`Ingresos consolidados por período (${filtroAnio || 'Histórico completo'})`}
          colorBarra="#2563eb"
          datos={[...ventasMensuales].reverse().map((v) => ({
            etiqueta: v.periodo,
            valor: Number(v.totalVendido),
            valorFormateado: formatearMoneda(Number(v.totalVendido)),
          }))}
        />
      )}

      {/* Gráfico estadístico #2: Ingresos por Método de Pago */}
      {!loading && reporteActivo === 'INGRESOS_METODO_PAGO' && ingresosMetodo.length > 0 && (
        <GraficoBarrasReporte
          canvasRef={canvasGraficoRef}
          titulo="Distribución de Ingresos por Método de Pago"
          subtitulo="Recaudo total y participación porcentual sobre pagos aprobados"
          colorBarra="#0284c7"
          datos={ingresosMetodo.map((m) => ({
            etiqueta: `${m.metodoPago} (${Number(m.porcentaje).toFixed(1)}%)`,
            valor: Number(m.totalIngresos),
            valorFormateado: formatearMoneda(Number(m.totalIngresos)),
          }))}
        />
      )}

      {/* Tabla de datos */}
      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Consultando indicadores multitabla...</div>
        ) : cantidadRegistrosActual === 0 ? (
          <div className={styles.emptyState}>
            No hay registros disponibles para el reporte seleccionado.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            {reporteActivo === 'VENTAS_MENSUALES' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Período (Año-Mes)</th>
                    <th>Transacciones Aprobadas</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasMensuales.map((v) => (
                    <tr key={v.periodo}>
                      <td>
                        <span className={styles.primaryText}>{v.periodo}</span>
                      </td>
                      <td>
                        <span className={styles.badgeAdmin}>{v.cantidadVentas} ventas</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {formatearMoneda(Number(v.totalVendido))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reporteActivo === 'INGRESOS_METODO_PAGO' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Método de Pago</th>
                    <th>Cantidad de Pagos</th>
                    <th>Total Recaudado</th>
                    <th>Participación</th>
                  </tr>
                </thead>
                <tbody>
                  {ingresosMetodo.map((m) => (
                    <tr key={m.metodoPago}>
                      <td>
                        <span className={styles.primaryText}>{m.metodoPago}</span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{m.cantidadPagos} pagos</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {formatearMoneda(Number(m.totalIngresos))}
                        </span>
                      </td>
                      <td>
                        <span className={styles.badgeAdmin}>
                          {Number(m.porcentaje).toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reporteActivo === 'RESERVAS_EMPLEADO' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Empleado</th>
                    <th>Cargo</th>
                    <th>Sede</th>
                    <th>Reservas Gestionadas</th>
                    <th>Total Vendido</th>
                  </tr>
                </thead>
                <tbody>
                  {empleadosFiltrados.map((e) => (
                    <tr key={e.idEmpleado}>
                      <td>
                        <span className={styles.secondaryText}>#{e.idEmpleado}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{e.nombreEmpleado}</span>
                      </td>
                      <td>
                        <span className={styles.badgeEmpleado}>{e.cargo}</span>
                      </td>
                      <td>
                        <span className={styles.secondaryText}>{e.sede}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{e.cantidadReservas}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {formatearMoneda(Number(e.totalVendido))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reporteActivo === 'RUTAS_MAS_PASAJEROS' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID Ruta</th>
                    <th>Trayecto (Origen → Destino)</th>
                    <th>Transporte</th>
                    <th>Reservas</th>
                    <th>Pasajeros Movilizados</th>
                  </tr>
                </thead>
                <tbody>
                  {rutasFiltradas.map((r) => (
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