import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './AdminLayout.module.css';

interface AdminMenuItem {
  path: string;
  label: string;
}

const MENU_ITEMS: AdminMenuItem[] = [
  { path: '/admin/empleados', label: 'Empleados' },
  { path: '/admin/vehiculos', label: 'Vehículos' },
  { path: '/admin/ofertas', label: 'Ofertas' },
  { path: '/admin/planes', label: 'Planes' },
  { path: '/admin/sedes', label: 'Sedes' },
  { path: '/admin/rutas', label: 'Rutas' },
  { path: '/admin/programacion', label: 'Programación' },
  { path: '/admin/reportes', label: 'Reportes' },
];

function obtenerIniciales(nombre?: string): string {
  if (!nombre) return 'AD';
  const partes = nombre.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem;

  return (
    <div className={styles.adminContainer}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandBadge}>ADMIN</span>
          <h2 className={styles.brandTitle}>Panel de Control</h2>
          <p className={styles.brandSubtitle}>Administración del Sistema</p>
        </div>

        <nav className={styles.navMenu} aria-label="Menú de administración">
          {MENU_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path} className={getNavClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userCard}>
            <div className={styles.avatar} aria-hidden="true">
              {obtenerIniciales(user?.nombre)}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.nombre}</span>
              <span className={styles.userRole}>{user?.rol}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <Outlet />
      </main>
    </div>
  );
}