import type { BusquedaGuardada, CompraEnCurso } from '../types/compra';

export const API_BASE = 'http://localhost:8080/api';

const CLAVE_BUSQUEDA = 'busquedaViaje';
const CLAVE_COMPRA = 'compraEnCurso';

/** Lee el mensaje de error del backend (ProblemDetail: detail / errores). */
export async function leerError(res: Response, porDefecto: string): Promise<string> {
  try {
    const body = await res.json();
    if (body?.errores && typeof body.errores === 'object') {
      const mensajes = Object.values(body.errores).filter((m): m is string => typeof m === 'string');
      if (mensajes.length > 0) return mensajes.join('. ');
    }
    if (typeof body?.detail === 'string') return body.detail;
    if (typeof body?.message === 'string') return body.message;
  } catch {
    // respuesta sin JSON
  }
  return porDefecto;
}

/** Fecha local en formato AAAA-MM-DD (sin pasar por UTC, para no correr el día). */
export function aFechaApi(fecha: Date): string {
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${m}-${d}`;
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatearPrecio(valor: number): string {
  return formatoMoneda.format(valor);
}

/** "2026-12-10T07:00:00" -> "07:00" */
export function formatearHora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

/** "2026-12-10" o "2026-12-10T07:00:00" -> "jue, 10 dic 2026" */
export function formatearFecha(fecha: string): string {
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatearDuracion(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function leer<T>(clave: string): T | null {
  try {
    const texto = sessionStorage.getItem(clave);
    return texto ? (JSON.parse(texto) as T) : null;
  } catch {
    return null;
  }
}

function guardar(clave: string, valor: unknown) {
  try {
    sessionStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin almacenamiento: la compra sigue funcionando mientras no se recargue la página
  }
}

export const leerBusqueda = () => leer<BusquedaGuardada>(CLAVE_BUSQUEDA);
export const guardarBusqueda = (b: BusquedaGuardada) => guardar(CLAVE_BUSQUEDA, b);
export const leerCompra = () => leer<CompraEnCurso>(CLAVE_COMPRA);
export const guardarCompra = (c: CompraEnCurso) => guardar(CLAVE_COMPRA, c);

export function limpiarCompra() {
  try {
    sessionStorage.removeItem(CLAVE_COMPRA);
  } catch {
    // nada que limpiar
  }
}
