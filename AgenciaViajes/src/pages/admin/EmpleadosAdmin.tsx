import { useState, useEffect, Fragment, type FormEvent, type ChangeEvent } from 'react';
import styles from './AdminCrud.module.css';
import type {
  EmpleadoPerfil,
  EmpleadoCrearPayload,
  EmpleadoActualizarPayload,
  SedeItem,
  CatalogoItem,
} from '../../types';

const API_BASE = 'http://localhost:8080/api';

const UBICACIONES: Record<string, Record<string, string[]>> = {
  Colombia: {
    Antioquia: ['Medellín', 'Envigado'],
    Atlántico: ['Barranquilla', 'Soledad'],
    'Bogotá D.C.': ['Bogotá', 'Usaquén'],
    Bolívar: ['Cartagena', 'Magangué'],
    Boyacá: ['Tunja', 'Duitama'],
    Caldas: ['Manizales', 'Villamaría'],
    Cundinamarca: ['Soacha', 'Chía'],
    Quindío: ['Armenia', 'Calarcá'],
    Risaralda: ['Pereira', 'Dosquebradas'],
    'Valle del Cauca': ['Cali', 'Palmira'],
  },
  'Estados Unidos': {
    California: ['Los Ángeles', 'San Francisco'],
    Texas: ['Houston', 'Austin'],
    Florida: ['Miami', 'Orlando'],
    'Nueva York': ['Nueva York', 'Búfalo'],
    Illinois: ['Chicago', 'Aurora'],
    Pensilvania: ['Filadelfia', 'Pittsburgh'],
    Ohio: ['Columbus', 'Cleveland'],
    Georgia: ['Atlanta', 'Savannah'],
    'Carolina del Norte': ['Charlotte', 'Raleigh'],
    Míchigan: ['Detroit', 'Grand Rapids'],
  },
  España: {
    Andalucía: ['Sevilla', 'Málaga'],
    Cataluña: ['Barcelona', 'Girona'],
    'Comunidad de Madrid': ['Madrid', 'Alcalá de Henares'],
    'Comunidad Valenciana': ['Valencia', 'Alicante'],
    Galicia: ['Vigo', 'A Coruña'],
    'Castilla y León': ['Valladolid', 'Salamanca'],
    'País Vasco': ['Bilbao', 'San Sebastián'],
    Canarias: ['Las Palmas', 'Santa Cruz de Tenerife'],
    'Castilla-La Mancha': ['Toledo', 'Albacete'],
    Aragón: ['Zaragoza', 'Huesca'],
  },
  México: {
    'Ciudad de México': ['Ciudad de México', 'Coyoacán'],
    Jalisco: ['Guadalajara', 'Zapopan'],
    'Nuevo León': ['Monterrey', 'San Pedro Garza García'],
    Puebla: ['Puebla', 'Tehuacán'],
    Guanajuato: ['León', 'Irapuato'],
    'Estado de México': ['Toluca', 'Ecatepec'],
    Veracruz: ['Veracruz', 'Xalapa'],
    Yucatán: ['Mérida', 'Valladolid'],
    'Quintana Roo': ['Cancún', 'Playa del Carmen'],
    'Baja California': ['Tijuana', 'Mexicali'],
  },
  Argentina: {
    'Buenos Aires': ['La Plata', 'Mar del Plata'],
    'Ciudad Autónoma de Buenos Aires': ['Buenos Aires', 'Palermo'],
    Córdoba: ['Córdoba', 'Villa Carlos Paz'],
    'Santa Fe': ['Rosario', 'Santa Fe'],
    Mendoza: ['Mendoza', 'San Rafael'],
    Tucumán: ['San Miguel de Tucumán', 'Yerba Buena'],
    Salta: ['Salta', 'San Ramón de la Nueva Orán'],
    'Entre Ríos': ['Paraná', 'Concordia'],
    Misiones: ['Posadas', 'Puerto Iguazú'],
    Chaco: ['Resistencia', 'Presidencia Roque Sáenz Peña'],
  },
  Chile: {
    'Región Metropolitana': ['Santiago', 'Puente Alto'],
    Valparaíso: ['Valparaíso', 'Viña del Mar'],
    Biobío: ['Concepción', 'Talcahuano'],
    'La Araucanía': ['Temuco', 'Villarrica'],
    'Los Lagos': ['Puerto Montt', 'Osorno'],
    Antofagasta: ['Antofagasta', 'Calama'],
    Coquimbo: ['La Serena', 'Coquimbo'],
    "O'Higgins": ['Rancagua', 'San Fernando'],
    Maule: ['Talca', 'Curicó'],
    Tarapacá: ['Iquique', 'Alto Hospicio'],
  },
  Perú: {
    Lima: ['Lima', 'Miraflores'],
    Arequipa: ['Arequipa', 'Camaná'],
    'La Libertad': ['Trujillo', 'Chepén'],
    Piura: ['Piura', 'Sullana'],
    Lambayeque: ['Chiclayo', 'Lambayeque'],
    Cusco: ['Cusco', 'Urubamba'],
    Junín: ['Huancayo', 'Tarma'],
    Áncash: ['Chimbote', 'Huaraz'],
    Loreto: ['Iquitos', 'Yurimaguas'],
    Ica: ['Ica', 'Chincha Alta'],
  },
  Ecuador: {
    Pichincha: ['Quito', 'Sangolquí'],
    Guayas: ['Guayaquil', 'Durán'],
    Azuay: ['Cuenca', 'Gualaceo'],
    Manabí: ['Portoviejo', 'Manta'],
    'El Oro': ['Machala', 'Pasaje'],
    Tungurahua: ['Ambato', 'Baños'],
    Loja: ['Loja', 'Catamayo'],
    Imbabura: ['Ibarra', 'Otavalo'],
    Chimborazo: ['Riobamba', 'Guano'],
    Esmeraldas: ['Esmeraldas', 'Atacames'],
  },
};

