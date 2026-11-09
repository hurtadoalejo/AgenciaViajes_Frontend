import styles from './Navbar.module.css';
import iconLogin from '../../assets/iconLogin.png';
import type { TransportMode } from '../../types';

interface NavbarProps {
  currentMode: TransportMode;
}

export default function Navbar({ currentMode }: NavbarProps) {
  const titleStyles: Record<TransportMode, string> = {
    avion: styles.titleAvion,
    tren: styles.titleTren,
    bus: styles.titleBus,
  };

  return (
    <nav className={styles.navbar}>
      <h1 className={`${styles.title} ${titleStyles[currentMode]}`}>
        Agencia bla bla
      </h1>

      <button className={styles.loginBtn}>
        <img src={iconLogin} className={styles.btnIcon} />
        Iniciar sesión
      </button>
    </nav>
  );
}