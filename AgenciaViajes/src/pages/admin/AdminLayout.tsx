import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import styles from './AdminLayout.module.css';

interface AdminMenuItem {
  path: string;
  label: string;
}

const MENU_ITEMS: AdminMenuItem[] = [
  { path: '/admin/empleados', label: 'Empleados' },
];

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
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>{user?.rol}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
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