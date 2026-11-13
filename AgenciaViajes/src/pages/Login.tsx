import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import iconVolverAtras from '../assets/iconVolverAtras.png';

interface LoginFormData {
  correo: string;
  contrasena: string;
}

interface ModalState {
  isOpen: boolean;
  isSuccess: boolean;
  title: string;
  message: string;
}

export default function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginFormData>({
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
        navigate('/');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [modal.isOpen, modal.isSuccess, navigate]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log('Credenciales listas para enviar:', formData);

      setModal({
        isOpen: true,
        isSuccess: true,
        title: '¡Bienvenido de nuevo!',
        message: 'Redirigiendo a la página principal...',
      });
    } catch (error) {
      setModal({
        isOpen: true,
        isSuccess: false,
        title: 'Error al iniciar sesión',
        message:
          error instanceof Error
            ? error.message
            : 'No se pudo iniciar sesión. Verifica tus datos e intenta de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const wasSuccess = modal.isSuccess;
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (wasSuccess) {
      navigate('/');
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
          <h1 className={styles.title}>Iniciar sesión</h1>
          <p className={styles.subtitle}>
            Ingresa tus credenciales para acceder a tu cuenta
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
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
                placeholder="Ingresa tu contraseña"
                value={formData.contrasena}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p className={styles.registerPrompt}>
          ¿Aún no tienes una cuenta?{' '}
          <Link to="/registro" className={styles.registerLink}>
            Regístrate aquí
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
                Intentar de nuevo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}