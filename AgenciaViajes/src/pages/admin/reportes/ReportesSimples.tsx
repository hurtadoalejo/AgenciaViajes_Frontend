import { useState, useEffect } from 'react';
import styles from '../AdminCrud.module.css';
import type { VehiculoItem, OfertaItem, PlanItem } from '../../../types';
import { exportarReportePdf } from '../../../utils/exportarReportePdf';

const API_BASE = 'http://localhost:8080/api';

type ReporteSimpleId = 'FLOTA_VEHICULOS' | 'CAMPANAS_OFERTAS' | 'TARIFARIO_PLANES';

function obtenerFechaLocalISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

function calcularEstadoOferta(
  oferta: OfertaItem,
  fechaHoy: string
): 'VIGENTE' | 'PROGRAMADA' | 'EXPIRADA' {
  if (fechaHoy < oferta.fechaInicio) return 'PROGRAMADA';
  if (fechaHoy > oferta.fechaFin) return 'EXPIRADA';
  return 'VIGENTE';
}

export default function ReportesSimples() {
  const [reporteSimple, setReporteSimple] = useState<ReporteSimpleId>('FLOTA_VEHICULOS');

  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [ofertas, setOfertas] = useState<OfertaItem[]>([]);
  const [planes, setPlanes] = useState<PlanItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros Reporte 1: Vehículos
  const [filtroTipoVehiculo, setFiltroTipoVehiculo] = useState('');
  const [filtroCapacidadMin, setFiltroCapacidadMin] = useState('');

  // Filtros Reporte 2: Ofertas
  const [filtroEstadoOferta, setFiltroEstadoOferta] = useState<
    '' | 'VIGENTE' | 'PROGRAMADA' | 'EXPIRADA'
  >('');
  const [filtroDescuentoMin, setFiltroDescuentoMin] = useState('');

  // Filtros Reporte 3: Planes
  const [filtroCheckIn, setFiltroCheckIn] = useState<'' | 'SI' | 'NO'>('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');

  const fechaHoy = obtenerFechaLocalISO();

  useEffect(() => {
    let activo = true;

    const cargarDatos = async () => {
      setLoading(true);
      setError(null);
      try {
        const [vehiculosRes, ofertasRes, planesRes] = await Promise.all([
          fetch(`${API_BASE}/vehiculos`),
          fetch(`${API_BASE}/ofertas`),
          fetch(`${API_BASE}/planes`),
        ]);

        if (!vehiculosRes.ok || !ofertasRes.ok || !planesRes.ok) {
          throw new Error('No se pudieron cargar los datos para generar los reportes simples.');
        }

        const [vehiculosData, ofertasData, planesData]: [VehiculoItem[], OfertaItem[], PlanItem[]] =
          await Promise.all([vehiculosRes.json(), ofertasRes.json(), planesRes.json()]);

        if (activo) {
          setVehiculos(vehiculosData);
          setOfertas(ofertasData);
          setPlanes(planesData);
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

    cargarDatos();

    return () => {
      activo = false;
    };
  }, []);

  // --- Datos filtrados ---
  const tiposVehiculoUnicos = Array.from(new Set(vehiculos.map((v) => v.tipoTransporte))).sort();

  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (filtroTipoVehiculo && v.tipoTransporte !== filtroTipoVehiculo) return false;
    if (filtroCapacidadMin !== '' && Number(v.capacidad) < Number(filtroCapacidadMin)) return false;
    return true;
  });

  const ofertasFiltradas = ofertas.filter((o) => {
    if (filtroEstadoOferta && calcularEstadoOferta(o, fechaHoy) !== filtroEstadoOferta) return false;
    if (filtroDescuentoMin !== '' && Number(o.porcentajeDescuento) < Number(filtroDescuentoMin)) {
      return false;
    }
    return true;
  });

  const planesFiltrados = planes.filter((p) => {
    if (filtroCheckIn === 'SI' && !p.incluyeCheckIn) return false;
    if (filtroCheckIn === 'NO' && p.incluyeCheckIn) return false;
    if (filtroPrecioMax !== '' && Number(p.precioExtra) > Number(filtroPrecioMax)) return false;
    return true;
  });

  // --- KPIs calculados ---
  const totalCapacidadFlota = vehiculosFiltrados.reduce((acc, v) => acc + Number(v.capacidad), 0);
  const promedioCapacidadFlota =
    vehiculosFiltrados.length > 0 ? Math.round(totalCapacidadFlota / vehiculosFiltrados.length) : 0;

  const ofertasVigentesCount = ofertasFiltradas.filter(
    (o) => calcularEstadoOferta(o, fechaHoy) === 'VIGENTE'
  ).length;
  const promedioDescuento =
    ofertasFiltradas.length > 0
      ? (
          ofertasFiltradas.reduce((acc, o) => acc + Number(o.porcentajeDescuento), 0) /
          ofertasFiltradas.length
        ).toFixed(1)
      : '0.0';

  const promedioEquipaje =
    planesFiltrados.length > 0
      ? (
          planesFiltrados.reduce((acc, p) => acc + Number(p.pesoMaxEquipaje), 0) /
          planesFiltrados.length
        ).toFixed(1)
      : '0.0';
  const promedioPrecioExtra =
    planesFiltrados.length > 0
      ? planesFiltrados.reduce((acc, p) => acc + Number(p.precioExtra), 0) / planesFiltrados.length
      : 0;

  const cantidadRegistrosActual =
    reporteSimple === 'FLOTA_VEHICULOS'
      ? vehiculosFiltrados.length
      : reporteSimple === 'CAMPANAS_OFERTAS'
      ? ofertasFiltradas.length
      : planesFiltrados.length;

  const handleExportarPDF = () => {
    if (reporteSimple === 'FLOTA_VEHICULOS') {
      exportarReportePdf({
        tituloReporte: 'Reporte de Flota y Capacidad Operativa',
        subtituloTabla: 'Reporte Simple (Consulta a una sola tabla: Vehiculo)',
        resumenKpis: `Total vehículos: ${vehiculosFiltrados.length}   |   Capacidad total: ${totalCapacidadFlota} pasajeros   |   Promedio por unidad: ${promedioCapacidadFlota} pasajeros`,
        filtrosTexto: `Tipo: ${filtroTipoVehiculo || 'Todos'} | Capacidad mínima: ${filtroCapacidadMin || 'Sin límite'}`,
        columnas: ['ID', 'Código / Matrícula', 'Tipo de Transporte', 'Capacidad (Pasajeros)'],
        filas: vehiculosFiltrados.map((v) => [
          `#${v.idVehiculo}`,
          v.codigoIdentificacion,
          v.tipoTransporte,
          `${v.capacidad} pasajeros`,
        ]),
        nombreArchivo: `ViajaPorEuropa_Reporte_Flota_${fechaHoy}.pdf`,
      });
      return;
    }

    if (reporteSimple === 'CAMPANAS_OFERTAS') {
      exportarReportePdf({
        tituloReporte: 'Reporte de Campañas Promocionales y Descuentos',
        subtituloTabla: 'Reporte Simple (Consulta a una sola tabla: Oferta)',
        resumenKpis: `Total campañas: ${ofertasFiltradas.length}   |   Vigentes hoy: ${ofertasVigentesCount}   |   Descuento promedio: ${promedioDescuento}%`,
        filtrosTexto: `Estado: ${filtroEstadoOferta || 'Todos'} | Descuento mínimo: ${filtroDescuentoMin ? `${filtroDescuentoMin}%` : 'Sin límite'}`,
        columnas: ['ID', 'Título', 'Descripción', 'Descuento', 'Vigencia', 'Estado'],
        filas: ofertasFiltradas.map((o) => [
          `#${o.idOferta}`,
          o.titulo,
          o.descripcion || 'Sin descripción',
          `${o.porcentajeDescuento}%`,
          `${formatearFecha(o.fechaInicio)} - ${formatearFecha(o.fechaFin)}`,
          calcularEstadoOferta(o, fechaHoy),
        ]),
        nombreArchivo: `ViajaPorEuropa_Reporte_Ofertas_${fechaHoy}.pdf`,
      });
      return;
    }

    exportarReportePdf({
      tituloReporte: 'Reporte Tarifario de Planes de Equipaje',
      subtituloTabla: 'Reporte Simple (Consulta a una sola tabla: Plan)',
      resumenKpis: `Total planes: ${planesFiltrados.length}   |   Equipaje promedio: ${promedioEquipaje} kg   |   Cargo extra promedio: ${formatearMoneda(promedioPrecioExtra)}`,
      filtrosTexto: `Check-in: ${filtroCheckIn === 'SI' ? 'Incluido' : filtroCheckIn === 'NO' ? 'No incluido' : 'Todos'} | Precio máximo: ${filtroPrecioMax ? formatearMoneda(Number(filtroPrecioMax)) : 'Sin límite'}`,
      columnas: ['ID', 'Plan', 'Descripción', 'Equipaje Máx.', 'Check-in', 'Precio Extra'],
      filas: planesFiltrados.map((p) => [
        `#${p.idPlan}`,
        p.nombrePlan,
        p.descripcionPlan || 'Sin descripción',
        `${p.pesoMaxEquipaje} kg`,
        p.incluyeCheckIn ? 'Incluido' : 'No incluido',
        Number(p.precioExtra) === 0 ? 'Incluido ($ 0)' : formatearMoneda(p.precioExtra),
      ]),
      nombreArchivo: `ViajaPorEuropa_Reporte_Planes_${fechaHoy}.pdf`,
    });
  };

  const limpiarFiltrosActuales = () => {
    if (reporteSimple === 'FLOTA_VEHICULOS') {
      setFiltroTipoVehiculo('');
      setFiltroCapacidadMin('');
    } else if (reporteSimple === 'CAMPANAS_OFERTAS') {
      setFiltroEstadoOferta('');
      setFiltroDescuentoMin('');
    } else {
      setFiltroCheckIn('');
      setFiltroPrecioMax('');
    }
  };

  return (
    <>
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="selectorReporteSimple">Seleccionar reporte simple (1 tabla)</label>
            <select
              id="selectorReporteSimple"
              value={reporteSimple}
              onChange={(e) => setReporteSimple(e.target.value as ReporteSimpleId)}
            >
              <option value="FLOTA_VEHICULOS">
                Reporte 1: Flota y Capacidad Operativa (Tabla: Vehiculo)
              </option>
              <option value="CAMPANAS_OFERTAS">
                Reporte 2: Campañas Promocionales y Descuentos (Tabla: Oferta)
              </option>
              <option value="TARIFARIO_PLANES">
                Reporte 3: Tarifario de Planes de Equipaje (Tabla: Plan)
              </option>
            </select>
          </div>

          {reporteSimple === 'FLOTA_VEHICULOS' && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="filtroTipoVehiculo">Tipo de transporte</label>
                <select
                  id="filtroTipoVehiculo"
                  value={filtroTipoVehiculo}
                  onChange={(e) => setFiltroTipoVehiculo(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {tiposVehiculoUnicos.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroCapacidadMin">Capacidad mínima (pasajeros)</label>
                <input
                  type="number"
                  id="filtroCapacidadMin"
                  min="1"
                  placeholder="Ej. 30"
                  value={filtroCapacidadMin}
                  onChange={(e) => setFiltroCapacidadMin(e.target.value)}
                />
              </div>
            </>
          )}

          {reporteSimple === 'CAMPANAS_OFERTAS' && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="filtroEstadoOferta">Estado de vigencia</label>
                <select
                  id="filtroEstadoOferta"
                  value={filtroEstadoOferta}
                  onChange={(e) =>
                    setFiltroEstadoOferta(
                      e.target.value as '' | 'VIGENTE' | 'PROGRAMADA' | 'EXPIRADA'
                    )
                  }
                >
                  <option value="">Todos los estados</option>
                  <option value="VIGENTE">Vigentes hoy</option>
                  <option value="PROGRAMADA">Programadas</option>
                  <option value="EXPIRADA">Expiradas</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroDescuentoMin">Descuento mínimo (%)</label>
                <input
                  type="number"
                  id="filtroDescuentoMin"
                  min="0"
                  max="100"
                  placeholder="Ej. 15"
                  value={filtroDescuentoMin}
                  onChange={(e) => setFiltroDescuentoMin(e.target.value)}
                />
              </div>
            </>
          )}

          {reporteSimple === 'TARIFARIO_PLANES' && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="filtroCheckIn">Beneficio de Check-in</label>
                <select
                  id="filtroCheckIn"
                  value={filtroCheckIn}
                  onChange={(e) => setFiltroCheckIn(e.target.value as '' | 'SI' | 'NO')}
                >
                  <option value="">Todos</option>
                  <option value="SI">Incluye check-in</option>
                  <option value="NO">Sin check-in</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroPrecioMax">Precio extra máximo</label>
                <input
                  type="number"
                  id="filtroPrecioMax"
                  min="0"
                  step="1000"
                  placeholder="Ej. 80000"
                  value={filtroPrecioMax}
                  onChange={(e) => setFiltroPrecioMax(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            {reporteSimple === 'FLOTA_VEHICULOS' &&
              `Vehículos analizados: ${vehiculosFiltrados.length} | Capacidad total: ${totalCapacidadFlota} pasajeros | Promedio: ${promedioCapacidadFlota} pasajeros/unidad`}
            {reporteSimple === 'CAMPANAS_OFERTAS' &&
              `Campañas analizadas: ${ofertasFiltradas.length} | Vigentes hoy: ${ofertasVigentesCount} | Descuento promedio: ${promedioDescuento}%`}
            {reporteSimple === 'TARIFARIO_PLANES' &&
              `Planes analizados: ${planesFiltrados.length} | Equipaje promedio: ${promedioEquipaje} kg | Cargo extra promedio: ${formatearMoneda(promedioPrecioExtra)}`}
          </span>

          <div className={styles.rowActions}>
            <button
              type="button"
              onClick={limpiarFiltrosActuales}
              className={styles.clearFilterButton}
            >
              Restablecer filtros
            </button>
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
      </div>

      {error && <div className={styles.alertError}>{error}</div>}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Generando vista previa del reporte...</div>
        ) : cantidadRegistrosActual === 0 ? (
          <div className={styles.emptyState}>
            No hay registros que coincidan con los criterios del reporte seleccionado.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            {reporteSimple === 'FLOTA_VEHICULOS' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Código / Matrícula</th>
                    <th>Tipo de Transporte</th>
                    <th>Capacidad Operativa</th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculosFiltrados.map((v) => (
                    <tr key={v.idVehiculo}>
                      <td>
                        <span className={styles.secondaryText}>#{v.idVehiculo}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{v.codigoIdentificacion}</span>
                      </td>
                      <td>
                        <span className={styles.badgeEmpleado}>{v.tipoTransporte}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{v.capacidad} pasajeros</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {reporteSimple === 'CAMPANAS_OFERTAS' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Campaña</th>
                    <th>Descuento</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ofertasFiltradas.map((o) => {
                    const estado = calcularEstadoOferta(o, fechaHoy);
                    return (
                      <tr key={o.idOferta}>
                        <td>
                          <span className={styles.secondaryText}>#{o.idOferta}</span>
                        </td>
                        <td>
                          <span className={styles.primaryText}>{o.titulo}</span>
                          <span className={styles.secondaryText}>
                            {o.descripcion || 'Sin descripción'}
                          </span>
                        </td>
                        <td>
                          <span className={styles.primaryText}>{o.porcentajeDescuento}%</span>
                        </td>
                        <td>
                          <span className={styles.primaryText}>
                            {formatearFecha(o.fechaInicio)}
                          </span>
                          <span className={styles.secondaryText}>
                            hasta {formatearFecha(o.fechaFin)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              estado === 'VIGENTE' ? styles.badgeAdmin : styles.badgeEmpleado
                            }
                            style={
                              estado === 'VIGENTE'
                                ? { backgroundColor: '#dcfce7', color: '#15803d' }
                                : undefined
                            }
                          >
                            {estado === 'VIGENTE'
                              ? 'Vigente'
                              : estado === 'PROGRAMADA'
                              ? 'Programada'
                              : 'Expirada'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {reporteSimple === 'TARIFARIO_PLANES' && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Plan</th>
                    <th>Equipaje Máximo</th>
                    <th>Check-in</th>
                    <th>Precio Extra</th>
                  </tr>
                </thead>
                <tbody>
                  {planesFiltrados.map((p) => (
                    <tr key={p.idPlan}>
                      <td>
                        <span className={styles.secondaryText}>#{p.idPlan}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{p.nombrePlan}</span>
                        <span className={styles.secondaryText}>
                          {p.descripcionPlan || 'Sin descripción'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{p.pesoMaxEquipaje} kg</span>
                      </td>
                      <td>
                        <span
                          className={
                            p.incluyeCheckIn ? styles.badgeAdmin : styles.badgeEmpleado
                          }
                          style={
                            p.incluyeCheckIn
                              ? { backgroundColor: '#dcfce7', color: '#15803d' }
                              : undefined
                          }
                        >
                          {p.incluyeCheckIn ? 'Incluido' : 'No incluido'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {Number(p.precioExtra) === 0
                            ? 'Incluido ($ 0)'
                            : formatearMoneda(p.precioExtra)}
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