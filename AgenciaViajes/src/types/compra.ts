import type { TransportMode } from './index';

/** Lo que el usuario llenó en el buscador de la página principal. */
export interface BusquedaGuardada {
  mode: TransportMode;
  tripType: 'ida-vuelta' | 'solo-ida';
  origen: string; // nombre de la ciudad (ej. "Madrid")
  destino: string;
  fechaIda: string; // AAAA-MM-DD
  fechaRegreso: string | null;
  pasajeros: number;
}

/** Una salida que devuelve POST /api/rutas/buscar. */
export interface ViajeDisponible {
  idProgramacionViaje: number;
  idRuta: number;
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  duracionEstimada: number;
  direccionOrigen: string | null;
  direccionDestino: string | null;
  tipoTransporte: string;
  codigoVehiculo: string;
  distancia: number;
  precioBase: number;
  precioTotal: number;
  asientosDisponibles: number;
}

export interface TramoResultado {
  origen: string;
  paisOrigen: string;
  destino: string;
  paisDestino: string;
  fecha: string;
  viajes: ViajeDisponible[];
}

export interface BusquedaRutasResponse {
  tipoTransporte: string;
  pasajeros: number;
  tramos: TramoResultado[];
}

/** Salida elegida por el usuario para un tramo. */
export interface ViajeElegido {
  tipoTrayecto: 'IDA' | 'VUELTA';
  origen: string;
  destino: string;
  viaje: ViajeDisponible;
}

/** Lo que pasa de la página de resultados a la de reserva. */
export interface CompraEnCurso {
  busqueda: BusquedaGuardada;
  viajes: ViajeElegido[];
}

export interface PasajeroForm {
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string;
  primerApellido: string;
  segundoApellido: string;
  idPlan: number | '';
}

export interface ReservaPayload {
  idCliente: number;
  idEmpleado: number | null;
  idOferta: number | null;
  viajes: { idProgramacionViaje: number; tipoTrayecto: string }[];
  pasajeros: {
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    primerNombre: string;
    segundoNombre: string | null;
    primerApellido: string;
    segundoApellido: string | null;
    numeroAsiento: null;
    idPlan: number;
  }[];
}

export interface PagoInfo {
  idReserva: number;
  montoPagado: number;
  fechaPago: string;
  metodoPago: string;
  estadoTransaccion: string;
  numeroFactura: string | null;
  fechaEmision: string | null;
}

export interface ReservaCreada {
  idReserva: number;
  fechaReserva: string;
  estadoReserva: string;
  idCliente: number;
  nombreCliente: string;
  idEmpleado: number | null;
  nombreEmpleado: string | null;
  idOferta: number | null;
  tituloOferta: string | null;
  viajes: {
    idProgramacionViaje: number;
    tipoTrayecto: string;
    ciudadOrigen: string;
    ciudadDestino: string;
    fechaHoraSalida: string;
    fechaHoraLlegada: string;
    precioBase: number;
  }[];
  /** Un registro por pasajero (DetalleReserva); viaja en todos los viajes con el mismo asiento. */
  pasajeros: {
    idDetalle: number;
    tipoIdentificacion: string;
    numeroIdentificacion: string;
    nombreCompleto: string;
    numeroAsiento: string;
    idPlan: number;
    nombrePlan: string;
    precioExtra: number;
  }[];
  subtotal: number;
  descuento: number;
  valorTotal: number;
  pago: PagoInfo | null;
}

export interface ClienteBusqueda {
  idUsuario: number;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  correo: string;
}

/** Oferta vigente que el cliente todavía no ha usado (GET /api/clientes/{id}/ofertas). */
export interface Cupon {
  idOferta: number;
  titulo: string;
  descripcion: string | null;
  porcentajeDescuento: number;
  fechaInicio: string;
  fechaFin: string;
  fechaNotificacion: string | null;
}
