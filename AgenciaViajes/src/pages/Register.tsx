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

export default function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterFormData>({
    tipoIdentificacion: 'CC',
    numeroIdentificacion: '',
    primerNombre: '',
    segundoNombre: '',
    primerApellido: '',
    segundoApellido: '',
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      // =========================================================================
      // ESTRUCTURA PARA TU FUTURA PETICIÓN AL BACKEND
      // =========================================================================
      /*
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al registrar el usuario');
      }
      */

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

            <div className={styles.gridThree}>
              <div className={styles.inputGroup}>
                <label htmlFor="pais">País *</label>
                <input
                  type="text"
                  id="pais"
                  name="pais"
                  placeholder="Ej. Colombia"
                  value={formData.pais}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="departamento">Departamento *</label>
                <input
                  type="text"
                  id="departamento"
                  name="departamento"
                  placeholder="Ej. Quindío"
                  value={formData.departamento}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="ciudad">Ciudad *</label>
                <input
                  type="text"
                  id="ciudad"
                  name="ciudad"
                  placeholder="Ej. Armenia"
                  value={formData.ciudad}
                  onChange={handleChange}
                  required
                />
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