import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type {
  RutaItem,
  RutaPayload,
  VehiculoOption,
  CatalogoOption,
} from '../../types';

const API_BASE = 'http://localhost:8080/api';

interface CiudadEuropaInfo {
  idCiudad: number;
  nombreCiudad: string;
  idDepartamento: number;
  nombreDepartamento: string;
  idPais: number;
  nombrePais: string;
}

interface RutaFormState {
  idPaisOrigen: string;
  idDepartamentoOrigen: string;
  idCiudadOrigen: string;
  direccionOrigen: string;
  idPaisDestino: string;
  idDepartamentoDestino: string;
  idCiudadDestino: string;
  direccionDestino: string;
  distancia: string;
  duracionEstimada: string;
  precioBase: string;
  idVehiculo: string;
}

const INITIAL_FORM: RutaFormState = {
  idPaisOrigen: '',
  idDepartamentoOrigen: '',
  idCiudadOrigen: '',
  direccionOrigen: '',
  idPaisDestino: '',
  idDepartamentoDestino: '',
  idCiudadDestino: '',
  direccionDestino: '',
  distancia: '',
  duracionEstimada: '',
  precioBase: '',
  idVehiculo: '',
};

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatearDuracion(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const minsRestantes = minutos % 60;
  if (horas === 0) return `${minutos} min`;
  return `${minutos} min (${horas}h ${minsRestantes}m)`;
}

