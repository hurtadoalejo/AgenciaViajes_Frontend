import { useEffect, useState } from 'react';
import styles from './HistorialCliente.module.css';
import type { ReservaCreada } from '../../types/compra';
import { API_BASE, formatearFecha, formatearHora, leerError } from '../../utils/compra';

/** GET /api/reservas/{id}/viajes/{idProgramacionViaje}/alternativas */
interface AlternativaFecha {
  idProgramacionViaje: number;
  fechaHoraSalida: string;
  fechaHoraLlegada: string;
  asientosDisponibles: number;
}

type ViajeReserva = ReservaCreada['viajes'][number];

interface Props {
  idCliente: number;
  idReserva: number;
  viaje: ViajeReserva;
  onCerrar: () => void;
  onCambiada: (mensaje: string) => void;
}

/**
 * Panel para mover un viaje de la reserva a otra fecha de la misma ruta.
 * Solo cambia la salida (fecha y hora): mismo trayecto, precio, pasajeros, plan y oferta.
 */
export default function CambiarFechaViaje({ idCliente, idReserva, viaje, onCerrar, onCambiada }: Props) {
  const [alternativas, setAlternativas] = useState<AlternativaFecha[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fecha, setFecha] = useState('');
  const [elegida, setElegida] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        const res = await fetch(
          `${API_BASE}/reservas/${idReserva}/viajes/${viaje.idProgramacionViaje}/alternativas?idCliente=${idCliente}`
        );
        if (!res.ok) {
          const mensaje = await leerError(res, 'No se pudieron cargar las fechas disponibles.');
          if (vigente) setError(mensaje);
          return;
        }
        const data: AlternativaFecha[] = await res.json();
        if (vigente) setAlternativas(data);
      } catch {
        if (vigente) setError('No se pudo conectar con el servidor.');
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [idCliente, idReserva, viaje.idProgramacionViaje]);

  const diaDe = (fechaHora: string) => fechaHora.slice(0, 10);
  const delDia = (alternativas ?? []).filter((a) => diaDe(a.fechaHoraSalida) === fecha);
  const primera = alternativas?.[0];
  const ultima = alternativas?.[alternativas.length - 1];

  const elegirFecha = (valor: string) => {
    setFecha(valor);
    const opciones = (alternativas ?? []).filter((a) => diaDe(a.fechaHoraSalida) === valor);
    setElegida(opciones.length === 1 ? opciones[0].idProgramacionViaje : null);
  };

  const confirmar = async () => {
    const nueva = alternativas?.find((a) => a.idProgramacionViaje === elegida);
    if (!nueva) return;
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/reservas/${idReserva}/viajes/${viaje.idProgramacionViaje}?idCliente=${idCliente}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idProgramacionViajeNuevo: nueva.idProgramacionViaje }),
        }
      );
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo cambiar la fecha.'));
        return;
      }
      onCambiada(
        `Reserva #${idReserva}: el viaje ${viaje.ciudadOrigen} → ${viaje.ciudadDestino} quedó para el ${formatearFecha(
          nueva.fechaHoraSalida
        )} a las ${formatearHora(nueva.fechaHoraSalida)}.`
      );
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className={styles.cambioPanel}>
      <div className={styles.cambioHeader}>
        <strong>Cambiar fecha del viaje</strong>
        <span className={styles.muted}>
          {viaje.ciudadOrigen} → {viaje.ciudadDestino} · hoy: {formatearFecha(viaje.fechaHoraSalida)},{' '}
          {formatearHora(viaje.fechaHoraSalida)}
        </span>
      </div>
      <p className={styles.muted}>
        Solo cambia la fecha y hora de este viaje; el trayecto, el precio, los pasajeros, el plan y la oferta se
        mantienen.
      </p>

      {error && <div className={styles.alertError}>{error}</div>}
      {!error && alternativas === null && <p className={styles.muted}>Cargando fechas disponibles…</p>}

      {alternativas !== null && alternativas.length === 0 && !error && (
        <div className={styles.empty}>No hay otras salidas de esta ruta con cupo para todos los pasajeros.</div>
      )}

      {alternativas !== null && alternativas.length > 0 && (
        <>
          <label className={styles.cambioLabel} htmlFor={`fecha-${idReserva}-${viaje.idProgramacionViaje}`}>
            Nueva fecha
          </label>
          <input
            id={`fecha-${idReserva}-${viaje.idProgramacionViaje}`}
            type="date"
            className={styles.dateInput}
            value={fecha}
            min={primera ? diaDe(primera.fechaHoraSalida) : undefined}
            max={ultima ? diaDe(ultima.fechaHoraSalida) : undefined}
            onChange={(e) => elegirFecha(e.target.value)}
          />
          {primera && ultima && (
            <p className={styles.muted}>
              Hay salidas disponibles del {formatearFecha(primera.fechaHoraSalida)} al{' '}
              {formatearFecha(ultima.fechaHoraSalida)}.
            </p>
          )}

          {fecha && delDia.length === 0 && (
            <div className={styles.empty}>No hay salidas con cupo ese día. Prueba otra fecha.</div>
          )}

          {delDia.length > 0 && (
            <div className={styles.cambioOptions}>
              {delDia.map((a) => (
                <label
                  key={a.idProgramacionViaje}
                  className={`${styles.cambioOption} ${elegida === a.idProgramacionViaje ? styles.cambioOptionActive : ''}`}
                >
                  <input
                    type="radio"
                    name={`salida-${idReserva}-${viaje.idProgramacionViaje}`}
                    checked={elegida === a.idProgramacionViaje}
                    onChange={() => setElegida(a.idProgramacionViaje)}
                  />
                  <span>
                    {formatearHora(a.fechaHoraSalida)}–{formatearHora(a.fechaHoraLlegada)}
                  </span>
                  <span className={styles.muted}>{a.asientosDisponibles} asientos libres</span>
                </label>
              ))}
            </div>
          )}
        </>
      )}

      <div className={styles.cambioActions}>
        <button type="button" className={styles.secondaryButton} onClick={onCerrar} disabled={guardando}>
          Cerrar
        </button>
        <button
          type="button"
          className={styles.primaryButton}
          onClick={confirmar}
          disabled={elegida === null || guardando}
        >
          {guardando ? 'Guardando…' : 'Confirmar cambio'}
        </button>
      </div>
    </div>
  );
}
