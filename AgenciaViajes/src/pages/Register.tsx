import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Register.module.css';
import iconVolverAtras from '../assets/iconVolverAtras.png';
import type { CatalogoItem } from '../types';

interface RegisterFormData {
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

interface ModalState {
  isOpen: boolean;
  isSuccess: boolean;
  title: string;
  message: string;
}

type UbicacionesMap = Record<string, Record<string, string[]>>;

interface IndicativoItem {
  idPais: number;
  nombrePais: string;
  indicativo: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/auth';
const API_CATALOGOS_URL = API_BASE_URL.replace(/\/auth\/?$/, '/catalogos');

const PAIS_POR_DEFECTO = 'Colombia';

const ordenarEs = (a: string, b: string): number => a.localeCompare(b, 'es');

// Busca el indicativo cuyo nombrePais coincide (sin distinguir mayúsculas ni tildes)
const buscarIndicativoPorPais = (
  lista: IndicativoItem[],
  pais: string
): string | undefined =>
  lista.find(
    (item) => item.nombrePais.trim().localeCompare(pais.trim(), 'es', { sensitivity: 'base' }) === 0
  )?.indicativo;

export default function Register() {
  const navigate = useNavigate();

  const [tiposIdentificacion, setTiposIdentificacion] = useState<CatalogoItem[]>([]);
  const [ubicaciones, setUbicaciones] = useState<UbicacionesMap>({});
  const [indicativos, setIndicativos] = useState<IndicativoItem[]>([]);

  const [formData, setFormData] = useState<RegisterFormData>({
    tipoIdentificacion: '',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
    fechaNacimiento: '',
    pais: PAIS_POR_DEFECTO,
    departamento: '',
    ciudad: '',
    direccion: '',
    indicativo: '+57',
    telefono: '',
    correo: '',
    contrasena: '',
  });

  useEffect(() => {
    let activo = true;

    const cargarCatalogos = async () => {
      try {
        const [tiposRes, ubicacionesRes, indicativosRes] = await Promise.all([
          fetch(`${API_CATALOGOS_URL}/tipos-identificacion`),
          fetch(`${API_CATALOGOS_URL}/ubicaciones/no-europa`),
          fetch(`${API_CATALOGOS_URL}/indicativos/no-europa`),
        ]);

        const tiposData: CatalogoItem[] = tiposRes.ok ? await tiposRes.json() : [];
        const ubicacionesData: UbicacionesMap = ubicacionesRes.ok ? await ubicacionesRes.json() : {};
        const indicativosData: IndicativoItem[] = indicativosRes.ok
          ? await indicativosRes.json()
          : [];

        if (!activo) return;

        setTiposIdentificacion(tiposData);
        setUbicaciones(ubicacionesData);
        setIndicativos(indicativosData);

        const paisesCatalogo = Object.keys(ubicacionesData).sort(ordenarEs);

        setFormData((prev) => {
          // Mantiene el país actual si existe en el catálogo; si no, usa Colombia o el primero
          const paisInicial = paisesCatalogo.includes(prev.pais)
            ? prev.pais
            : paisesCatalogo.includes(PAIS_POR_DEFECTO)
              ? PAIS_POR_DEFECTO
              : (paisesCatalogo[0] ?? prev.pais);

          return {
            ...prev,
            tipoIdentificacion:
              prev.tipoIdentificacion || (tiposData.length > 0 ? tiposData[0].nombre : ''),
            pais: paisInicial,
            indicativo: buscarIndicativoPorPais(indicativosData, paisInicial) ?? prev.indicativo,
          };
        });
      } catch {
        // Si falla la red, los selects quedan vacíos sin romper la vista
      }
    };

    cargarCatalogos();

    return () => {
      activo = false;
    };
  }, []);

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
      }, 1500);

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
          indicativo: buscarIndicativoPorPais(indicativos, value) ?? prev.indicativo,
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
    if (formData.fechaNacimiento > fechaMaximaNacimiento) {
      setModal({
        isOpen: true,
        isSuccess: false,
        title: 'Fecha no válida',
        message: 'La persona debe tener al menos 7 días de nacida para registrarse.',
      });
      return;
    }
    setLoading(true);

    const payload = {
      ...formData,
      segundoNombre: formData.segundoNombre.trim() || null,
      segundoApellido: formData.segundoApellido.trim() || null,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/registro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'No se pudo completar el registro. Intenta nuevamente.';

        try {
          const errorBody = await response.json();
          if (typeof errorBody?.mensaje === 'string') {
            errorMessage = errorBody.mensaje;
          } else if (typeof errorBody?.message === 'string') {
            errorMessage = errorBody.message;
          } else if (typeof errorBody?.detail === 'string') {
            errorMessage = errorBody.detail;
          } else if (errorBody?.errors && typeof errorBody.errors === 'object') {
            const firstError = Object.values(errorBody.errors)[0];
            if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          }
        } catch {
          const textError = await response.text();
          if (textError) errorMessage = textError;
        }

        throw new Error(errorMessage);
      }

      await response.json();

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
            : 'No se pudo conectar con el servidor. Verifica tu conexión.',
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

  const paisesDisponibles = Object.keys(ubicaciones).sort(ordenarEs);
  const departamentosDisponibles = formData.pais
    ? Object.keys(ubicaciones[formData.pais] ?? {}).sort(ordenarEs)
    : [];
  const ciudadesDisponibles =
    formData.pais && formData.departamento
      ? [...(ubicaciones[formData.pais]?.[formData.departamento] ?? [])].sort(ordenarEs)
      : [];
  const indicativosOrdenados = [...indicativos].sort((a, b) =>
    ordenarEs(a.nombrePais, b.nombrePais)
  );

  // Opción de respaldo: evita que el indicativo quede en blanco mientras carga el catálogo
  const indicativoFueraDeCatalogo =
    Boolean(formData.indicativo) &&
    !indicativosOrdenados.some((item) => item.indicativo === formData.indicativo);

  const hoy = new Date();
  const limiteNacimiento = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate() - 7
  );
  const fechaMaximaNacimiento = `${limiteNacimiento.getFullYear()}-${String(
    limiteNacimiento.getMonth() + 1
  ).padStart(2, '0')}-${String(limiteNacimiento.getDate()).padStart(2, '0')}`;

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
                  {tiposIdentificacion.length === 0 && (
                    <option value="">Cargando tipos...</option>
                  )}
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
                max={fechaMaximaNacimiento}
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
                  <option value="">Selecciona un país</option>
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
                  {indicativosOrdenados.map((item) => (
                    <option key={item.idPais} value={item.indicativo}>
                      {item.nombrePais} ({item.indicativo})
                    </option>
                  ))}
                  {indicativoFueraDeCatalogo && (
                    <option value={formData.indicativo}>{formData.indicativo}</option>
                  )}
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
              className={`${styles.modalIcon} ${modal.isSuccess ? styles.iconSuccess : styles.iconError
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