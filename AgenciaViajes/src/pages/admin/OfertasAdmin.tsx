import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type { OfertaItem, OfertaPayload } from '../../types';

const API_BASE = 'http://localhost:8080/api';

type EstadoOferta = 'VIGENTE' | 'PROGRAMADA' | 'EXPIRADA';

interface OfertaFormState {
  titulo: string;
  descripcion: string;
  porcentajeDescuento: string;
  fechaInicio: string;
  fechaFin: string;
}

const INITIAL_FORM: OfertaFormState = {
  titulo: '',
  descripcion: '',
  porcentajeDescuento: '',
  fechaInicio: '',
  fechaFin: '',
};

function obtenerFechaLocalISO(): string {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function calcularEstadoOferta(oferta: OfertaItem, fechaHoy: string): EstadoOferta {
  if (fechaHoy < oferta.fechaInicio) return 'PROGRAMADA';
  if (fechaHoy > oferta.fechaFin) return 'EXPIRADA';
  return 'VIGENTE';
}

function formatearFecha(fechaISO: string): string {
  const partes = fechaISO.split('-');
  if (partes.length !== 3) return fechaISO;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export default function OfertasAdmin() {
  const [ofertas, setOfertas] = useState<OfertaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Estados de filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'' | EstadoOferta>('');
  const [filtroDescuentoMin, setFiltroDescuentoMin] = useState('');
  const [filtroDescuentoMax, setFiltroDescuentoMax] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<OfertaFormState>(INITIAL_FORM);

  const fechaHoy = obtenerFechaLocalISO();

  useEffect(() => {
    let activo = true;

    const cargarOfertas = async () => {
      try {
        const res = await fetch(`${API_BASE}/ofertas`);
        if (!res.ok) {
          throw new Error('No se pudo cargar la lista de ofertas.');
        }

        const data: OfertaItem[] = await res.json();
        if (activo) {
          setOfertas(data);
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

    cargarOfertas();

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

  const recargarOfertas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/ofertas`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de ofertas.');
      const data: OfertaItem[] = await res.json();
      setOfertas(data);
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
      titulo: '',
      descripcion: '',
      porcentajeDescuento: '',
      fechaInicio: fechaHoy,
      fechaFin: '',
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (oferta: OfertaItem) => {
    setEditingId(oferta.idOferta);
    setModalError(null);
    setForm({
      titulo: oferta.titulo,
      descripcion: oferta.descripcion ?? '',
      porcentajeDescuento: String(oferta.porcentajeDescuento),
      fechaInicio: oferta.fechaInicio,
      fechaFin: oferta.fechaFin,
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
      return 'No se puede eliminar la oferta porque ya está asociada a una reserva o notificación.';
    }

    return `Error ${res.status} al procesar la solicitud.`;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    if (form.fechaFin < form.fechaInicio) {
      setModalError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    const descuentoNumerico = Number(form.porcentajeDescuento);
    if (Number.isNaN(descuentoNumerico) || descuentoNumerico < 0.01 || descuentoNumerico > 100) {
      setModalError('El porcentaje de descuento debe estar entre 0.01% y 100%.');
      return;
    }

    setSubmitting(true);

    const payload: OfertaPayload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() ? form.descripcion.trim() : null,
      porcentajeDescuento: descuentoNumerico,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/ofertas/${editingId}` : `${API_BASE}/ofertas`;
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
          ? 'Oferta actualizada correctamente.'
          : 'Oferta registrada correctamente.',
      });
      await recargarOfertas();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (oferta: OfertaItem) => {
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar la oferta "${oferta.titulo}"?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/ofertas/${oferta.idOferta}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Oferta eliminada correctamente.' });
      setOfertas((prev) => prev.filter((item) => item.idOferta !== oferta.idOferta));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const limpiarFiltros = () => {
    setFiltroBusqueda('');
    setFiltroEstado('');
    setFiltroDescuentoMin('');
    setFiltroDescuentoMax('');
  };

  const hayFiltrosActivos = Boolean(
    filtroBusqueda.trim() || filtroEstado || filtroDescuentoMin || filtroDescuentoMax
  );

  const ofertasFiltradas = ofertas.filter((oferta) => {
    if (filtroBusqueda.trim()) {
      const termino = filtroBusqueda.trim().toLowerCase();
      const coincideTitulo = oferta.titulo.toLowerCase().includes(termino);
      const coincideDescripcion = (oferta.descripcion ?? '').toLowerCase().includes(termino);
      if (!coincideTitulo && !coincideDescripcion) {
        return false;
      }
    }

    if (filtroEstado) {
      const estadoActual = calcularEstadoOferta(oferta, fechaHoy);
      if (estadoActual !== filtroEstado) {
        return false;
      }
    }

    if (
      filtroDescuentoMin !== '' &&
      Number(oferta.porcentajeDescuento) < Number(filtroDescuentoMin)
    ) {
      return false;
    }

    if (
      filtroDescuentoMax !== '' &&
      Number(oferta.porcentajeDescuento) > Number(filtroDescuentoMax)
    ) {
      return false;
    }

    return true;
  });

  const renderBadgeEstado = (estado: EstadoOferta) => {
    if (estado === 'VIGENTE') {
      return (
        <span
          className={styles.badgeAdmin}
          style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
        >
          Vigente
        </span>
      );
    }
    if (estado === 'PROGRAMADA') {
      return <span className={styles.badgeAdmin}>Programada</span>;
    }
    return <span className={styles.badgeEmpleado}>Expirada</span>;
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Ofertas</h1>
          <p className={styles.subtitle}>
            Administra los descuentos y campañas promocionales disponibles para reservas
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nueva Oferta
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroBusqueda">Buscar por título o descripción</label>
            <input
              type="text"
              id="filtroBusqueda"
              placeholder="Ej. Black Friday, Bienvenida..."
              value={filtroBusqueda}
              onChange={(e) => setFiltroBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroEstado">Filtrar por estado</label>
            <select
              id="filtroEstado"
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as '' | EstadoOferta)}
            >
              <option value="">Todos los estados</option>
              <option value="VIGENTE">Vigentes</option>
              <option value="PROGRAMADA">Programadas</option>
              <option value="EXPIRADA">Expiradas</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroDescuentoMin">Descuento mínimo (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              id="filtroDescuentoMin"
              placeholder="Ej. 10"
              value={filtroDescuentoMin}
              onChange={(e) => setFiltroDescuentoMin(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroDescuentoMax">Descuento máximo (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              id="filtroDescuentoMax"
              placeholder="Ej. 50"
              value={filtroDescuentoMax}
              onChange={(e) => setFiltroDescuentoMax(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {ofertasFiltradas.length} de {ofertas.length} ofertas
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
          <div className={styles.emptyState}>Cargando ofertas...</div>
        ) : ofertasFiltradas.length === 0 ? (
          <div className={styles.emptyState}>
            {ofertas.length === 0
              ? 'No hay ofertas registradas en el sistema.'
              : 'Ninguna oferta coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Oferta</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ofertasFiltradas.map((oferta) => {
                  const estado = calcularEstadoOferta(oferta, fechaHoy);
                  return (
                    <tr key={oferta.idOferta}>
                      <td>
                        <span className={styles.secondaryText}>#{oferta.idOferta}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{oferta.titulo}</span>
                        <span className={styles.secondaryText}>
                          {oferta.descripcion || 'Sin descripción'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{oferta.porcentajeDescuento}%</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {formatearFecha(oferta.fechaInicio)}
                        </span>
                        <span className={styles.secondaryText}>
                          hasta {formatearFecha(oferta.fechaFin)}
                        </span>
                      </td>
                      <td>{renderBadgeEstado(estado)}</td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(oferta)}
                            className={styles.btnEdit}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(oferta)}
                            className={styles.btnDelete}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {editingId !== null ? 'Editar Oferta' : 'Registrar Nueva Oferta'}
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
                  <label htmlFor="titulo">Título de la oferta *</label>
                  <input
                    type="text"
                    id="titulo"
                    name="titulo"
                    placeholder="Ej. Black Friday"
                    maxLength={30}
                    value={form.titulo}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="porcentajeDescuento">Porcentaje de descuento (%) *</label>
                  <input
                    type="number"
                    id="porcentajeDescuento"
                    name="porcentajeDescuento"
                    placeholder="Entre 0.01 y 100"
                    min={0.01}
                    max={100}
                    step="0.01"
                    value={form.porcentajeDescuento}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaInicio">Fecha de inicio *</label>
                  <input
                    type="date"
                    id="fechaInicio"
                    name="fechaInicio"
                    value={form.fechaInicio}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaFin">Fecha de fin *</label>
                  <input
                    type="date"
                    id="fechaFin"
                    name="fechaFin"
                    min={form.fechaInicio || undefined}
                    value={form.fechaFin}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="descripcion">
                    Descripción (opcional — {form.descripcion.length}/100)
                  </label>
                  <input
                    type="text"
                    id="descripcion"
                    name="descripcion"
                    placeholder="Ej. 25% de descuento en cualquier reserva realizada en noviembre"
                    maxLength={100}
                    value={form.descripcion}
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
                    : 'Registrar oferta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}