import Navbar from '../components/Layout/Navbar';
import GestionClientes from '../components/Clientes/GestionClientes';
import { useAuth } from '../hooks/useAuth';
import styles from './ClientesEmpleado.module.css';

/**
 * Pestaña "Clientes" del empleado. Un empleado (rol EMPLEADO) solo registra clientes y edita
 * sus datos básicos; si quien entra es administrador, también puede eliminarlos.
 */
export default function ClientesEmpleado() {
  const { user } = useAuth();
  const esAdmin = Boolean(user?.rol?.toUpperCase().includes('ADMIN'));

  return (
    <div className={styles.page}>
      <Navbar />
      <main className={styles.content}>
        <GestionClientes modo={esAdmin ? 'admin' : 'empleado'} />
      </main>
    </div>
  );
}
