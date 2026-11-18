import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './HistorialCliente.module.css';
import type { Cupon, ReservaCreada } from '../../types/compra';
import { API_BASE, formatearFecha, formatearHora, formatearPrecio, leerError } from '../../utils/compra';

type Pestana = 'compras' | 'pagos' | 'cupones';

const NOMBRE_METODO: Record<string, string> = {
  TARJETA_CREDITO: 'Tarjeta de crédito',
  TARJETA_DEBITO: 'Tarjeta débito',
  PSE: 'PSE',
  EFECTIVO: 'Efectivo',
};

const CLASE_ESTADO: Record<string, string> = {
  CONFIRMADA: styles.badgeOk,
  PENDIENTE: styles.badgeWarn,
  CANCELADA: styles.badgeOff,
};

/** "2026-11-12T15:42:00" -> "12 nov 2026, 15:42" */
function fechaHora(texto: string | null): string {
  if (!texto) return '—';
  return `${formatearFecha(texto)}, ${formatearHora(texto)}`;
}

/** Historial del cliente en su perfil: compras, pagos y cupones disponibles. */
export default function HistorialCliente({ idCliente }: { idCliente: number }) {
  const [pestana, setPestana] = useState<Pestana>('compras');
  const [compras, setCompras] = useState<ReservaCreada[] | null>(null);
  const [cupones, setCupones] = useState<Cupon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        const [rCompras, rCupones] = await Promise.all([
          fetch(`${API_BASE}/clientes/${idCliente}/compras`),
          fetch(`${API_BASE}/clientes/${idCliente}/cupones`),
        ]);
        if (!rCompras.ok) {
          const mensaje = await leerError(rCompras, 'No se pudo cargar el historial.');
          if (vigente) setError(mensaje);
          return;
        }
        const dataCompras: ReservaCreada[] = await rCompras.json();
        const dataCupones: Cupon[] = rCupones.ok ? await rCupones.json() : [];
        if (vigente) {
          setCompras(dataCompras);
          setCupones(dataCupones);
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

  const cancelar = async (idReserva: number) => {
    if (!window.confirm(`¿Cancelar la reserva #${idReserva}? Los asientos quedarán libres.`)) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/${idReserva}/cancelar`, { method: 'PUT' });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo cancelar la reserva.'));
        return;
      }
      setRecarga((n) => n + 1);
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const pagos = (compras ?? []).filter((c) => c.pago !== null);
  const totalPagado = pagos.reduce((suma, c) => suma + (c.pago?.montoPagado ?? 0), 0);

  return (
    <section className={styles.card}>
      <h2 className={styles.title}>Mi actividad</h2>

      <div className={styles.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'compras'}
          className={`${styles.tab} ${pestana === 'compras' ? styles.tabActive : ''}`}
          onClick={() => setPestana('compras')}
        >
          Compras {compras && <span className={styles.count}>{compras.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'pagos'}
          className={`${styles.tab} ${pestana === 'pagos' ? styles.tabActive : ''}`}
          onClick={() => setPestana('pagos')}
        >
          Pagos {compras && <span className={styles.count}>{pagos.length}</span>}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestana === 'cupones'}
          className={`${styles.tab} ${pestana === 'cupones' ? styles.tabActive : ''}`}
          onClick={() => setPestana('cupones')}
        >
          Cupones {cupones && <span className={styles.count}>{cupones.length}</span>}
        </button>
      </div>

      {error && <div className={styles.alertError}>{error}</div>}
      {!error && compras === null && <p className={styles.muted}>Cargando…</p>}

      {/* ---------- Compras ---------- */}
      {compras !== null && pestana === 'compras' && (
        compras.length === 0 ? (
          <div className={styles.empty}>
            Aún no tienes compras. <Link to="/">Busca tu primer viaje</Link>.
          </div>
        ) : (
          <div className={styles.list}>
            {compras.map((c) => (
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
                {c.estadoReserva === 'PENDIENTE' && (
                  <div className={styles.itemActions}>
                    <span className={styles.muted}>Esta reserva no se ha pagado.</span>
                    <button type="button" className={styles.dangerButton} onClick={() => cancelar(c.idReserva)}>
                      Cancelar reserva
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )
      )}

      {/* ---------- Pagos ---------- */}
      {compras !== null && pestana === 'pagos' && (
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
                      <td>{c.pago?.estadoTransaccion}</td>
                      <td className={styles.right}>{formatearPrecio(c.pago?.montoPagado ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.total}>
              <span>Total pagado</span>
              <span>{formatearPrecio(totalPagado)}</span>
            </div>
          </>
        )
      )}

      {/* ---------- Cupones ---------- */}
      {cupones !== null && pestana === 'cupones' && (
        cupones.length === 0 ? (
          <div className={styles.empty}>No tienes cupones vigentes en este momento.</div>
        ) : (
          <div className={styles.coupons}>
            {cupones.map((cupon) => (
              <article key={cupon.idOferta} className={styles.coupon}>
                <div className={styles.couponPercent}>−{cupon.porcentajeDescuento}%</div>
                <div>
                  <strong>{cupon.titulo}</strong>
                  {cupon.descripcion && <p className={styles.couponText}>{cupon.descripcion}</p>}
                  <p className={styles.muted}>
                    Válido hasta el {formatearFecha(cupon.fechaFin)}
                    {cupon.fechaNotificacion && ` · recibido el ${formatearFecha(cupon.fechaNotificacion)}`}
                  </p>
                </div>
              </article>
            ))}
            <p className={styles.muted}>Elige el cupón en el paso de pasajeros al hacer tu reserva.</p>
          </div>
        )
      )}
    </section>
  );
}
