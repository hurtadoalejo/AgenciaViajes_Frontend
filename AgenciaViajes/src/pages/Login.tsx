import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './Login.module.css';
import iconVolverAtras from '../assets/iconVolverAtras.png';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../types';

interface LoginFormData {
  correo: string;
  contrasena: string;
}

interface ModalState {
  isOpen: boolean;
  isSuccess: boolean;
  title: string;
  message: string;
  redirectTo: string;
}

const API_URL = 'http://localhost:8080/api/auth/login';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Si viene de la compra (/reserva), al iniciar sesión vuelve allá.
  const volverA = (location.state as { from?: string } | null)?.from;

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
    redirectTo: '/',
  });

  useEffect(() => {
    if (modal.isOpen && modal.isSuccess) {
      const timer = setTimeout(() => {
        navigate(modal.redirectTo, { replace: true });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [modal.isOpen, modal.isSuccess, modal.redirectTo, navigate]);

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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        setModal({
          isOpen: true,
          isSuccess: false,
          title: 'Error al iniciar sesión',
          message: errorData?.message || 'Correo o contraseña incorrectos.',
          redirectTo: '/',
        });
        return;
      }

      const data = await response.json();

      let nombreCorto = data.nombre || data.nombreCompleto || '';

      if (data.idUsuario) {
        try {
          if (data.tipoUsuario === 'EMPLEADO') {
            const empRes = await fetch(`http://localhost:8080/api/empleados/${data.idUsuario}`);
            if (empRes.ok) {
              const empData = await empRes.json();
              const dp = empData.datosPersonales;
              nombreCorto = `${dp.primerNombre} ${dp.primerApellido}`.trim();
            }
          } else {
            const cliRes = await fetch(`http://localhost:8080/api/clientes/${data.idUsuario}`);
            if (cliRes.ok) {
              const cliData = await cliRes.json();
              nombreCorto = `${cliData.primerNombre} ${cliData.primerApellido}`.trim();
            }
          }
        } catch {
          // Si falla la consulta secundaria, continúa sin bloquear el login
        }
      }

      const usuarioSesion: AuthUser = {
        ...data,
        nombre: nombreCorto || data.correo,
        nombreCorto: nombreCorto || data.correo,
      };

      login(usuarioSesion);

      const esAdmin = Boolean(data.rol?.toUpperCase().includes('ADMIN'));
      const destino = volverA ?? (esAdmin ? '/admin' : '/');

      setModal({
        isOpen: true,
        isSuccess: true,
        title: `¡Bienvenido de nuevo${nombreCorto ? `, ${nombreCorto}` : ''}!`,
        message: esAdmin
          ? 'Redirigiendo al panel de administración...'
          : 'Redirigiendo a la página principal...',
        redirectTo: destino,
      });
    } catch {
      setModal({
        isOpen: true,
        isSuccess: false,
        title: 'Error de conexión',
        message: 'No se pudo conectar con el servidor. Verifica que el backend esté encendido.',
        redirectTo: '/',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    const wasSuccess = modal.isSuccess;
    const destino = modal.redirectTo;
    setModal((prev) => ({ ...prev, isOpen: false }));
    if (wasSuccess) {
      navigate(destino, { replace: true });
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