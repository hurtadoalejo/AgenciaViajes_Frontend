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