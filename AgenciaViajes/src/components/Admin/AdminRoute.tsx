import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.rol?.toUpperCase().includes('ADMIN');
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}