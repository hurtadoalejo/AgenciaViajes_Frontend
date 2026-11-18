export type TransportMode = 'avion' | 'tren' | 'bus';

export interface AuthUser {
  idUsuario: number;
  nombre?: string;
  nombreCompleto?: string;
  nombreCorto?: string;
  correo: string;
  rol: string;
  tipoUsuario: 'EMPLEADO' | 'CLIENTE';
}

export interface ClientePerfil {
  idUsuario: number;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string;
  pais: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  indicativo: string;
  telefono: string;
  correo: string;
  rol: string;
}

export interface EmpleadoPerfil {
  datosPersonales: ClientePerfil;
  salario: number;
  fechaContratacion: string;
  idCargo: number;
  nombreCargo: string;
  idSede: number;
  nombreSede: string;
}

export interface CargoOption {
  idCargo: number;
  nombreCargo: string;
}

export interface SedeOption {
  idSede: number;
  nombreSede: string;
  direccion?: string;
}

export interface CatalogoItem {
  id: number;
  nombre: string;
}

export interface EmpleadoActualizarPayload {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string;
  pais: string;
  departamento: string;
  ciudad: string;
  direccion: string;
  indicativo: string;
  telefono: string;
  correo: string;
  salario: number;
  fechaContratacion: string;
  idCargo: number;
  idSede: number;
  rol: string;
}

export interface EmpleadoCrearPayload extends EmpleadoActualizarPayload {
  contrasena: string;
}

export interface SedeItem {
  idSede: number;
  nombreSede: string;
  direccion: string;
  idCiudad: number;
  nombreCiudad: string;
}

export interface VehiculoItem {
  idVehiculo: number;
  codigoIdentificacion: string;
  tipoTransporte: string;
  capacidad: number;
}

export interface VehiculoPayload {
  codigoIdentificacion: string;
  tipoTransporte: string;
  capacidad: number;
}

export interface OfertaItem {
  idOferta: number;
  titulo: string;
  descripcion: string | null;
  porcentajeDescuento: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface OfertaPayload {
  titulo: string;
  descripcion: string | null;
  porcentajeDescuento: number;
  fechaInicio: string;
  fechaFin: string;
}

export interface PlanItem {
  idPlan: number;
  nombrePlan: string;
  descripcionPlan: string | null;
  pesoMaxEquipaje: number;
  incluyeCheckIn: boolean;
  precioExtra: number;
}

export interface PlanPayload {
  nombrePlan: string;
  descripcionPlan: string | null;
  pesoMaxEquipaje: number;
  incluyeCheckIn: boolean;
  precioExtra: number;
}

export interface VentaMensualItem {
  periodo: string;
  cantidadVentas: number;
  totalVendido: number;
}

export interface IngresoMetodoPagoItem {
  metodoPago: string;
  cantidadPagos: number;
  totalIngresos: number;
  porcentaje: number;
}

export interface ReservasEmpleadoItem {
  idEmpleado: number;
  nombreEmpleado: string;
  cargo: string;
  sede: string;
  cantidadReservas: number;
  totalVendido: number;
}

export interface RutaPasajerosItem {
  idRuta: number;
  origen: string;
  destino: string;
  tipoTransporte: string;
  reservas: number;
  pasajeros: number;
  promedioCategoria: number | null;
}

export interface ClienteGastoItem {
  idCliente: number;
  nombreCliente: string;
  correo: string;
  cantidadReservas: number;
  totalGastado: number;
  promedioClientes: number;
}

export interface SedeItem {
  idSede: number;
  nombreSede: string;
  direccion: string;
  pais: string;
  departamento: string;
  ciudad: string;
  idCiudad: number;
}

export interface SedePayload {
  nombreSede: string;
  direccion: string;
  pais: string;
  departamento: string;
  ciudad: string;
}

export type UbicacionesMap = Record<string, Record<string, string[]>>;

export interface RutaItem {
  idRuta: number;
  idCiudadOrigen: number;
  ciudadOrigen: string;
  direccionOrigen: string | null;
  idCiudadDestino: number;
  ciudadDestino: string;
  direccionDestino: string | null;
  distancia: number;
  duracionEstimada: number;
  precioBase: number;
  idVehiculo: number | null;
  codigoVehiculo: string | null;
  tipoTransporte: string | null;
}

export interface RutaPayload {
  idCiudadOrigen: number;
  direccionOrigen: string;
  idCiudadDestino: number;
  direccionDestino: string;
  distancia: number;
  duracionEstimada: number;
  precioBase: number;
  idVehiculo: number;
}

export interface VehiculoOption {
  idVehiculo: number;
  codigoIdentificacion: string;
  tipoTransporte: string;
  capacidad: number;
}

export interface CatalogoOption {
  id: number;
  nombre: string;
}

export interface ProgramacionItem {
  idProgramacionViaje: number;
  idRuta: number;
  ciudadOrigen: string;
  ciudadDestino: string;
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  tipoTransporte: string | null;
  codigoVehiculo: string | null;
}

export interface ProgramacionPayload {
  idRuta: number;
  fechaHoraSalida: string;
}

export interface ProgramacionRecurrentePayload {
  idRuta: number;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  cadaHoras: number;
}

export interface ProgramacionRecurrenteResult {
  creadas: number;
  omitidas: number;
  /** Salidas no creadas porque el vehículo no tenía 12 horas de descanso con otro viaje. */
  conflictos: number;
  salidas: ProgramacionItem[];
}