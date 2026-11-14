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