interface EmpleadoFormState {
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
  salario: string;
  fechaContratacion: string;
  idCargo: string;
  idSede: string;
  rol: string;
}

const INITIAL_FORM: EmpleadoFormState = {
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
  salario: '',
  fechaContratacion: new Date().toISOString().split('T')[0],
  idCargo: '',
  idSede: '',
  rol: '',
};

export default function EmpleadosAdmin() {
  const [empleados, setEmpleados] = useState<EmpleadoPerfil[]>([]);
  const [sedes, setSedes] = useState<SedeItem[]>([]);
  const [cargos, setCargos] = useState<CatalogoItem[]>([]);
  const [roles, setRoles] = useState<CatalogoItem[]>([]);
  const [tiposIdentificacion, setTiposIdentificacion] = useState<CatalogoItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Estados de filtros
  const [filtroSede, setFiltroSede] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroSalarioMin, setFiltroSalarioMin] = useState('');
  const [filtroSalarioMax, setFiltroSalarioMax] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmpleadoFormState>(INITIAL_FORM);

  useEffect(() => {
    let activo = true;

    const cargarDatosIniciales = async () => {
      try {
        const [empRes, sedesRes, cargosRes, rolesRes, tiposIdRes] = await Promise.all([
          fetch(`${API_BASE}/empleados`),
          fetch(`${API_BASE}/sedes`),
          fetch(`${API_BASE}/catalogos/cargos`),
          fetch(`${API_BASE}/catalogos/roles`),
          fetch(`${API_BASE}/catalogos/tipos-identificacion`),
        ]);

        if (!empRes.ok) throw new Error('No se pudo cargar la lista de empleados.');

        const empData: EmpleadoPerfil[] = await empRes.json();
        const sedesData: SedeItem[] = sedesRes.ok ? await sedesRes.json() : [];
        const cargosData: CatalogoItem[] = cargosRes.ok ? await cargosRes.json() : [];
        const rolesRaw: CatalogoItem[] = rolesRes.ok ? await rolesRes.json() : [];
        const tiposIdData: CatalogoItem[] = tiposIdRes.ok ? await tiposIdRes.json() : [];
        const tiposIdFiltrados = tiposIdData.filter(
          (tipo) => tipo.nombre.trim().toUpperCase() !== 'TI'
        );

        // Excluye el rol CLIENTE para dejar solo roles válidos de empleados (EMPLEADO, ADMIN, etc.)
        const rolesEmpleado = rolesRaw.filter(
          (r) => r.nombre.trim().toUpperCase() !== 'CLIENTE'
        );

        if (activo) {
          setEmpleados(empData);
          setSedes(sedesData);
          setCargos(cargosData);
          setRoles(rolesEmpleado);
          setTiposIdentificacion(tiposIdFiltrados);
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

  const recargarEmpleados = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/empleados`);
      if (!res.ok) throw new Error('No se pudo actualizar la lista de empleados.');
      const data: EmpleadoPerfil[] = await res.json();
      setEmpleados(data);
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
    const rolPorDefecto =
      roles.find((r) => r.nombre.toUpperCase() === 'EMPLEADO')?.nombre ??
      roles[0]?.nombre ??
      '';

    setForm({
      ...INITIAL_FORM,
      tipoIdentificacion: tiposIdentificacion[0]?.nombre ?? 'CC',
      rol: rolPorDefecto,
      idCargo: cargos[0] ? String(cargos[0].id) : '',
      idSede: sedes[0] ? String(sedes[0].idSede) : '',
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (emp: EmpleadoPerfil) => {
    const dp = emp.datosPersonales;
    setEditingId(dp.idUsuario);
    setModalError(null);

    const tipoIdCoincidente =
      tiposIdentificacion.find(
        (t) => t.nombre.trim().toUpperCase() === dp.tipoIdentificacion.trim().toUpperCase()
      )?.nombre ?? dp.tipoIdentificacion;

    const rolCoincidente =
      roles.find(
        (r) => r.nombre.trim().toUpperCase() === dp.rol.trim().toUpperCase()
      )?.nombre ?? dp.rol;

    setForm({
      tipoIdentificacion: tipoIdCoincidente,
      numeroIdentificacion: dp.numeroIdentificacion,
      primerNombre: dp.primerNombre,
      segundoNombre: dp.segundoNombre ?? '',
      primerApellido: dp.primerApellido,
      segundoApellido: dp.segundoApellido ?? '',
      fechaNacimiento: dp.fechaNacimiento,
      pais: dp.pais,
      departamento: dp.departamento,
      ciudad: dp.ciudad,
      direccion: dp.direccion,
      indicativo: dp.indicativo || '+57',
      telefono: dp.telefono,
      correo: dp.correo,
      contrasena: '',
      salario: String(emp.salario),
      fechaContratacion: emp.fechaContratacion,
      idCargo: String(emp.idCargo),
      idSede: String(emp.idSede),
      rol: rolCoincidente,
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
        };
      }

      if (name === 'departamento') {
        return {
          ...prev,
          departamento: value,
          ciudad: '',
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
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
    if (form.fechaNacimiento > fechaMaximaNacimiento) {
      setModalError('El empleado debe tener al menos 18 años de edad.');
      return;
    }
    setSubmitting(true);
    setModalError(null);
    setFeedback(null);

    const basePayload: EmpleadoActualizarPayload = {
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
      salario: Number(form.salario),
      fechaContratacion: form.fechaContratacion,
      idCargo: Number(form.idCargo),
      idSede: Number(form.idSede),
      rol: form.rol,
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing ? `${API_BASE}/empleados/${editingId}` : `${API_BASE}/empleados`;
      const method = isEditing ? 'PUT' : 'POST';

      const bodyPayload: EmpleadoCrearPayload | EmpleadoActualizarPayload = isEditing
        ? basePayload
        : { ...basePayload, contrasena: form.contrasena };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bodyPayload),
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
          ? 'Empleado actualizado correctamente.'
          : 'Empleado registrado correctamente en el sistema.',
      });
      await recargarEmpleados();
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (emp: EmpleadoPerfil) => {
    const dp = emp.datosPersonales;
    const confirmado = window.confirm(
      `¿Seguro que deseas eliminar al empleado ${dp.primerNombre} ${dp.primerApellido}?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/empleados/${dp.idUsuario}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Empleado eliminado correctamente.' });
      setEmpleados((prev) => prev.filter((item) => item.datosPersonales.idUsuario !== dp.idUsuario));
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const toggleExpand = (idUsuario: number) => {
    setExpandedId((prev) => (prev === idUsuario ? null : idUsuario));
  };

  const limpiarFiltros = () => {
    setFiltroSede('');
    setFiltroCargo('');
    setFiltroRol('');
    setFiltroSalarioMin('');
    setFiltroSalarioMax('');
  };

  const hayFiltrosActivos = Boolean(
    filtroSede || filtroCargo || filtroRol || filtroSalarioMin || filtroSalarioMax
  );

  const empleadosFiltrados = empleados.filter((emp) => {
    if (filtroSede && String(emp.idSede) !== filtroSede) {
      return false;
    }
    if (filtroCargo && String(emp.idCargo) !== filtroCargo) {
      return false;
    }
    if (filtroRol) {
      const rolEmpleado = emp.datosPersonales.rol?.trim().toUpperCase() || '';
      if (rolEmpleado !== filtroRol.trim().toUpperCase()) return false;
    }
    if (filtroSalarioMin !== '' && Number(emp.salario) < Number(filtroSalarioMin)) {
      return false;
    }
    if (filtroSalarioMax !== '' && Number(emp.salario) > Number(filtroSalarioMax)) {
      return false;
    }
    return true;
  });

  const paisesDisponibles = Object.keys(UBICACIONES);
  const departamentosDisponibles = form.pais
    ? Object.keys(UBICACIONES[form.pais] || {})
    : [];
  const ciudadesDisponibles =
    form.pais && form.departamento
      ? UBICACIONES[form.pais]?.[form.departamento] || []
      : [];

  const hoy = new Date();
  const fechaMaximaNacimiento = new Date(
    hoy.getFullYear() - 18,
    hoy.getMonth(),
    hoy.getDate()
  )
    .toISOString()
    .split('T')[0];

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Gestión de Empleados</h1>
          <p className={styles.subtitle}>
            Administra el personal operativo y los administradores del sistema
          </p>
        </div>

        <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
          + Nuevo Empleado
        </button>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterGrid}>
          <div className={styles.inputGroup}>
            <label htmlFor="filtroSede">Filtrar por sede</label>
            <select
              id="filtroSede"
              value={filtroSede}
              onChange={(e) => setFiltroSede(e.target.value)}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.idSede} value={sede.idSede}>
                  {sede.nombreSede} ({sede.nombreCiudad})
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
              {cargos.map((cargo) => (
                <option key={cargo.id} value={cargo.id}>
                  {cargo.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroRol">Filtrar por rol</label>
            <select
              id="filtroRol"
              value={filtroRol}
              onChange={(e) => setFiltroRol(e.target.value)}
            >
              <option value="">Todos los roles</option>
              {roles.map((rolItem) => (
                <option key={rolItem.id} value={rolItem.nombre}>
                  {rolItem.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroSalarioMin">Salario mínimo</label>
            <input
              type="number"
              min="0"
              step="10000"
              id="filtroSalarioMin"
              placeholder="Ej. 1500000"
              value={filtroSalarioMin}
              onChange={(e) => setFiltroSalarioMin(e.target.value)}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroSalarioMax">Salario máximo</label>
            <input
              type="number"
              min="0"
              step="10000"
              id="filtroSalarioMax"
              placeholder="Ej. 5000000"
              value={filtroSalarioMax}
              onChange={(e) => setFiltroSalarioMax(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            Mostrando {empleadosFiltrados.length} de {empleados.length} empleados
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
          <div className={styles.emptyState}>Cargando empleados...</div>
        ) : empleadosFiltrados.length === 0 ? (
          <div className={styles.emptyState}>
            {empleados.length === 0
              ? 'No hay empleados registrados en el sistema.'
              : 'Ningún empleado coincide con los filtros seleccionados.'}
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Identificación</th>
                  <th>Cargo / Sede</th>
                  <th>Salario</th>
                  <th>Rol</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {empleadosFiltrados.map((emp) => {
                  const dp = emp.datosPersonales;
                  const isExpanded = expandedId === dp.idUsuario;
                  const isAdmin = dp.rol?.toUpperCase().includes('ADMIN');

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
                          <span className={styles.primaryText}>{emp.nombreCargo}</span>
                          <span className={styles.secondaryText}>{emp.nombreSede}</span>
                        </td>
                        <td>
                          ${Number(emp.salario).toLocaleString('es-CO', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={isAdmin ? styles.badgeAdmin : styles.badgeEmpleado}>
                            {dp.rol}
                          </span>
                        </td>
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
                              onClick={() => abrirModalEditar(emp)}
                              className={styles.btnEdit}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEliminar(emp)}
                              className={styles.btnDelete}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className={styles.expandedRow}>
                          <td colSpan={6}>
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
                              <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Fecha de contratación</span>
                                <span className={styles.detailValue}>{emp.fechaContratacion}</span>
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
                {editingId !== null ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
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
                  <select
                    id="pais"
                    name="pais"
                    value={form.pais}
                    onChange={handleChange}
                    required
                  >
                    {paisesDisponibles.map((pais) => (
                      <option key={pais} value={pais}>
                        {pais}
                      </option>
                    ))}
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
                      <option value="+57">🇨🇴 +57</option>
                      <option value="+1">🇺🇸 +1</option>
                      <option value="+34">🇪🇸 +34</option>
                      <option value="+52">🇲🇽 +52</option>
                      <option value="+54">🇦🇷 +54</option>
                      <option value="+56">🇨🇱 +56</option>
                      <option value="+51">🇵🇪 +51</option>
                      <option value="+593">🇪🇨 +593</option>
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

              <h3 className={styles.sectionHeading}>2. Acceso y Datos Laborales</h3>
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
                    <label htmlFor="contrasena">Contraseña *</label>
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

                <div className={styles.inputGroup}>
                  <label htmlFor="rol">Rol del sistema *</label>
                  <select id="rol" name="rol" value={form.rol} onChange={handleChange} required>
                    <option value="">Selecciona un rol</option>
                    {roles.map((rolItem) => (
                      <option key={rolItem.id} value={rolItem.nombre}>
                        {rolItem.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idCargo">Cargo *</label>
                  <select
                    id="idCargo"
                    name="idCargo"
                    value={form.idCargo}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona un cargo</option>
                    {cargos.map((cargo) => (
                      <option key={cargo.id} value={cargo.id}>
                        {cargo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="idSede">Sede *</label>
                  <select
                    id="idSede"
                    name="idSede"
                    value={form.idSede}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Selecciona una sede</option>
                    {sedes.map((sede) => (
                      <option key={sede.idSede} value={sede.idSede}>
                        {sede.nombreSede} - {sede.nombreCiudad}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="salario">Salario *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="salario"
                    name="salario"
                    placeholder="Ej. 2500000"
                    value={form.salario}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaContratacion">Fecha de contratación *</label>
                  <input
                    type="date"
                    id="fechaContratacion"
                    name="fechaContratacion"
                    value={form.fechaContratacion}
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
                      : 'Registrar empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}