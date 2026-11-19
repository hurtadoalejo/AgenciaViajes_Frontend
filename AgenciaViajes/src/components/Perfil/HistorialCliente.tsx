import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './HistorialCliente.module.css';
import type { Cupon, ReservaCreada } from '../../types/compra';
import { API_BASE, formatearFecha, formatearHora, formatearPrecio, leerError } from '../../utils/compra';

export type VistaHistorial = 'compras' | 'pagos' | 'ofertas';

/** Días mínimos entre hoy y el día del primer viaje para poder cancelar (misma regla del backend). */
const DIAS_MINIMOS_CANCELACION = 5;

const NOMBRE_METODO: Record<string, string> = {
  TARJETA_CREDITO: 'Tarjeta de crédito',
  TARJETA_DEBITO: 'Tarjeta débito',
  PSE: 'PSE',
  EFECTIVO: 'Efectivo',
};

const NOMBRE_ESTADO_PAGO: Record<string, string> = {
  APROBADA: 'Aprobado',
  REEMBOLSADA: 'Reembolsado',
  RECHAZADA: 'Rechazado',
  PENDIENTE: 'Pendiente',
};

const CLASE_ESTADO: Record<string, string> = {
  CONFIRMADA: styles.badgeOk,
  PENDIENTE: styles.badgeWarn,
  CANCELADA: styles.badgeOff,
};

const TITULO: Record<VistaHistorial, string> = {
  compras: 'Mis compras',
  pagos: 'Mis pagos',
  ofertas: 'Ofertas disponibles',
};

/** "2026-11-12T15:42:00" -> "12 nov 2026, 15:42" */
function fechaHora(texto: string | null): string {
  if (!texto) return '—';
  return `${formatearFecha(texto)}, ${formatearHora(texto)}`;
}

/** Días calendario que faltan desde hoy hasta el día de la primera salida de la reserva. */
function diasParaElViaje(compra: ReservaCreada): number | null {
  if (compra.viajes.length === 0) return null;
  const primera = compra.viajes.map((v) => v.fechaHoraSalida).sort()[0];
  const [a, m, d] = primera.slice(0, 10).split('-').map(Number);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((new Date(a, m - 1, d).getTime() - inicioHoy.getTime()) / 86_400_000);
}

