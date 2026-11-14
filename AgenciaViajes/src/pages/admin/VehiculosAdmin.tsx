import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type { VehiculoItem, VehiculoPayload, CatalogoItem } from '../../types';

const API_BASE = 'http://localhost:8080/api';

interface VehiculoFormState {
  codigoIdentificacion: string;
  tipoTransporte: string;
  capacidad: string;
}

const INITIAL_FORM: VehiculoFormState = {
  codigoIdentificacion: '',
  tipoTransporte: '',
  capacidad: '',
};

export default function VehiculosAdmin() {
  const [vehiculos, setVehiculos] = useState<VehiculoItem[]>([]);
  const [tiposTransporte, setTiposTransporte] = useState<CatalogoItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estados de filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCapacidadMin, setFiltroCapacidadMin] = useState('');
  const [filtroCapacidadMax, setFiltroCapacidadMax] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<VehiculoFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [vehiculosRes, tiposRes] = await Promise.all([
          fetch(`${API_BASE}/vehiculos`),
          fetch(`${API_BASE}/catalogos/tipos-transporte`),
        ]);

        if (!vehiculosRes.ok) {
          throw new Error('No se pudo cargar la lista de vehículos.');
        }

        const vehiculosData: VehiculoItem[] = await vehiculosRes.json();
        const tiposData: CatalogoItem[] = tiposRes.ok ? await tiposRes.json() : [];

        if (activo) {
          setVehiculos(vehiculosData);
          setTiposTransporte(tiposData);
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
    }, 3000);

    return () => clearTimeout(timer);
  }, [feedback]);

  const recargarVehiculos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vehiculos`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de vehículos.');
      const data: VehiculoItem[] = await res.json();
      setVehiculos(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setEditingId(null);
    setModalError(null);
    setForm({
      codigoIdentificacion: '',
      tipoTransporte: tiposTransporte[0]?.nombre ?? '',
      capacidad: '',
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (vehiculo: VehiculoItem) => {
    setEditingId(vehiculo.idVehiculo);
    setModalError(null);

    const tipoCoincidente =
      tiposTransporte.find(
        (t) => t.nombre.trim().toUpperCase() === vehiculo.tipoTransporte.trim().toUpperCase()
      )?.nombre ?? vehiculo.tipoTransporte;

    setForm({
      codigoIdentificacion: vehiculo.codigoIdentificacion,
      tipoTransporte: tipoCoincidente,
      capacidad: String(vehiculo.capacidad),
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
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
    return `Error ${res.status} al procesar la solicitud.`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    setFeedback(null);

    const payload: VehiculoPayload = {
      codigoIdentificacion: form.codigoIdentificacion.trim(),
      tipoTransporte: form.tipoTransporte,
      capacidad: Number(form.capacidad),
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/vehiculos/${editingId}` : `${API_BASE}/vehiculos`;
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
          ? 'Vehículo actualizado correctamente.'
          : 'Vehículo registrado correctamente en la flota.',
      });
      await recargarVehiculos();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (vehiculo: VehiculoItem) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar el vehículo ${vehiculo.codigoIdentificacion}?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/vehiculos/${vehiculo.idVehiculo}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Vehículo eliminado correctamente.' });
      setVehiculos((prev) => prev.filter((item) => item.idVehiculo !== vehiculo.idVehiculo));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroTipo('');
    setFiltroCapacidadMin('');
    setFiltroCapacidadMax('');
  };

  const hayFiltrosActivos = Boolean(
    filtroBusqueda.trim() || filtroTipo || filtroCapacidadMin || filtroCapacidadMax
  );

  const vehiculosFiltrados = vehiculos.filter((v) => {
    if (filtroBusqueda.trim()) {
      const termino = filtroBusqueda.trim().toLowerCase();
      if (!v.codigoIdentificacion.toLowerCase().includes(termino)) {
        return false;
      }
    }
    if (filtroTipo) {
      if (v.tipoTransporte.trim().toUpperCase() !== filtroTipo.trim().toUpperCase()) {
        return false;
      }
    }
    if (filtroCapacidadMin !== '' && Number(v.capacidad) < Number(filtroCapacidadMin)) {
      return false;
    }
    if (filtroCapacidadMax !== '' && Number(v.capacidad) > Number(filtroCapacidadMax)) {
      return false;
    }
    return true;
  });

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Vehículos</h1>
          <p className={styles.subtitle}>
            Administra la flota de aviones, buses y trenes disponibles para las rutas
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nuevo Vehículo
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroBusqueda">Buscar por código / matrícula</label>
            <input
              type="text"
              id="filtroBusqueda"
              placeholder="Ej. AV-101, BUS-04..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroTipo">Filtrar por tipo de transporte</label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {tiposTransporte.map((tipo) => (
                <option key={tipo.id} value={tipo.nombre}>
                  {tipo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroCapacidadMin">Capacidad mínima</label>
            <input
              type="number"
              min="1"
              max="1000"
              id="filtroCapacidadMin"
              placeholder="Ej. 20"
              value={filtroCapacidadMin}
              onChange={(e) => setFiltroCapacidadMin(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroCapacidadMax">Capacidad máxima</label>
            <input
              type="number"
              min="1"
              max="1000"
              id="filtroCapacidadMax"
              placeholder="Ej. 300"
              value={filtroCapacidadMax}
              onChange={(e) => setFiltroCapacidadMax(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {vehiculosFiltrados.length} de {vehiculos.length} vehículos
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
          <div className={styles.emptyState}>Cargando vehículos...</div>
        ) : vehiculosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {vehiculos.length === 0
              ? 'No hay vehículos registrados en el sistema.'
              : 'Ningún vehículo coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Código de Identificación</th>
                  <th>Tipo de Transporte</th>
                  <th>Capacidad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {vehiculosFiltrados.map((vehiculo) => (
                  <tr key={vehiculo.idVehiculo}>
                    <td>
                      <span className={styles.secondaryText}>#{vehiculo.idVehiculo}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{vehiculo.codigoIdentificacion}</span>
                    </td>
                    <td>
                      <span className={styles.badgeEmpleado}>{vehiculo.tipoTransporte}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{vehiculo.capacidad}</span>{' '}
                      <span className={styles.secondaryText}>pasajeros</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(vehiculo)}
                          className={styles.btnEdit}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(vehiculo)}
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
                {editingId !== null ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
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
                  <label htmlFor="codigoIdentificacion">Código de identificación *</label>
                  <input
                    type="text"
                    id="codigoIdentificacion"
                    name="codigoIdentificacion"
                    placeholder="Ej. AV-204, BUS-12, TRN-08"
                    maxLength={25}
                    value={form.codigoIdentificacion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="tipoTransporte">Tipo de transporte *</label>
                  <select
                    id="tipoTransporte"
                    name="tipoTransporte"
                    value={form.tipoTransporte}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un tipo</option>
                    {tiposTransporte.map((tipo) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="capacidad">Capacidad de pasajeros *</label>
                  <input
                    type="number"
                    id="capacidad"
                    name="capacidad"
                    placeholder="Entre 1 y 1000"
                    min={1}
                    max={1000}
                    step={1}
                    value={form.capacidad}
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
                    : 'Registrar vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}