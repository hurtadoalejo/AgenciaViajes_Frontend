import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type { SedeItem, SedePayload, UbicacionesMap } from '../../types';

const API_BASE = 'http://localhost:8080/api';

interface SedeFormState {
  nombreSede: string;
  direccion: string;
  pais: string;
  departamento: string;
  ciudad: string;
}

const INITIAL_FORM: SedeFormState = {
  nombreSede: '',
  direccion: '',
  pais: '',
  departamento: '',
  ciudad: '',
};

export default function SedesAdmin() {
  const [sedes, setSedes] = useState<SedeItem[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionesMap>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filtros de tabla
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SedeFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [sedesRes, ubicacionesRes] = await Promise.all([
          fetch(`${API_BASE}/sedes`),
          fetch(`${API_BASE}/catalogos/ubicaciones/no-europa`),
        ]);

        if (!sedesRes.ok || !ubicacionesRes.ok) {
          throw new Error('No se pudieron cargar las sedes o el catálogo de ubicaciones.');
        }

        const [sedesData, ubicacionesData]: [SedeItem[], UbicacionesMap] = await Promise.all([
          sedesRes.json(),
          ubicacionesRes.json(),
        ]);

        if (activo) {
          setSedes(sedesData);
          setUbicaciones(ubicacionesData);
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

    const timer = setTimeout(() => {
      setFeedback(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [feedback]);

  const recargarSedes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sedes`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de sedes.');
      const data: SedeItem[] = await res.json();
      setSedes(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Opciones en cascada para el modal (solo países fuera de Europa)
  const paisesDisponibles = Object.keys(ubicaciones).sort((a, b) => a.localeCompare(b, 'es'));

  const departamentosDisponibles =
    form.pais && ubicaciones[form.pais]
      ? Object.keys(ubicaciones[form.pais]).sort((a, b) => a.localeCompare(b, 'es'))
      : [];

  const ciudadesDisponibles =
    form.pais && form.departamento && ubicaciones[form.pais]?.[form.departamento]
      ? [...ubicaciones[form.pais][form.departamento]].sort((a, b) => a.localeCompare(b, 'es'))
      : [];

  const abrirModalCrear = () => {
    setEditingId(null);
    setModalError(null);
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (sede: SedeItem) => {
    setEditingId(sede.idSede);
    setModalError(null);
    setForm({
      nombreSede: sede.nombreSede,
      direccion: sede.direccion,
      pais: sede.pais,
      departamento: sede.departamento,
      ciudad: sede.ciudad,
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'pais') {
      setForm((prev) => ({
        ...prev,
        pais: value,
        departamento: '',
        ciudad: '',
      }));
      return;
    }

    if (name === 'departamento') {
      setForm((prev) => ({
        ...prev,
        departamento: value,
        ciudad: '',
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
      return 'No se puede eliminar la sede porque tiene empleados o registros operativos asociados.';
    }

    return `Error ${res.status} al procesar la solicitud.`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    if (!form.pais || !form.departamento || !form.ciudad) {
      setModalError('Debes seleccionar país, departamento y ciudad.');
      return;
    }

    setSubmitting(true);

    const payload: SedePayload = {
      nombreSede: form.nombreSede.trim(),
      direccion: form.direccion.trim(),
      pais: form.pais,
      departamento: form.departamento,
      ciudad: form.ciudad,
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/sedes/${editingId}` : `${API_BASE}/sedes`;
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
          ? 'Sede actualizada correctamente.'
          : 'Sede registrada correctamente.',
      });
      await recargarSedes();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (sede: SedeItem) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar la sede "${sede.nombreSede}" ubicada en ${sede.ciudad}?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/sedes/${sede.idSede}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Sede eliminada correctamente.' });
      setSedes((prev) => prev.filter((item) => item.idSede !== sede.idSede));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  // Opciones dinámicas para los filtros de la tabla
  const paisesEnTabla = Array.from(new Set(sedes.map((s) => s.pais))).sort((a, b) =>
    a.localeCompare(b, 'es')
  );

  const departamentosEnTabla = Array.from(
    new Set(
      sedes
        .filter((s) => !filtroPais || s.pais === filtroPais)
        .map((s) => s.departamento)
    )
  ).sort((a, b) => a.localeCompare(b, 'es'));

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroPais('');
    setFiltroDepartamento('');
  };

  const hayFiltrosActivos = Boolean(
    filtroBusqueda.trim() || filtroPais || filtroDepartamento
  );

  const sedesFiltradas = sedes.filter((sede) => {
    if (filtroBusqueda.trim()) {
      const termino = filtroBusqueda.trim().toLowerCase();
      const coincideNombre = sede.nombreSede.toLowerCase().includes(termino);
      const coincideDireccion = sede.direccion.toLowerCase().includes(termino);
      const coincideCiudad = sede.ciudad.toLowerCase().includes(termino);
      if (!coincideNombre && !coincideDireccion && !coincideCiudad) {
        return false;
      }
    }

    if (filtroPais && sede.pais !== filtroPais) {
      return false;
    }

    if (filtroDepartamento && sede.departamento !== filtroDepartamento) {
      return false;
    }

    return true;
  });

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Sedes</h1>
          <p className={styles.subtitle}>
            Administra las oficinas comerciales y puntos de atención de Viaja por Europa
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nueva Sede
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroBusqueda">Buscar por nombre, dirección o ciudad</label>
            <input
              type="text"
              id="filtroBusqueda"
              placeholder="Ej. Sede Norte, Bogotá, Calle 72..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroPais">Filtrar por país</label>
            <select
              id="filtroPais"
              value={filtroPais}
              onChange={(e) => {
                setFiltroPais(e.target.value);
                setFiltroDepartamento('');
              }}
            >
              <option value="">Todos los países</option>
              {paisesEnTabla.map((pais) => (
                <option key={pais} value={pais}>
                  {pais}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroDepartamento">Filtrar por departamento / estado</label>
            <select
              id="filtroDepartamento"
              value={filtroDepartamento}
              onChange={(e) => setFiltroDepartamento(e.target.value)}
            >
              <option value="">Todos los departamentos</option>
              {departamentosEnTabla.map((depto) => (
                <option key={depto} value={depto}>
                  {depto}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {sedesFiltradas.length} de {sedes.length} sedes
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
          <div className={styles.emptyState}>Cargando sedes...</div>
        ) : sedesFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            {sedes.length === 0
              ? 'No hay sedes registradas en el sistema.'
              : 'Ninguna sede coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sede y Dirección</th>
                  <th>Ciudad / Departamento</th>
                  <th>País</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sedesFiltradas.map((sede) => (
                  <tr key={sede.idSede}>
                    <td>
                      <span className={styles.secondaryText}>#{sede.idSede}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{sede.nombreSede}</span>
                      <span className={styles.secondaryText}>{sede.direccion}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{sede.ciudad}</span>
                      <span className={styles.secondaryText}>{sede.departamento}</span>
                    </td>
                    <td>
                      <span className={styles.badgeAdmin}>{sede.pais}</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(sede)}
                          className={styles.btnEdit}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(sede)}
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
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId !== null ? 'Editar Sede' : 'Registrar Nueva Sede'}
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
                <div className={styles.inputGroup}>
                  <label htmlFor="nombreSede">Nombre de la sede *</label>
                  <input
                    type="text"
                    id="nombreSede"
                    name="nombreSede"
                    placeholder="Ej. Sede Principal Bogotá"
                    maxLength={40}
                    value={form.nombreSede}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="pais">País (Fuera de Europa) *</label>
                  <select
                    id="pais"
                    name="pais"
                    value={form.pais}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un país</option>
                    {form.pais && !paisesDisponibles.includes(form.pais) && (
                      <option value={form.pais}>{form.pais}</option>
                    )}
                    {paisesDisponibles.map((pais) => (
                      <option key={pais} value={pais}>
                        {pais}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="departamento">Departamento / Estado *</label>
                  <select
                    id="departamento"
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    disabled={!form.pais}
                    required
                  >
                    <option value="">
                      {form.pais ? 'Selecciona un departamento' : 'Primero elige un país'}
                    </option>
                    {form.departamento &&
                      !departamentosDisponibles.includes(form.departamento) && (
                        <option value={form.departamento}>{form.departamento}</option>
                      )}
                    {departamentosDisponibles.map((depto) => (
                      <option key={depto} value={depto}>
                        {depto}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="ciudad">Ciudad *</label>
                  <select
                    id="ciudad"
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    disabled={!form.departamento}
                    required
                  >
                    <option value="">
                      {form.departamento
                        ? 'Selecciona una ciudad'
                        : 'Primero elige un departamento'}
                    </option>
                    {form.ciudad && !ciudadesDisponibles.includes(form.ciudad) && (
                      <option value={form.ciudad}>{form.ciudad}</option>
                    )}
                    {ciudadesDisponibles.map((ciudad) => (
                      <option key={ciudad} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="direccion">
                    Dirección física * ({form.direccion.length}/60)
                  </label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    placeholder="Ej. Carrera 15 # 93-47, Oficina 302"
                    maxLength={60}
                    value={form.direccion}
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
                    : 'Registrar sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}