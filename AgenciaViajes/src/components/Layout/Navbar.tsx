import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Navbar.module.css';
import iconLogin from '../../assets/iconLogin.png';
import type { TransportMode } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface NavbarProps {
  currentMode?: TransportMode;
}

export default function Navbar({ currentMode = 'avion' }: NavbarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const displayName = user?.nombreCorto || user?.nombre || user?.nombreCompleto || user?.correo || '';

  const titleStyles: Record<TransportMode, string> = {
    avion: styles.titleAvion,
    tren: styles.titleTren,
    bus: styles.titleBus,
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <Link to="/" className={styles.brandLink}>
        <h1 className={`${styles.title} ${titleStyles[currentMode]}`}>
          Viaja por Europa
        </h1>
      </Link>

      {!user ? (
        <Link to="/login" className={styles.loginBtn}>
          <img src={iconLogin} alt="Icono iniciar sesión" className={styles.btnIcon} />
          Iniciar sesión
        </Link>
      ) : (
        <div className={styles.userMenuContainer} ref={dropdownRef}>
          <button
            type="button"
            className={styles.userBtn}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
          >
            <span className={styles.avatar}>
              {(displayName || 'U').charAt(0).toUpperCase()}
            </span>
            <span className={styles.userName}>{displayName}</span>
            <span className={styles.chevron}>{menuOpen ? '▲' : '▼'}</span>
          </button>

          {menuOpen && (
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownEmail}>{user.correo}</span>
                <span className={styles.dropdownRole}>{user.rol}</span>
              </div>

              <Link
                to="/perfil"
                className={styles.dropdownItem}
                onClick={() => setMenuOpen(false)}
              >
                Mi perfil
              </Link>

              <button
                type="button"
                className={`${styles.dropdownItem} ${styles.logoutItem}`}
                onClick={handleLogout}
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}