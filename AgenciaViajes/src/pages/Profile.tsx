import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Profile.module.css';
import iconVolverAtras from '../assets/iconVolverAtras.png';
import { useAuth } from '../hooks/useAuth';
import type { ClientePerfil, EmpleadoPerfil } from '../types';

const API_CLIENTES = 'http://localhost:8080/api/clientes';
const API_EMPLEADOS = 'http://localhost:8080/api/empleados';

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

export default function Profile() {
  const { user, updateUserSession } = useAuth();
  const navigate = useNavigate();

  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [datosLaborales, setDatosLaborales] = useState<Omit<EmpleadoPerfil, 'datosPersonales'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const esEmpleado = user?.tipoUsuario === 'EMPLEADO';

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchPerfil = async () => {
      try {
        if (esEmpleado) {
          const res = await fetch(`${API_EMPLEADOS}/${user.idUsuario}`);
          if (!res.ok) throw new Error('No se pudo cargar la información del empleado.');
          const data: EmpleadoPerfil = await res.json();
          setPerfil(data.datosPersonales);
          setDatosLaborales({
            salario: data.salario,
            fechaContratacion: data.fechaContratacion,
            idCargo: data.idCargo,
            nombreCargo: data.nombreCargo,
            idSede: data.idSede,
            nombreSede: data.nombreSede,
          });
        } else {
          const res = await fetch(`${API_CLIENTES}/${user.idUsuario}`);
          if (!res.ok) throw new Error('No se pudo cargar la información del perfil.');
          const data: ClientePerfil = await res.json();
          setPerfil(data);
        }
      } catch (err) {
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'Error al conectar con el servidor.',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPerfil();
  }, [user, esEmpleado, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setPerfil((prev) => {
      if (!prev) return null;

      if (name === 'pais') {
        const departamentos = Object.keys(UBICACIONES[value] || {});
        const primerDepto = departamentos[0] || '';
        const primeraCiudad = UBICACIONES[value]?.[primerDepto]?.[0] || '';
        return {
          ...prev,
          pais: value,
          departamento: primerDepto,
          ciudad: primeraCiudad,
        };
      }

      if (name === 'departamento') {
        const primeraCiudad = UBICACIONES[prev.pais]?.[value]?.[0] || '';
        return {
          ...prev,
          departamento: value,
          ciudad: primeraCiudad,
        };
      }

      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!perfil || !user) return;

    setSaving(true);
    setFeedback(null);

    const datosBase = {
      tipoIdentificacion: perfil.tipoIdentificacion,
      numeroIdentificacion: perfil.numeroIdentificacion,
      primerNombre: perfil.primerNombre,
      segundoNombre: perfil.segundoNombre || '',
      primerApellido: perfil.primerApellido,
      segundoApellido: perfil.segundoApellido || '',
      fechaNacimiento: perfil.fechaNacimiento,
      pais: perfil.pais,
      departamento: perfil.departamento,
      ciudad: perfil.ciudad,
      direccion: perfil.direccion,
      indicativo: perfil.indicativo,
      telefono: perfil.telefono,
      correo: perfil.correo,
    };

    try {
      if (esEmpleado && datosLaborales) {
        const payloadEmpleado = {
          ...datosBase,
          salario: datosLaborales.salario,
          fechaContratacion: datosLaborales.fechaContratacion,
          idCargo: datosLaborales.idCargo,
          idSede: datosLaborales.idSede,
          rol: perfil.rol,
        };

        const response = await fetch(`${API_EMPLEADOS}/${user.idUsuario}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadEmpleado),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || 'Verifica que la ubicación, correo y teléfono sean válidos.'
          );
        }

        const actualizado: EmpleadoPerfil = await response.json();
        setPerfil(actualizado.datosPersonales);
        updateUserSession({ correo: actualizado.datosPersonales.correo });
      } else {
        const response = await fetch(`${API_CLIENTES}/${user.idUsuario}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosBase),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || 'Verifica que la ubicación, correo y teléfono sean válidos.'
          );
        }

        const actualizado: ClientePerfil = await response.json();
        setPerfil(actualizado);
        updateUserSession({ correo: actualizado.correo });
      }

      setFeedback({
        type: 'success',
        text: 'Tus datos de contacto y ubicación se actualizaron correctamente.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'No se pudieron guardar los cambios.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.loadingState}>Cargando información de tu perfil...</div>;
  }

  const paisesDisponibles = Object.keys(UBICACIONES);
  const departamentosDisponibles = perfil ? Object.keys(UBICACIONES[perfil.pais] || {}) : [];
  const ciudadesDisponibles = perfil
    ? UBICACIONES[perfil.pais]?.[perfil.departamento] || []
    : [];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <img src={iconVolverAtras} alt="Volver atrás" className={styles.backIcon} />
          <span>Volver a la página principal</span>
        </Link>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          <h1 className={styles.title}>Mi Perfil</h1>
          <p className={styles.subtitle}>
            Consulta tu información personal y mantén tus datos de contacto y ubicación al día
          </p>

          {feedback && (
            <div
              className={`${styles.alert} ${
                feedback.type === 'success' ? styles.alertSuccess : styles.alertError
              }`}
            >
              {feedback.text}
            </div>
          )}

          {perfil && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <h2 className={styles.sectionTitle}>Datos personales (solo lectura)</h2>
              <div className={styles.readOnlyGrid3}>
                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Nombre completo</span>
                  <span className={styles.infoValue}>
                    {[perfil.primerNombre, perfil.segundoNombre, perfil.primerApellido, perfil.segundoApellido]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                </div>

                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Identificación</span>
                  <span className={styles.infoValue}>
                    {perfil.tipoIdentificacion} {perfil.numeroIdentificacion}
                  </span>
                </div>

                <div className={styles.infoBox}>
                  <span className={styles.infoLabel}>Fecha de nacimiento</span>
                  <span className={styles.infoValue}>{perfil.fechaNacimiento}</span>
                </div>
              </div>

              {esEmpleado && datosLaborales && (
                <>
                  <h2 className={styles.sectionTitle} style={{ marginTop: '0.5rem' }}>
                    Información laboral (solo lectura)
                  </h2>
                  <div className={styles.readOnlyGrid3}>
                    <div className={styles.infoBox}>
                      <span className={styles.infoLabel}>Cargo</span>
                      <span className={styles.infoValue}>{datosLaborales.nombreCargo}</span>
                    </div>

                    <div className={styles.infoBox}>
                      <span className={styles.infoLabel}>Sede</span>
                      <span className={styles.infoValue}>{datosLaborales.nombreSede}</span>
                    </div>

                    <div className={styles.infoBox}>
                      <span className={styles.infoLabel}>Fecha de contratación</span>
                      <span className={styles.infoValue}>{datosLaborales.fechaContratacion}</span>
                    </div>
                  </div>
                </>
              )}

              <hr className={styles.divider} />

              <h2 className={styles.sectionTitle}>Contacto y ubicación editables</h2>

              <div className={styles.inputGroup}>
                <label htmlFor="correo">Correo electrónico *</label>
                <input
                  type="email"
                  id="correo"
                  name="correo"
                  value={perfil.correo}
                  onChange={handleChange}
                  maxLength={100}
                  required
                />
              </div>

              <div className={styles.phoneRow}>
                <div className={styles.inputGroup} style={{ maxWidth: '125px' }}>
                  <label htmlFor="indicativo">Indicativo *</label>
                  <select
                    id="indicativo"
                    name="indicativo"
                    value={perfil.indicativo || '+57'}
                    onChange={handleChange}
                    required
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
                </div>

                <div className={styles.inputGroup} style={{ flexGrow: 1 }}>
                  <label htmlFor="telefono">Teléfono *</label>
                  <input
                    type="text"
                    id="telefono"
                    name="telefono"
                    placeholder="3001234567"
                    value={perfil.telefono || ''}
                    onChange={handleChange}
                    pattern="^[0-9 -]{7,20}$"
                    title="Entre 7 y 20 dígitos, espacios o guiones"
                    required
                  />
                </div>
              </div>

              <div className={styles.locationRow}>
                <div className={styles.inputGroup}>
                  <label htmlFor="pais">País *</label>
                  <select
                    id="pais"
                    name="pais"
                    value={perfil.pais}
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
                    value={perfil.departamento}
                    onChange={handleChange}
                    required
                  >
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
                    value={perfil.ciudad}
                    onChange={handleChange}
                    required
                  >
                    {ciudadesDisponibles.map((ciudad) => (
                      <option key={ciudad} value={ciudad}>
                        {ciudad}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="direccion">Dirección de residencia *</label>
                <input
                  type="text"
                  id="direccion"
                  name="direccion"
                  value={perfil.direccion}
                  onChange={handleChange}
                  maxLength={50}
                  required
                />
              </div>

              <button type="submit" className={styles.submitButton} disabled={saving}>
                {saving ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}