export default function RutasAdmin() {
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [vehiculos, setVehiculos] = useState<VehiculoOption[]>([]);
  const [ciudadesEuropa, setCiudadesEuropa] = useState<CiudadEuropaInfo[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros de tabla
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTransporte, setFiltroTransporte] = useState('');
  const [filtroCiudadOrigen, setFiltroCiudadOrigen] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<RutaFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [rutasRes, vehiculosRes, continentesRes] = await Promise.all([
          fetch(`${API_BASE}/rutas`),
          fetch(`${API_BASE}/vehiculos`),
          fetch(`${API_BASE}/catalogos/continentes`),
        ]);

        if (!rutasRes.ok || !vehiculosRes.ok || !continentesRes.ok) {
          throw new Error('No se pudieron cargar las rutas, vehículos o catálogos.');
        }

        const [rutasData, vehiculosData, continentesData]: [
          RutaItem[],
          VehiculoOption[],
          CatalogoOption[],
        ] = await Promise.all([
          rutasRes.json(),
          vehiculosRes.json(),
          continentesRes.json(),
        ]);

        // Cargar jerarquía completa de Europa (País -> Departamento -> Ciudad)
        const europa = continentesData.find((c) =>
          c.nombre.toLowerCase().includes('europa')
        );

        let listaCiudadesEuropa: CiudadEuropaInfo[] = [];

        if (europa) {
          const paisesRes = await fetch(
            `${API_BASE}/catalogos/continentes/${europa.id}/paises`
          );
          if (paisesRes.ok) {
            const paisesEuropa: CatalogoOption[] = await paisesRes.json();

            const deptosPorPais = await Promise.all(
              paisesEuropa.map(async (pais) => {
                const res = await fetch(
                  `${API_BASE}/catalogos/paises/${pais.id}/departamentos`
                );
                const deptos: CatalogoOption[] = res.ok ? await res.json() : [];
                return deptos.map((d) => ({
                  idDepartamento: d.id,
                  nombreDepartamento: d.nombre,
                  idPais: pais.id,
                  nombrePais: pais.nombre,
                }));
              })
            );

            const todosDeptos = deptosPorPais.flat();

            const ciudadesPorDepto = await Promise.all(
              todosDeptos.map(async (depto) => {
                const res = await fetch(
                  `${API_BASE}/catalogos/departamentos/${depto.idDepartamento}/ciudades`
                );
                const ciudades: CatalogoOption[] = res.ok ? await res.json() : [];
                return ciudades.map((c) => ({
                  idCiudad: c.id,
                  nombreCiudad: c.nombre,
                  idDepartamento: depto.idDepartamento,
                  nombreDepartamento: depto.nombreDepartamento,
                  idPais: depto.idPais,
                  nombrePais: depto.nombrePais,
                }));
              })
            );

            listaCiudadesEuropa = ciudadesPorDepto.flat();
          }
        }

        if (activo) {
          setRutas(rutasData);
          setVehiculos(vehiculosData);
          setCiudadesEuropa(listaCiudadesEuropa);
        }
      } catch (err) {
        if (activo) {
          setFeedback({
            type: 'error',
            text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
          });
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    };

    cargarDatosIniciales();

    return () => {
      activo = false;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const recargarRutas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/rutas`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de rutas.');
      const data: RutaItem[] = await res.json();
      setRutas(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Listas derivadas para los selects en cascada de Europa
  const paisesEuropa = Array.from(
    new Map(
      ciudadesEuropa.map((c) => [c.idPais, { id: c.idPais, nombre: c.nombrePais }])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  const departamentosOrigen = form.idPaisOrigen
    ? Array.from(
        new Map(
          ciudadesEuropa
            .filter((c) => c.idPais === Number(form.idPaisOrigen))
            .map((c) => [
              c.idDepartamento,
              { id: c.idDepartamento, nombre: c.nombreDepartamento },
            ])
        ).values()
      ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : [];

  const ciudadesOrigenOpciones = form.idDepartamentoOrigen
    ? ciudadesEuropa
        .filter((c) => c.idDepartamento === Number(form.idDepartamentoOrigen))
        .sort((a, b) => a.nombreCiudad.localeCompare(b.nombreCiudad, 'es'))
    : [];

  const departamentosDestino = form.idPaisDestino
    ? Array.from(
        new Map(
          ciudadesEuropa
            .filter((c) => c.idPais === Number(form.idPaisDestino))
            .map((c) => [
              c.idDepartamento,
              { id: c.idDepartamento, nombre: c.nombreDepartamento },
            ])
        ).values()
      ).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    : [];

  const ciudadesDestinoOpciones = form.idDepartamentoDestino
    ? ciudadesEuropa
        .filter((c) => c.idDepartamento === Number(form.idDepartamentoDestino))
        .sort((a, b) => a.nombreCiudad.localeCompare(b.nombreCiudad, 'es'))
    : [];

  const abrirModalCrear = () => {
    setEditingId(null);
    setModalError(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (ruta: RutaItem) => {
    setEditingId(ruta.idRuta);
    setModalError(null);

    const infoOrigen = ciudadesEuropa.find((c) => c.idCiudad === ruta.idCiudadOrigen);
    const infoDestino = ciudadesEuropa.find((c) => c.idCiudad === ruta.idCiudadDestino);

    setForm({
      idPaisOrigen: infoOrigen ? String(infoOrigen.idPais) : '',
      idDepartamentoOrigen: infoOrigen ? String(infoOrigen.idDepartamento) : '',
      idCiudadOrigen: String(ruta.idCiudadOrigen),
      direccionOrigen: ruta.direccionOrigen ?? '',
      idPaisDestino: infoDestino ? String(infoDestino.idPais) : '',
      idDepartamentoDestino: infoDestino ? String(infoDestino.idDepartamento) : '',
      idCiudadDestino: String(ruta.idCiudadDestino),
      direccionDestino: ruta.direccionDestino ?? '',
      distancia: String(ruta.distancia),
      duracionEstimada: String(ruta.duracionEstimada),
      precioBase: String(ruta.precioBase),
      idVehiculo: ruta.idVehiculo ? String(ruta.idVehiculo) : '',
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'idPaisOrigen') {
      setForm((prev) => ({
        ...prev,
        idPaisOrigen: value,
        idDepartamentoOrigen: '',
        idCiudadOrigen: '',
      }));
      return;
    }

    if (name === 'idDepartamentoOrigen') {
      setForm((prev) => ({
        ...prev,
        idDepartamentoOrigen: value,
        idCiudadOrigen: '',
      }));
      return;
    }

    if (name === 'idPaisDestino') {
      setForm((prev) => ({
        ...prev,
        idPaisDestino: value,
        idDepartamentoDestino: '',
        idCiudadDestino: '',
      }));
      return;
    }

    if (name === 'idDepartamentoDestino') {
      setForm((prev) => ({
        ...prev,
        idDepartamentoDestino: value,
        idCiudadDestino: '',
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const extraerErrorBackend = async (res: Response): Promise<string> => {
    try {
      const errorBody = await res.json();
      if (typeof errorBody?.mensaje === 'string') return errorBody.mensaje;
      if (typeof errorBody?.message === 'string') return errorBody.message;
      if (typeof errorBody?.detail === 'string') return errorBody.detail;
      if (errorBody?.errors && typeof errorBody.errors === 'object') {
        const firstError = Object.values(errorBody.errors)[0];
        if (typeof firstError === 'string') return firstError;
      }
    } catch {
      const textError = await res.text();
      if (textError) return textError;
    }

    if (res.status === 409) {
      return 'No se puede eliminar la ruta porque tiene programaciones de viaje o reservas asociadas.';
    }

    return `Error ${res.status} al procesar la solicitud.`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    const idCiudadOrigen = Number(form.idCiudadOrigen);
    const idCiudadDestino = Number(form.idCiudadDestino);
    const idVehiculo = Number(form.idVehiculo);
    const distancia = Number(form.distancia);
    const duracionEstimada = Number(form.duracionEstimada);
    const precioBase = Number(form.precioBase);

    if (!idCiudadOrigen || !idCiudadDestino) {
      setModalError('Debes seleccionar la ciudad de origen y la ciudad de destino.');
      return;
    }

    if (idCiudadOrigen === idCiudadDestino) {
      setModalError('La ciudad de origen y la ciudad de destino deben ser diferentes.');
      return;
    }

    if (!idVehiculo) {
      setModalError('Debes asignar un vehículo a la ruta.');
      return;
    }

    if (!Number.isFinite(distancia) || distancia <= 0) {
      setModalError('La distancia debe ser mayor que 0 km.');
      return;
    }

    if (!Number.isInteger(duracionEstimada) || duracionEstimada <= 0) {
      setModalError('La duración estimada debe ser un número entero de minutos mayor que 0.');
      return;
    }

    if (!Number.isFinite(precioBase) || precioBase < 0) {
      setModalError('El precio base debe ser mayor o igual a 0.');
      return;
    }

    setSubmitting(true);

    const payload: RutaPayload = {
      idCiudadOrigen,
      direccionOrigen: form.direccionOrigen.trim(),
      idCiudadDestino,
      direccionDestino: form.direccionDestino.trim(),
      distancia,
      duracionEstimada,
      precioBase,
      idVehiculo,
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/rutas/${editingId}` : `${API_BASE}/rutas`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setModalError(msg);
        return;
      }

      setIsModalOpen(false);
      setFeedback({
        type: 'success',
        text: isEditing
          ? 'Ruta actualizada correctamente.'
          : 'Ruta registrada correctamente.',
      });
      await recargarRutas();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (ruta: RutaItem) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar la ruta #${ruta.idRuta} (${ruta.ciudadOrigen} → ${ruta.ciudadDestino})?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/rutas/${ruta.idRuta}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Ruta eliminada correctamente.' });
      setRutas((prev) => prev.filter((item) => item.idRuta !== ruta.idRuta));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  // Opciones dinámicas para filtros de tabla
  const tiposTransporteEnTabla = Array.from(
    new Set(rutas.map((r) => r.tipoTransporte).filter((t): t is string => Boolean(t)))
  ).sort();

  const origenesEnTabla = Array.from(new Set(rutas.map((r) => r.ciudadOrigen))).sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroTransporte('');
    setFiltroCiudadOrigen('');
  };

  const hayFiltrosActivos = Boolean(
    filtroBusqueda.trim() || filtroTransporte || filtroCiudadOrigen
  );

  const rutasFiltradas = rutas.filter((ruta) => {
    if (filtroBusqueda.trim()) {
      const termino = filtroBusqueda.trim().toLowerCase();
      const coincideOrigen = ruta.ciudadOrigen.toLowerCase().includes(termino);
      const coincideDestino = ruta.ciudadDestino.toLowerCase().includes(termino);
      const coincideVehiculo = (ruta.codigoVehiculo ?? '').toLowerCase().includes(termino);
      const coincideDirOrigen = (ruta.direccionOrigen ?? '').toLowerCase().includes(termino);
      const coincideDirDestino = (ruta.direccionDestino ?? '').toLowerCase().includes(termino);
      if (
        !coincideOrigen &&
        !coincideDestino &&
        !coincideVehiculo &&
        !coincideDirOrigen &&
        !coincideDirDestino
      ) {
        return false;
      }
    }

    if (filtroTransporte && ruta.tipoTransporte !== filtroTransporte) {
      return false;
    }

    if (filtroCiudadOrigen && ruta.ciudadOrigen !== filtroCiudadOrigen) {
      return false;
    }

    return true;
  });

  const rutaEditandoActual =
    editingId !== null ? rutas.find((r) => r.idRuta === editingId) : undefined;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Rutas Europeas</h1>
          <p className={styles.subtitle}>
            Configura los trayectos, tarifas base, tiempos estimados y vehículos asignados
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nueva Ruta
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroBusqueda">Buscar por ciudad, terminal o vehículo</label>
            <input
              type="text"
              id="filtroBusqueda"
              placeholder="Ej. Madrid, París, AV-01..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroCiudadOrigen">Filtrar por ciudad de origen</label>
            <select
              id="filtroCiudadOrigen"
              value={filtroCiudadOrigen}
              onChange={(e) => setFiltroCiudadOrigen(e.target.value)}
            >
              <option value="">Todos los orígenes</option>
              {origenesEnTabla.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  {ciudad}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroTransporte">Filtrar por tipo de transporte</label>
            <select
              id="filtroTransporte"
              value={filtroTransporte}
              onChange={(e) => setFiltroTransporte(e.target.value)}
            >
              <option value="">Todos los transportes</option>
              {tiposTransporteEnTabla.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {rutasFiltradas.length} de {rutas.length} rutas
          </span>

          {hayFiltrosActivos && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className={styles.clearFilterButton}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className={feedback.type === 'error' ? styles.alertError : styles.alertSuccess}>
          {feedback.text}
        </div>
      )}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Cargando rutas...</div>
        ) : rutasFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            {rutas.length === 0
              ? 'No hay rutas registradas en el sistema.'
              : 'Ninguna ruta coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Trayecto (Origen → Destino)</th>
                  <th>Distancia y Duración</th>
                  <th>Vehículo Asignado</th>
                  <th>Precio Base</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutasFiltradas.map((ruta) => (
                  <tr key={ruta.idRuta}>
                    <td>
                      <span className={styles.secondaryText}>#{ruta.idRuta}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>
                        {ruta.ciudadOrigen} → {ruta.ciudadDestino}
                      </span>
                      <span className={styles.secondaryText}>
                        {ruta.direccionOrigen || 'Terminal principal'} →{' '}
                        {ruta.direccionDestino || 'Terminal principal'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{ruta.distancia} km</span>
                      <span className={styles.secondaryText}>
                        {formatearDuracion(ruta.duracionEstimada)}
                      </span>
                    </td>
                    <td>
                      {ruta.codigoVehiculo ? (
                        <>
                          <span className={styles.primaryText}>{ruta.codigoVehiculo}</span>
                          <span className={styles.badgeEmpleado}>
                            {ruta.tipoTransporte}
                          </span>
                        </>
                      ) : (
                        <span className={styles.secondaryText}>Sin vehículo</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.primaryText}>
                        {formatearMoneda(Number(ruta.precioBase))}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(ruta)}
                          className={styles.btnEdit}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(ruta)}
                          className={styles.btnDelete}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard} style={{ maxWidth: '760px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId !== null ? `Editar Ruta #${editingId}` : 'Registrar Nueva Ruta'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={styles.closeButton}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className={styles.alertError} style={{ marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                {/* BLOQUE ORIGEN */}
                <div className={styles.inputGroup}>
                  <label htmlFor="idPaisOrigen">País de origen (Europa) *</label>
                  <select
                    id="idPaisOrigen"
                    name="idPaisOrigen"
                    value={form.idPaisOrigen}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona país de origen</option>
                    {paisesEuropa.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idDepartamentoOrigen">Región / Departamento origen *</label>
                  <select
                    id="idDepartamentoOrigen"
                    name="idDepartamentoOrigen"
                    value={form.idDepartamentoOrigen}
                    onChange={handleChange}
                    disabled={!form.idPaisOrigen}
                    required
                  >
                    <option value="">
                      {form.idPaisOrigen ? 'Selecciona región' : 'Elige primero el país'}
                    </option>
                    {departamentosOrigen.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idCiudadOrigen">Ciudad de origen *</label>
                  <select
                    id="idCiudadOrigen"
                    name="idCiudadOrigen"
                    value={form.idCiudadOrigen}
                    onChange={handleChange}
                    disabled={!form.idDepartamentoOrigen}
                    required
                  >
                    <option value="">
                      {form.idDepartamentoOrigen
                        ? 'Selecciona ciudad'
                        : 'Elige primero la región'}
                    </option>
                    {rutaEditandoActual &&
                      form.idCiudadOrigen === String(rutaEditandoActual.idCiudadOrigen) &&
                      !ciudadesOrigenOpciones.some(
                        (c) => c.idCiudad === rutaEditandoActual.idCiudadOrigen
                      ) && (
                        <option value={rutaEditandoActual.idCiudadOrigen}>
                          {rutaEditandoActual.ciudadOrigen}
                        </option>
                      )}
                    {ciudadesOrigenOpciones.map((c) => (
                      <option key={c.idCiudad} value={c.idCiudad}>
                        {c.nombreCiudad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="direccionOrigen">
                    Terminal / Dirección origen ({form.direccionOrigen.length}/40)
                  </label>
                  <input
                    type="text"
                    id="direccionOrigen"
                    name="direccionOrigen"
                    placeholder="Ej. Aeropuerto Barajas T4"
                    maxLength={40}
                    value={form.direccionOrigen}
                    onChange={handleChange}
                  />
                </div>

                {/* BLOQUE DESTINO */}
                <div className={styles.inputGroup}>
                  <label htmlFor="idPaisDestino">País de destino (Europa) *</label>
                  <select
                    id="idPaisDestino"
                    name="idPaisDestino"
                    value={form.idPaisDestino}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona país de destino</option>
                    {paisesEuropa.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idDepartamentoDestino">Región / Departamento destino *</label>
                  <select
                    id="idDepartamentoDestino"
                    name="idDepartamentoDestino"
                    value={form.idDepartamentoDestino}
                    onChange={handleChange}
                    disabled={!form.idPaisDestino}
                    required
                  >
                    <option value="">
                      {form.idPaisDestino ? 'Selecciona región' : 'Elige primero el país'}
                    </option>
                    {departamentosDestino.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idCiudadDestino">Ciudad de destino *</label>
                  <select
                    id="idCiudadDestino"
                    name="idCiudadDestino"
                    value={form.idCiudadDestino}
                    onChange={handleChange}
                    disabled={!form.idDepartamentoDestino}
                    required
                  >
                    <option value="">
                      {form.idDepartamentoDestino
                        ? 'Selecciona ciudad'
                        : 'Elige primero la región'}
                    </option>
                    {rutaEditandoActual &&
                      form.idCiudadDestino === String(rutaEditandoActual.idCiudadDestino) &&
                      !ciudadesDestinoOpciones.some(
                        (c) => c.idCiudad === rutaEditandoActual.idCiudadDestino
                      ) && (
                        <option value={rutaEditandoActual.idCiudadDestino}>
                          {rutaEditandoActual.ciudadDestino}
                        </option>
                      )}
                    {ciudadesDestinoOpciones.map((c) => (
                      <option key={c.idCiudad} value={c.idCiudad}>
                        {c.nombreCiudad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="direccionDestino">
                    Terminal / Dirección destino ({form.direccionDestino.length}/40)
                  </label>
                  <input
                    type="text"
                    id="direccionDestino"
                    name="direccionDestino"
                    placeholder="Ej. Aeropuerto Charles de Gaulle"
                    maxLength={40}
                    value={form.direccionDestino}
                    onChange={handleChange}
                  />
                </div>

                {/* DATOS OPERATIVOS Y TARIFA */}
                <div className={styles.inputGroup}>
                  <label htmlFor="idVehiculo">Vehículo asignado *</label>
                  <select
                    id="idVehiculo"
                    name="idVehiculo"
                    value={form.idVehiculo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un vehículo</option>
                    {vehiculos.map((v) => (
                      <option key={v.idVehiculo} value={v.idVehiculo}>
                        {v.codigoIdentificacion} — {v.tipoTransporte} ({v.capacidad} pax)
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="distancia">Distancia (km) *</label>
                  <input
                    type="number"
                    id="distancia"
                    name="distancia"
                    placeholder="Ej. 1054.50"
                    step="0.01"
                    min="0.01"
                    value={form.distancia}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="duracionEstimada">Duración estimada (minutos) *</label>
                  <input
                    type="number"
                    id="duracionEstimada"
                    name="duracionEstimada"
                    placeholder="Ej. 135"
                    step="1"
                    min="1"
                    value={form.duracionEstimada}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="precioBase">Precio base (COP) *</label>
                  <input
                    type="number"
                    id="precioBase"
                    name="precioBase"
                    placeholder="Ej. 450000"
                    step="0.01"
                    min="0"
                    value={form.precioBase}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.secondaryButton}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className={styles.primaryButton}>
                  {submitting
                    ? 'Guardando...'
                    : editingId !== null
                    ? 'Guardar cambios'
                    : 'Registrar ruta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}