/** Historial del cliente en su perfil: compras, pagos y ofertas que todavía puede usar. */
export default function HistorialCliente({ idCliente, vista }: { idCliente: number; vista: VistaHistorial }) {
  const [compras, setCompras] = useState<ReservaCreada[] | null>(null);
  const [ofertas, setOfertas] = useState<Cupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<number | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        const [rCompras, rOfertas] = await Promise.all([
          fetch(`${API_BASE}/clientes/${idCliente}/compras`),
          fetch(`${API_BASE}/clientes/${idCliente}/ofertas`),
        ]);
        if (!rCompras.ok) {
          const mensaje = await leerError(rCompras, 'No se pudo cargar el historial.');
          if (vigente) setError(mensaje);
          return;
        }
        const dataCompras: ReservaCreada[] = await rCompras.json();
        const dataOfertas: Cupon[] = rOfertas.ok ? await rOfertas.json() : [];
        if (vigente) {
          setCompras(dataCompras);
          setOfertas(dataOfertas);
          setError(null);
        }
      } catch {
        if (vigente) setError('No se pudo conectar con el servidor.');
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [idCliente, recarga]);

  const cancelar = async (compra: ReservaCreada) => {
    const pagada = compra.pago !== null;
    const mensaje = pagada
      ? `¿Cancelar la reserva #${compra.idReserva}? Los asientos quedan libres y el pago de ${formatearPrecio(
          compra.pago?.montoPagado ?? 0
        )} queda como reembolsado.`
      : `¿Cancelar la reserva #${compra.idReserva}? Los asientos quedarán libres.`;
    if (!window.confirm(mensaje)) return;
    setCancelando(compra.idReserva);
    setError(null);
    setAviso(null);
    try {
      const res = await fetch(`${API_BASE}/reservas/${compra.idReserva}/cancelar?idCliente=${idCliente}`, {
        method: 'PUT',
      });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo cancelar la reserva.'));
        return;
      }
      setAviso(
        pagada
          ? `Reserva #${compra.idReserva} cancelada. El pago quedó registrado como reembolsado.`
          : `Reserva #${compra.idReserva} cancelada.`
      );
      setRecarga((n) => n + 1);
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setCancelando(null);
    }
  };

  const pagos = (compras ?? []).filter((c) => c.pago !== null);
  const totalPagado = pagos
    .filter((c) => c.pago?.estadoTransaccion === 'APROBADA')
    .reduce((suma, c) => suma + (c.pago?.montoPagado ?? 0), 0);

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{TITULO[vista]}</h2>

      {error && <div className={styles.alertError}>{error}</div>}
      {aviso && <div className={styles.alertOk}>{aviso}</div>}
      {!error && compras === null && <p className={styles.muted}>Cargando…</p>}

      {/* ---------- Compras ---------- */}
      {compras !== null && vista === 'compras' && (
        compras.length === 0 ? (
          <div className={styles.empty}>
            Aún no tienes compras. <Link to="/">Busca tu primer viaje</Link>.
          </div>
        ) : (
          <div className={styles.list}>
            {compras.map((c) => {
              const dias = diasParaElViaje(c);
              const activa = c.estadoReserva !== 'CANCELADA';
              const puedeCancelar = activa && dias !== null && dias >= DIAS_MINIMOS_CANCELACION;
              return (
                <article key={c.idReserva} className={styles.item}>
                  <header className={styles.itemHeader}>
                    <div>
                      <strong>Reserva #{c.idReserva}</strong>
                      <span className={styles.muted}> · {fechaHora(c.fechaReserva)}</span>
                    </div>
                    <span className={`${styles.badge} ${CLASE_ESTADO[c.estadoReserva] ?? ''}`}>{c.estadoReserva}</span>
                  </header>
                  <ul className={styles.trips}>
                    {c.viajes.map((v) => (
                      <li key={v.idProgramacionViaje}>
                        <span className={styles.tripType}>{v.tipoTrayecto === 'IDA' ? 'Ida' : 'Regreso'}</span>
                        {v.ciudadOrigen} → {v.ciudadDestino} · {formatearFecha(v.fechaHoraSalida)},{' '}
                        {formatearHora(v.fechaHoraSalida)}–{formatearHora(v.fechaHoraLlegada)}
                      </li>
                    ))}
                  </ul>
                  <div className={styles.passengers}>
                    {c.pasajeros.map((p) => (
                      <span key={p.idDetalle} className={styles.chip}>
                        {p.nombreCompleto} · asiento {p.numeroAsiento} · {p.nombrePlan}
                      </span>
                    ))}
                  </div>
                  <footer className={styles.itemFooter}>
                    <span className={styles.muted}>
                      {c.tituloOferta ? `Oferta ${c.tituloOferta} (−${formatearPrecio(c.descuento)})` : 'Sin oferta'}
                    </span>
                    <span className={styles.amount}>{formatearPrecio(c.valorTotal)}</span>
                  </footer>
                  {activa && (
                    <div className={styles.itemActions}>
                      <span className={styles.muted}>
                        {c.estadoReserva === 'PENDIENTE' ? 'Esta reserva no se ha pagado. ' : ''}
                        {puedeCancelar
                          ? `Puedes cancelarla hasta ${DIAS_MINIMOS_CANCELACION} días antes del viaje.`
                          : dias !== null && dias >= 0
                            ? `Ya no se puede cancelar: faltan ${dias} ${dias === 1 ? 'día' : 'días'} para el viaje (mínimo ${DIAS_MINIMOS_CANCELACION}).`
                            : 'El viaje ya se realizó.'}
                      </span>
                      {puedeCancelar && (
                        <button
                          type="button"
                          className={styles.dangerButton}
                          disabled={cancelando === c.idReserva}
                          onClick={() => cancelar(c)}
                        >
                          {cancelando === c.idReserva ? 'Cancelando…' : 'Cancelar reserva'}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )
      )}

      {/* ---------- Pagos ---------- */}
      {compras !== null && vista === 'pagos' && (
        pagos.length === 0 ? (
          <div className={styles.empty}>Todavía no hay pagos registrados.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Factura</th>
                    <th>Fecha de pago</th>
                    <th>Reserva</th>
                    <th>Método</th>
                    <th>Estado</th>
                    <th className={styles.right}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((c) => (
                    <tr key={c.idReserva}>
                      <td><strong>{c.pago?.numeroFactura ?? '—'}</strong></td>
                      <td>{fechaHora(c.pago?.fechaPago ?? null)}</td>
                      <td>
                        #{c.idReserva} · {c.viajes[0]?.ciudadOrigen} → {c.viajes[0]?.ciudadDestino}
                      </td>
                      <td>{NOMBRE_METODO[c.pago?.metodoPago ?? ''] ?? c.pago?.metodoPago}</td>
                      <td>{NOMBRE_ESTADO_PAGO[c.pago?.estadoTransaccion ?? ''] ?? c.pago?.estadoTransaccion}</td>
                      <td className={styles.right}>{formatearPrecio(c.pago?.montoPagado ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.total}>
              <span>Total pagado (sin reembolsos)</span>
              <span>{formatearPrecio(totalPagado)}</span>
            </div>
          </>
        )
      )}

      {/* ---------- Ofertas ---------- */}
      {ofertas !== null && vista === 'ofertas' && (
        ofertas.length === 0 ? (
          <div className={styles.empty}>
            No tienes ofertas disponibles en este momento. Cada oferta se puede usar una sola vez.
          </div>
        ) : (
          <div className={styles.coupons}>
            {ofertas.map((oferta) => (
              <article key={oferta.idOferta} className={styles.coupon}>
                <div className={styles.couponPercent}>−{oferta.porcentajeDescuento}%</div>
                <div>
                  <strong>{oferta.titulo}</strong>
                  {oferta.descripcion && <p className={styles.couponText}>{oferta.descripcion}</p>}
                  <p className={styles.muted}>Válida hasta el {formatearFecha(oferta.fechaFin)}</p>
                </div>
              </article>
            ))}
            <p className={styles.muted}>
              Elige la oferta en el paso de pasajeros al hacer tu reserva. Cada oferta se puede usar una sola vez;
              si cancelas la reserva, la oferta vuelve a quedar disponible.
            </p>
          </div>
        )
      )}
    </section>
  );
}
