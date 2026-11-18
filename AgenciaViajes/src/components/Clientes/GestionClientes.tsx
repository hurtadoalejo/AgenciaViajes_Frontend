import { useState, useEffect, Fragment, type FormEvent, type ChangeEvent } from 'react';
import styles from '../../pages/admin/AdminCrud.module.css';
import type { CatalogoItem, ClienteResumen } from '../../types';

const API_BASE = 'http://localhost:8080/api';

type UbicacionesMap = Record<string, Record<string, string[]>>;

interface IndicativoItem {
  idPais: number;
  nombrePais: string;
  indicativo: string;
}

/**
 * admin: ve lo que ha gastado cada cliente, filtra por gasto y puede eliminar.
 * empleado (rol EMPLEADO): solo registra clientes y edita sus datos básicos.
 */
export type ModoGestionClientes = 'admin' | 'empleado';

const ordenarEs = (a: string, b: string): number => a.localeCompare(b, 'es');

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const formatearDinero = (valor: number): string =>
  `$${Number(valor).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

interface ClienteFormState {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  fechaNacimiento: string;
  pais: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  indicativo: string;
  telefono: string;
  correo: string;
  contrasena: string;
}

const INITIAL_FORM: ClienteFormState = {
  tipoIdentificacion: '',
  numeroIdentificacion: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  fechaNacimiento: '',
  pais: 'Colombia',
  departamento: '',
  ciudad: '',
  direccion: '',
  indicativo: '+57',
  telefono: '',
  correo: '',
  contrasena: '',
};

export default function GestionClientes({ modo }: { modo: ModoGestionClientes }) {
  const esAdmin = modo === 'admin';

  const [clientes, setClientes] = useState<ClienteResumen[]>([]);
  const [tiposIdentificacion, setTiposIdentificacion] = useState<CatalogoItem[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionesMap>({});
  const [indicativos, setIndicativos] = useState<IndicativoItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPais, setFiltroPais] = useState('');
  const [filtroGastoMin, setFiltroGastoMin] = useState('');
  const [filtroGastoMax, setFiltroGastoMax] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ClienteFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [clientesRes, tiposIdRes, ubicacionesRes, indicativosRes] = await Promise.all([
          fetch(`${API_BASE}/clientes/resumen`),
          fetch(`${API_BASE}/catalogos/tipos-identificacion`),
          fetch(`${API_BASE}/catalogos/ubicaciones/no-europa`),
          fetch(`${API_BASE}/catalogos/indicativos/no-europa`),
        ]);

        if (!clientesRes.ok) throw new Error('No se pudo cargar la lista de clientes.');

        const clientesData: ClienteResumen[] = await clientesRes.json();
        const tiposIdData: CatalogoItem[] = tiposIdRes.ok ? await tiposIdRes.json() : [];
        const ubicacionesData: UbicacionesMap = ubicacionesRes.ok ? await ubicacionesRes.json() : {};
        const indicativosData: IndicativoItem[] = indicativosRes.ok ? await indicativosRes.json() : [];

        if (activo) {
          setClientes(clientesData);
          setTiposIdentificacion(tiposIdData);
          setUbicaciones(ubicacionesData);
          setIndicativos(indicativosData);
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
    const timer = setTimeout(() => setFeedback(null), feedback.type === 'error' ? 6000 : 3000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const recargarClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/clientes/resumen`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de clientes.');
      const data: ClienteResumen[] = await res.json();
      setClientes(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Busca el indicativo del catálogo cuyo nombrePais coincide (sin distinguir mayúsculas ni tildes)
  const buscarIndicativoPorPais = (pais: string): string | undefined =>
    indicativos.find(
      (item) => item.nombrePais.trim().localeCompare(pais.trim(), 'es', { sensitivity: 'base' }) === 0
    )?.indicativo;

  const abrirModalCrear = () => {
    setEditingId(null);
    setModalError(null);
    const paisesCatalogo = Object.keys(ubicaciones).sort(ordenarEs);
    const paisPorDefecto = paisesCatalogo.includes(INITIAL_FORM.pais)
      ? INITIAL_FORM.pais
      : (paisesCatalogo[0] ?? '');
    setForm({
      ...INITIAL_FORM,
      tipoIdentificacion: tiposIdentificacion[0]?.nombre ?? 'CC',
      pais: paisPorDefecto,
      indicativo: buscarIndicativoPorPais(paisPorDefecto) ?? INITIAL_FORM.indicativo,
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (cliente: ClienteResumen) => {
    const dp = cliente.datosPersonales;
    setEditingId(dp.idUsuario);
    setModalError(null);

    const tipoIdCoincidente =
      tiposIdentificacion.find(
        (t) => t.nombre.trim().toUpperCase() === dp.tipoIdentificacion.trim().toUpperCase()
      )?.nombre ?? dp.tipoIdentificacion;

    setForm({
      tipoIdentificacion: tipoIdCoincidente,
      numeroIdentificacion: dp.numeroIdentificacion,
      primerNombre: dp.primerNombre,
      segundoNombre: dp.segundoNombre ?? '',
      primerApellido: dp.primerApellido,
      segundoApellido: dp.segundoApellido ?? '',
      fechaNacimiento: dp.fechaNacimiento ?? '',
      pais: dp.pais,
      departamento: dp.departamento,
      ciudad: dp.ciudad,
      direccion: dp.direccion ?? '',
      indicativo: dp.indicativo || '+57',
      telefono: dp.telefono ?? '',
      correo: dp.correo,
      contrasena: '',
    });
    setIsModalOpen(true);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setForm((prev) => {
      if (name === 'pais') {
        return {
          ...prev,
          pais: value,
          departamento: '',
          ciudad: '',
          indicativo: buscarIndicativoPorPais(value) ?? prev.indicativo,
        };
      }
      if (name === 'departamento') {
        return { ...prev, departamento: value, ciudad: '' };
      }
      return { ...prev, [name]: value };
    });
  };

  const extraerErrorBackend = async (res: Response): Promise<string> => {
    try {
      const errorBody = await res.json();
      if (errorBody?.errores && typeof errorBody.errores === 'object') {
        const primerError = Object.values(errorBody.errores)[0];
        if (typeof primerError === 'string') return primerError;
      }
      if (typeof errorBody?.mensaje === 'string') return errorBody.mensaje;
      if (typeof errorBody?.detail === 'string') return errorBody.detail;
      if (typeof errorBody?.message === 'string') return errorBody.message;
    } catch {
      // cuerpo vacío o que no es JSON
    }
    return `Error ${res.status} al procesar la solicitud.`;
  };

  const hoy = new Date();
  const limiteNacimiento = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 7);
  const fechaMaximaNacimiento = `${limiteNacimiento.getFullYear()}-${String(
    limiteNacimiento.getMonth() + 1
  ).padStart(2, '0')}-${String(limiteNacimiento.getDate()).padStart(2, '0')}`;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (form.fechaNacimiento > fechaMaximaNacimiento) {
      setModalError('La fecha de nacimiento no es válida.');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    setFeedback(null);

    const datosBasicos = {
      tipoIdentificacion: form.tipoIdentificacion,
      numeroIdentificacion: form.numeroIdentificacion.trim(),
      primerNombre: form.primerNombre.trim(),
      segundoNombre: form.segundoNombre.trim() || null,
      primerApellido: form.primerApellido.trim(),
      segundoApellido: form.segundoApellido.trim() || null,
      fechaNacimiento: form.fechaNacimiento,
      pais: form.pais,
      departamento: form.departamento,
      ciudad: form.ciudad,
      direccion: form.direccion.trim(),
      indicativo: form.indicativo,
      telefono: form.telefono.trim(),
      correo: form.correo.trim(),
    };

    try {
      const isEditing = editingId !== null;
      const res = await fetch(isEditing ? `${API_BASE}/clientes/${editingId}` : `${API_BASE}/clientes`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(isEditing ? datosBasicos : { ...datosBasicos, contrasena: form.contrasena }),
      });

      if (!res.ok) {
        setModalError(await extraerErrorBackend(res));
        return;
      }

      setIsModalOpen(false);
      setFeedback({
        type: 'success',
        text: isEditing ? 'Cliente actualizado correctamente.' : 'Cliente registrado correctamente.',
      });
      await recargarClientes();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (cliente: ClienteResumen) => {
    if (!esAdmin) return;
    const dp = cliente.datosPersonales;
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar al cliente ${dp.primerNombre} ${dp.primerApellido}?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/clientes/${dp.idUsuario}`, { method: 'DELETE' });
      if (!res.ok) {
        setFeedback({ type: 'error', text: await extraerErrorBackend(res) });
        return;
      }
      setFeedback({ type: 'success', text: 'Cliente eliminado correctamente.' });
      setClientes((prev) => prev.filter((item) => item.datosPersonales.idUsuario !== dp.idUsuario));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const toggleExpand = (idUsuario: number) => {
    setExpandedId((prev) => (prev === idUsuario ? null : idUsuario));
  };

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroPais('');
    setFiltroGastoMin('');
    setFiltroGastoMax('');
  };

  const hayFiltrosActivos = Boolean(
    busqueda || filtroPais || (esAdmin && (filtroGastoMin || filtroGastoMax))
  );

  const rangoInvalido =
    esAdmin &&
    filtroGastoMin !== '' &&
    filtroGastoMax !== '' &&
    Number(filtroGastoMin) > Number(filtroGastoMax);

  const textoBuscado = normalizar(busqueda);
  const clientesFiltrados = clientes.filter((cliente) => {
    const dp = cliente.datosPersonales;
    if (textoBuscado) {
      const nombre = [dp.primerNombre, dp.segundoNombre, dp.primerApellido, dp.segundoApellido]
        .filter(Boolean)
        .join(' ');
      const coincide = [nombre, dp.numeroIdentificacion, dp.correo].some((campo) =>
        normalizar(campo ?? '').includes(textoBuscado)
      );
      if (!coincide) return false;
    }
    if (filtroPais && dp.pais !== filtroPais) return false;
    if (esAdmin) {
      if (filtroGastoMin !== '' && Number(cliente.totalGastado) < Number(filtroGastoMin)) return false;
      if (filtroGastoMax !== '' && Number(cliente.totalGastado) > Number(filtroGastoMax)) return false;
    }
    return true;
  });

  const totalFiltrado = clientesFiltrados.reduce((suma, c) => suma + Number(c.totalGastado), 0);

  const paisesDisponibles = Object.keys(ubicaciones).sort(ordenarEs);
  const paisesDeClientes = [...new Set(clientes.map((c) => c.datosPersonales.pais))].sort(ordenarEs);
  const departamentosDisponibles = form.pais
    ? Object.keys(ubicaciones[form.pais] ?? {}).sort(ordenarEs)
    : [];
  const ciudadesDisponibles =
    form.pais && form.departamento
      ? [...(ubicaciones[form.pais]?.[form.departamento] ?? [])].sort(ordenarEs)
      : [];
  const indicativosOrdenados = [...indicativos].sort((a, b) => ordenarEs(a.nombrePais, b.nombrePais));

  // Opciones de respaldo: conservan el valor guardado si no aparece en los catálogos
  const paisFueraDeCatalogo = Boolean(form.pais) && !paisesDisponibles.includes(form.pais);
  const departamentoFueraDeCatalogo =
    Boolean(form.departamento) && !departamentosDisponibles.includes(form.departamento);
  const ciudadFueraDeCatalogo = Boolean(form.ciudad) && !ciudadesDisponibles.includes(form.ciudad);
  const indicativoFueraDeCatalogo =
    Boolean(form.indicativo) && !indicativosOrdenados.some((item) => item.indicativo === form.indicativo);
  const tipoIdFueraDeCatalogo =
    Boolean(form.tipoIdentificacion) &&
    !tiposIdentificacion.some((t) => t.nombre === form.tipoIdentificacion);

  const columnas = esAdmin ? 6 : 4;

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Clientes</h1>
          <p className={styles.subtitle}>
            {esAdmin
              ? 'Registra, edita y elimina clientes, y revisa cuánto ha gastado cada uno'
              : 'Registra clientes nuevos y actualiza sus datos básicos'}
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nuevo Cliente
        </button>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="busquedaCliente">Buscar cliente</label>
            <input
              type="search"
              id="busquedaCliente"
              placeholder="Nombre, identificación o correo"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroPais">Filtrar por país</label>
            <select id="filtroPais" value={filtroPais} onChange={(e) => setFiltroPais(e.target.value)}>
              <option value="">Todos los países</option>
              {paisesDeClientes.map((pais) => (
                <option key={pais} value={pais}>
                  {pais}
                </option>
              ))}
            </select>
          </div>

          {esAdmin && (
            <>
              <div className={styles.inputGroup}>
                <label htmlFor="filtroGastoMin">Gasto mínimo</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  id="filtroGastoMin"
                  placeholder="Ej. 500000"
                  value={filtroGastoMin}
                  onChange={(e) => setFiltroGastoMin(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="filtroGastoMax">Gasto máximo</label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  id="filtroGastoMax"
                  placeholder="Ej. 5000000"
                  value={filtroGastoMax}
                  onChange={(e) => setFiltroGastoMax(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {clientesFiltrados.length} de {clientes.length} clientes
            {esAdmin && clientesFiltrados.length > 0 && ` · Total gastado: ${formatearDinero(totalFiltrado)}`}
          </span>

          {hayFiltrosActivos && (
            <button type="button" onClick={limpiarFiltros} className={styles.clearFilterButton}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {rangoInvalido && (
        <div className={styles.alertError}>El gasto mínimo no puede ser mayor que el gasto máximo.</div>
      )}

      {feedback && (
        <div className={feedback.type === 'error' ? styles.alertError : styles.alertSuccess}>
          {feedback.text}
        </div>
      )}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>Cargando clientes...</div>
        ) : clientesFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {clientes.length === 0
              ? 'No hay clientes registrados en el sistema.'
              : 'Ningún cliente coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Identificación</th>
                  <th>Ubicación</th>
                  {esAdmin && <th>Compras</th>}
                  {esAdmin && <th>Total gastado</th>}
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => {
                  const dp = cliente.datosPersonales;
                  const isExpanded = expandedId === dp.idUsuario;

                  return (
                    <Fragment key={dp.idUsuario}>
                      <tr>
                        <td>
                          <span className={styles.primaryText}>
                            {dp.primerNombre} {dp.primerApellido}
                          </span>
                          <span className={styles.secondaryText}>{dp.correo}</span>
                        </td>
                        <td>
                          <span className={styles.primaryText}>{dp.numeroIdentificacion}</span>
                          <span className={styles.secondaryText}>{dp.tipoIdentificacion}</span>
                        </td>
                        <td>
                          <span className={styles.primaryText}>{dp.ciudad}</span>
                          <span className={styles.secondaryText}>{dp.pais}</span>
                        </td>
                        {esAdmin && (
                          <td>
                            <span className={styles.primaryText}>
                              {cliente.comprasPagadas} {cliente.comprasPagadas === 1 ? 'pagada' : 'pagadas'}
                            </span>
                            <span className={styles.secondaryText}>
                              {cliente.reservas} {cliente.reservas === 1 ? 'reserva' : 'reservas'} en total
                            </span>
                          </td>
                        )}
                        {esAdmin && (
                          <td>
                            <span className={styles.primaryText}>{formatearDinero(cliente.totalGastado)}</span>
                          </td>
                        )}
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              onClick={() => toggleExpand(dp.idUsuario)}
                              className={styles.btnDetail}
                            >
                              {isExpanded ? 'Ocultar' : 'Detalle'}
                            </button>
                            <button
                              type="button"
                              onClick={() => abrirModalEditar(cliente)}
                              className={styles.btnEdit}
                            >
                              Editar
                            </button>
                            {esAdmin && (
                              <button
                                type="button"
                                onClick={() => handleEliminar(cliente)}
                                className={styles.btnDelete}
                              >
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className={styles.expandedRow}>
                          <td colSpan={columnas}>
                            <div className={styles.detailGrid}>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Nombre completo</span>
                                <span className={styles.detailValue}>
                                  {[dp.primerNombre, dp.segundoNombre, dp.primerApellido, dp.segundoApellido]
                                    .filter(Boolean)
                                    .join(' ')}
                                </span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Teléfono</span>
                                <span className={styles.detailValue}>
                                  {dp.indicativo} {dp.telefono}
                                </span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Ubicación</span>
                                <span className={styles.detailValue}>
                                  {dp.ciudad}, {dp.departamento} ({dp.pais})
                                </span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Dirección</span>
                                <span className={styles.detailValue}>{dp.direccion}</span>
                              </div>
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Fecha de nacimiento</span>
                                <span className={styles.detailValue}>{dp.fechaNacimiento}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
                {editingId !== null ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
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
              <h3 className={styles.sectionHeading}>1. Datos Personales y Ubicación</h3>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="tipoIdentificacion">Tipo de identificación *</label>
                  <select
                    id="tipoIdentificacion"
                    name="tipoIdentificacion"
                    value={form.tipoIdentificacion}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un tipo</option>
                    {tiposIdentificacion.map((tipo) => (
                      <option key={tipo.id} value={tipo.nombre}>
                        {tipo.nombre}
                      </option>
                    ))}
                    {tipoIdFueraDeCatalogo && (
                      <option value={form.tipoIdentificacion}>{form.tipoIdentificacion}</option>
                    )}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="numeroIdentificacion">Número de identificación *</label>
                  <input
                    type="text"
                    id="numeroIdentificacion"
                    name="numeroIdentificacion"
                    placeholder="Ej. 1094912345"
                    maxLength={20}
                    value={form.numeroIdentificacion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="primerNombre">Primer nombre *</label>
                  <input
                    type="text"
                    id="primerNombre"
                    name="primerNombre"
                    placeholder="Ej. Juan"
                    maxLength={20}
                    value={form.primerNombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="segundoNombre">Segundo nombre</label>
                  <input
                    type="text"
                    id="segundoNombre"
                    name="segundoNombre"
                    placeholder="Opcional"
                    maxLength={20}
                    value={form.segundoNombre}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="primerApellido">Primer apellido *</label>
                  <input
                    type="text"
                    id="primerApellido"
                    name="primerApellido"
                    placeholder="Ej. Pérez"
                    maxLength={20}
                    value={form.primerApellido}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="segundoApellido">Segundo apellido</label>
                  <input
                    type="text"
                    id="segundoApellido"
                    name="segundoApellido"
                    placeholder="Opcional"
                    maxLength={20}
                    value={form.segundoApellido}
                    onChange={handleChange}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaNacimiento">Fecha de nacimiento *</label>
                  <input
                    type="date"
                    id="fechaNacimiento"
                    name="fechaNacimiento"
                    value={form.fechaNacimiento}
                    onChange={handleChange}
                    required
                    max={fechaMaximaNacimiento}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="pais">País *</label>
                  <select id="pais" name="pais" value={form.pais} onChange={handleChange} required>
                    <option value="">Selecciona un país</option>
                    {paisesDisponibles.map((pais) => (
                      <option key={pais} value={pais}>
                        {pais}
                      </option>
                    ))}
                    {paisFueraDeCatalogo && <option value={form.pais}>{form.pais}</option>}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="departamento">Departamento *</label>
                  <select
                    id="departamento"
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    disabled={!form.pais}
                    required
                  >
                    <option value="">Selecciona un departamento</option>
                    {departamentosDisponibles.map((depto) => (
                      <option key={depto} value={depto}>
                        {depto}
                      </option>
                    ))}
                    {departamentoFueraDeCatalogo && (
                      <option value={form.departamento}>{form.departamento}</option>
                    )}
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
                    <option value="">Selecciona una ciudad</option>
                    {ciudadesDisponibles.map((ciudad) => (
                      <option key={ciudad} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                    {ciudadFueraDeCatalogo && <option value={form.ciudad}>{form.ciudad}</option>}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="direccion">Dirección *</label>
                  <input
                    type="text"
                    id="direccion"
                    name="direccion"
                    placeholder="Ej. Calle 15 # 12-34"
                    maxLength={50}
                    value={form.direccion}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="telefono">Teléfono celular *</label>
                  <div className={styles.phoneWrapper}>
                    <select
                      name="indicativo"
                      aria-label="Indicativo de país"
                      value={form.indicativo}
                      onChange={handleChange}
                      className={styles.indicativoSelect}
                    >
                      {indicativosOrdenados.map((item) => (
                        <option key={item.idPais} value={item.indicativo}>
                          {item.nombrePais} ({item.indicativo})
                        </option>
                      ))}
                      {indicativoFueraDeCatalogo && (
                        <option value={form.indicativo}>{form.indicativo}</option>
                      )}
                    </select>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      placeholder="300 123 4567"
                      maxLength={20}
                      value={form.telefono}
                      onChange={handleChange}
                      className={styles.phoneInput}
                      required
                    />
                  </div>
                </div>
              </div>

              <h3 className={styles.sectionHeading}>2. Datos de Acceso</h3>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup}>
                  <label htmlFor="correo">Correo electrónico *</label>
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    placeholder="correo@ejemplo.com"
                    maxLength={100}
                    value={form.correo}
                    onChange={handleChange}
                    required
                  />
                </div>

                {editingId === null && (
                  <div className={styles.inputGroup}>
                    <label htmlFor="contrasena">Contraseña inicial *</label>
                    <input
                      type="password"
                      id="contrasena"
                      name="contrasena"
                      placeholder="Mínimo 8 caracteres"
                      minLength={8}
                      maxLength={50}
                      value={form.contrasena}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}
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
                      : 'Registrar cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
