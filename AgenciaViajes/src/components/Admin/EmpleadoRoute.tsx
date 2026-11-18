import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

/** Solo deja pasar a usuarios que son empleados (rol EMPLEADO o ADMIN). */
export default function EmpleadoRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/clientes' }} />;
  }

  if (user.tipoUsuario !== 'EMPLEADO') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
