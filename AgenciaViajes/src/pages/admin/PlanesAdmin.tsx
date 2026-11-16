import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type { PlanItem, PlanPayload } from '../../types';

const API_BASE = 'http://localhost:8080/api';

interface PlanFormState {
  nombrePlan: string;
  descripcionPlan: string;
  pesoMaxEquipaje: string;
  incluyeCheckIn: 'true' | 'false';
  precioExtra: string;
}

const INITIAL_FORM: PlanFormState = {
  nombrePlan: '',
  descripcionPlan: '',
  pesoMaxEquipaje: '',
  incluyeCheckIn: 'false',
  precioExtra: '',
};

function formatearMoneda(valor: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);
}

export default function PlanesAdmin() {
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estados de filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroCheckIn, setFiltroCheckIn] = useState<'' | 'SI' | 'NO'>('');
  const [filtroPrecioMin, setFiltroPrecioMin] = useState('');
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PlanFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarPlanes = async () => {
      try {
        const res = await fetch(`${API_BASE}/planes`);
        if (!res.ok) {
          throw new Error('No se pudo cargar la lista de planes.');
        }

        const data: PlanItem[] = await res.json();
        if (activo) {
          setPlanes(data);
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

    cargarPlanes();

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

  const recargarPlanes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/planes`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de planes.');
      const data: PlanItem[] = await res.json();
      setPlanes(data);
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
    setForm(INITIAL_FORM);
    setIsModalOpen(true);
  };

  const abrirModalEditar = (plan: PlanItem) => {
    setEditingId(plan.idPlan);
    setModalError(null);
    setForm({
      nombrePlan: plan.nombrePlan,
      descripcionPlan: plan.descripcionPlan ?? '',
      pesoMaxEquipaje: String(plan.pesoMaxEquipaje),
      incluyeCheckIn: plan.incluyeCheckIn ? 'true' : 'false',
      precioExtra: String(plan.precioExtra),
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

    if (res.status === 409) {
      return 'No se puede eliminar el plan porque ya está asociado a uno o más pasajeros.';
    }

    return `Error ${res.status} al procesar la solicitud.`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    const pesoNumerico = Number(form.pesoMaxEquipaje);
    if (Number.isNaN(pesoNumerico) || pesoNumerico < 0 || pesoNumerico > 999.99) {
      setModalError('El peso máximo de equipaje debe estar entre 0 y 999.99 kg.');
      return;
    }

    const precioNumerico = Number(form.precioExtra);
    if (Number.isNaN(precioNumerico) || precioNumerico < 0) {
      setModalError('El precio extra no puede ser negativo.');
      return;
    }

    setSubmitting(true);

    const payload: PlanPayload = {
      nombrePlan: form.nombrePlan.trim(),
      descripcionPlan: form.descripcionPlan.trim() ? form.descripcionPlan.trim() : null,
      pesoMaxEquipaje: pesoNumerico,
      incluyeCheckIn: form.incluyeCheckIn === 'true',
      precioExtra: precioNumerico,
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/planes/${editingId}` : `${API_BASE}/planes`;
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
          ? 'Plan actualizado correctamente.'
          : 'Plan registrado correctamente.',
      });
      await recargarPlanes();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (plan: PlanItem) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar el plan "${plan.nombrePlan}"?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/planes/${plan.idPlan}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Plan eliminado correctamente.' });
      setPlanes((prev) => prev.filter((item) => item.idPlan !== plan.idPlan));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroCheckIn('');
    setFiltroPrecioMin('');
    setFiltroPrecioMax('');
  };

  const hayFiltrosActivos = Boolean(
    filtroBusqueda.trim() || filtroCheckIn || filtroPrecioMin || filtroPrecioMax
  );

  const planesFiltrados = planes.filter((plan) => {
    if (filtroBusqueda.trim()) {
      const termino = filtroBusqueda.trim().toLowerCase();
      const coincideNombre = plan.nombrePlan.toLowerCase().includes(termino);
      const coincideDescripcion = (plan.descripcionPlan ?? '').toLowerCase().includes(termino);
      if (!coincideNombre && !coincideDescripcion) {
        return false;
      }
    }

    if (filtroCheckIn === 'SI' && !plan.incluyeCheckIn) {
      return false;
    }

    if (filtroCheckIn === 'NO' && plan.incluyeCheckIn) {
      return false;
    }

    if (filtroPrecioMin !== '' && Number(plan.precioExtra) < Number(filtroPrecioMin)) {
      return false;
    }

    if (filtroPrecioMax !== '' && Number(plan.precioExtra) > Number(filtroPrecioMax)) {
      return false;
    }

    return true;
  });

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Planes</h1>
          <p className={styles.subtitle}>
            Administra los planes de equipaje, beneficios de check-in y cargos adicionales por pasajero
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nuevo Plan
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroBusqueda">Buscar por nombre o descripción</label>
            <input
              type="text"
              id="filtroBusqueda"
              placeholder="Ej. Básico, Clásico, Premium..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroCheckIn">Filtrar por check-in</label>
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
            <label htmlFor="filtroPrecioMin">Precio extra mínimo</label>
            <input
              type="number"
              min="0"
              step="1000"
              id="filtroPrecioMin"
              placeholder="Ej. 0"
              value={filtroPrecioMin}
              onChange={(e) => setFiltroPrecioMin(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroPrecioMax">Precio extra máximo</label>
            <input
              type="number"
              min="0"
              step="1000"
              id="filtroPrecioMax"
              placeholder="Ej. 100000"
              value={filtroPrecioMax}
              onChange={(e) => setFiltroPrecioMax(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {planesFiltrados.length} de {planes.length} planes
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
          <div className={styles.emptyState}>Cargando planes...</div>
        ) : planesFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {planes.length === 0
              ? 'No hay planes registrados en el sistema.'
              : 'Ningún plan coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Plan</th>
                  <th>Equipaje Máximo</th>
                  <th>Check-in</th>
                  <th>Precio Extra</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {planesFiltrados.map((plan) => (
                  <tr key={plan.idPlan}>
                    <td>
                      <span className={styles.secondaryText}>#{plan.idPlan}</span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{plan.nombrePlan}</span>
                      <span className={styles.secondaryText}>
                        {plan.descripcionPlan || 'Sin descripción'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.primaryText}>{plan.pesoMaxEquipaje} kg</span>
                    </td>
                    <td>
                      {plan.incluyeCheckIn ? (
                        <span
                          className={styles.badgeAdmin}
                          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                        >
                          Incluido
                        </span>
                      ) : (
                        <span className={styles.badgeEmpleado}>No incluido</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.primaryText}>
                        {Number(plan.precioExtra) === 0
                          ? 'Incluido ($ 0)'
                          : formatearMoneda(plan.precioExtra)}
                      </span>
                      <span className={styles.secondaryText}>por pasajero</span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => abrirModalEditar(plan)}
                          className={styles.btnEdit}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(plan)}
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
                {editingId !== null ? 'Editar Plan' : 'Registrar Nuevo Plan'}
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
                  <label htmlFor="nombrePlan">Nombre del plan *</label>
                  <input
                    type="text"
                    id="nombrePlan"
                    name="nombrePlan"
                    placeholder="Ej. Básico, Clásico, Premium"
                    maxLength={30}
                    value={form.nombrePlan}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="pesoMaxEquipaje">Equipaje máximo (kg) *</label>
                  <input
                    type="number"
                    id="pesoMaxEquipaje"
                    name="pesoMaxEquipaje"
                    placeholder="Ej. 10, 23, 32"
                    min={0}
                    max={999.99}
                    step="0.01"
                    value={form.pesoMaxEquipaje}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="precioExtra">Precio extra por pasajero *</label>
                  <input
                    type="number"
                    id="precioExtra"
                    name="precioExtra"
                    placeholder="Ej. 0, 45000"
                    min={0}
                    step="0.01"
                    value={form.precioExtra}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="incluyeCheckIn">¿Incluye check-in? *</label>
                  <select
                    id="incluyeCheckIn"
                    name="incluyeCheckIn"
                    value={form.incluyeCheckIn}
                    onChange={handleChange}
                    required
                  >
                    <option value="false">No incluye check-in</option>
                    <option value="true">Sí, incluye check-in</option>
                  </select>
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="descripcionPlan">
                    Descripción del plan (opcional — {form.descripcionPlan.length}/200)
                  </label>
                  <input
                    type="text"
                    id="descripcionPlan"
                    name="descripcionPlan"
                    placeholder="Ej. Incluye artículo personal y maleta de bodega de hasta 23 kg"
                    maxLength={200}
                    value={form.descripcionPlan}
                    onChange={handleChange}
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
                    : 'Registrar plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}