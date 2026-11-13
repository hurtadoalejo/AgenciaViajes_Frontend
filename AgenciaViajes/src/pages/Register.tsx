import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Register.module.css';
import iconVolverAtras from '../assets/iconVolverAtras.png';

type TipoIdentificacion = 'CC' | 'CE' | 'TI';

interface RegisterFormData {
  tipoIdentificacion: TipoIdentificacion;
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

interface ModalState {
  isOpen: boolean;
  isSuccess: boolean;
  title: string;
  message: string;
}

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

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    tipoIdentificacion: 'CC',
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
  });

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    isSuccess: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    if (modal.isOpen && modal.isSuccess) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [modal.isOpen, modal.isSuccess, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => {
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Datos listos para enviar:', formData);

      setModal({
        isOpen: true,
        isSuccess: true,
        title: '¡Registro exitoso!',
        message: 'Cuenta creada correctamente. Redirigiendo a iniciar sesión...',
      });
    } catch (error) {
      setModal({
        isOpen: true,
        isSuccess: false,
        title: 'Error en el registro',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo completar el registro. Intenta nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const wasSuccess = modal.isSuccess;
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (wasSuccess) {
      navigate('/login');
    }
  };

  const paisesDisponibles = Object.keys(UBICACIONES);
  const departamentosDisponibles = formData.pais
    ? Object.keys(UBICACIONES[formData.pais] || {})
    : [];
  const ciudadesDisponibles =
    formData.pais && formData.departamento
      ? UBICACIONES[formData.pais]?.[formData.departamento] || []
      : [];

  return (
    <div className={styles.pageContainer}>
      <div className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <img
            src={iconVolverAtras}
            alt="Volver atrás"
            className={styles.backIcon}
          />
          <span>Volver a la página principal</span>
        </Link>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Crear cuenta</h1>
          <p className={styles.subtitle}>
            Completa tus datos personales para registrarte
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.gridTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="tipoIdentificacion">Tipo de identificación *</label>
                <select
                  id="tipoIdentificacion"
                  name="tipoIdentificacion"
                  value={formData.tipoIdentificacion}
                  onChange={handleChange}
                  required
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="TI">Tarjeta de Identidad</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="numeroIdentificacion">Número de identificación *</label>
                <input
                  type="text"
                  id="numeroIdentificacion"
                  name="numeroIdentificacion"
                  placeholder="Ej. 1094912345"
                  value={formData.numeroIdentificacion}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="primerNombre">Primer nombre *</label>
                <input
                  type="text"
                  id="primerNombre"
                  name="primerNombre"
                  placeholder="Ej. Juan"
                  value={formData.primerNombre}
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
                  value={formData.segundoNombre}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="primerApellido">Primer apellido *</label>
                <input
                  type="text"
                  id="primerApellido"
                  name="primerApellido"
                  placeholder="Ej. Pérez"
                  value={formData.primerApellido}
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
                  value={formData.segundoApellido}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="fechaNacimiento">Fecha de nacimiento *</label>
              <input
                type="date"
                id="fechaNacimiento"
                name="fechaNacimiento"
                value={formData.fechaNacimiento}
                onChange={handleChange}
                required
              />
            </div>

            <div className={styles.gridThree}>
              <div className={styles.inputGroup}>
                <label htmlFor="pais">País *</label>
                <select
                  id="pais"
                  name="pais"
                  value={formData.pais}
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
                  value={formData.departamento}
                  onChange={handleChange}
                  disabled={!formData.pais}
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
                  value={formData.ciudad}
                  onChange={handleChange}
                  disabled={!formData.departamento}
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
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="direccion">Dirección *</label>
              <input
                type="text"
                id="direccion"
                name="direccion"
                placeholder="Ej. Calle 15 # 12-34, Barrio Centro"
                value={formData.direccion}
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
                  value={formData.indicativo}
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
                  value={formData.telefono}
                  onChange={handleChange}
                  className={styles.phoneInput}
                  required
                />
              </div>
            </div>

            <div className={styles.gridTwo}>
              <div className={styles.inputGroup}>
                <label htmlFor="correo">Correo electrónico *</label>
                <input
                  type="email"
                  id="correo"
                  name="correo"
                  placeholder="correo@ejemplo.com"
                  value={formData.correo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="contrasena">Contraseña *</label>
                <input
                  type="password"
                  id="contrasena"
                  name="contrasena"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  value={formData.contrasena}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className={styles.loginPrompt}>
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className={styles.loginLink}>
            Inicia sesión aquí
          </Link>
        </p>
      </div>

      {modal.isOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalBox}>
            <div
              className={`${styles.modalIcon} ${
                modal.isSuccess ? styles.iconSuccess : styles.iconError
              }`}
            >
              {modal.isSuccess ? '✓' : '✕'}
            </div>
            <h2 className={styles.modalTitle}>{modal.title}</h2>
            <p className={styles.modalMessage}>{modal.message}</p>
            {!modal.isSuccess && (
              <button
                type="button"
                onClick={handleCloseModal}
                className={styles.modalButton}
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}