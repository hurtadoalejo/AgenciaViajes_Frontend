import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Resultados from './pages/Resultados';
import Reserva from './pages/Reserva';
import AdminRoute from './components/Admin/AdminRoute';
import AdminLayout from './pages/admin/AdminLayout';
import EmpleadosAdmin from './pages/admin/EmpleadosAdmin';
import VehiculosAdmin from './pages/admin/VehiculosAdmin';
import OfertasAdmin from './pages/admin/OfertasAdmin';
import PlanesAdmin from './pages/admin/PlanesAdmin';
import ReportesAdmin from './pages/admin/ReportesAdmin';
import SedesAdmin from './pages/admin/SedesAdmin';
import RutasAdmin from './pages/admin/RutasAdmin';
import ProgramacionAdmin from './pages/admin/ProgramacionAdmin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/viajes" element={<Resultados />} />
          <Route path="/reserva" element={<Reserva />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="empleados" replace />} />
              <Route path="empleados" element={<EmpleadosAdmin />} />
              <Route path="vehiculos" element={<VehiculosAdmin />} />
              <Route path="ofertas" element={<OfertasAdmin />} />
              <Route path="planes" element={<PlanesAdmin />} />
              <Route path="sedes" element={<SedesAdmin />} />
              <Route path="rutas" element={<RutasAdmin />} />
              <Route path="programacion" element={<ProgramacionAdmin />} />
              <Route path="reportes" element={<ReportesAdmin />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}