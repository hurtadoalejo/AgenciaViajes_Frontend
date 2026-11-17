import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styles from './Compra.module.css';
import Navbar from '../components/Layout/Navbar';
import iconVolverAtras from '../assets/iconVolverAtras.png';
import { useAuth } from '../hooks/useAuth';
import type { BusquedaGuardada, BusquedaRutasResponse, ViajeDisponible, ViajeElegido } from '../types/compra';
import {
  API_BASE,
  formatearDuracion,
  formatearFecha,
  formatearHora,
  formatearPrecio,
  guardarCompra,
  leerBusqueda,
  leerError,
} from '../utils/compra';

const NOMBRE_TRANSPORTE: Record<string, string> = { avion: 'Avión', tren: 'Tren', bus: 'Bus' };

export default function Resultados() {
  const busqueda = leerBusqueda();
  if (!busqueda) {
    return <Navigate to="/" replace />;
  }
  return <ResultadosBusqueda busqueda={busqueda} />;
}

function ResultadosBusqueda({ busqueda }: { busqueda: BusquedaGuardada }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [resultado, setResultado] = useState<BusquedaRutasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<(ViajeDisponible | null)[]>([]);

  useEffect(() => {
    let vigente = true;
    const tramos = [{ origen: busqueda.origen, destino: busqueda.destino, fecha: busqueda.fechaIda }];
    if (busqueda.fechaRegreso) {
      tramos.push({ origen: busqueda.destino, destino: busqueda.origen, fecha: busqueda.fechaRegreso });
    }
    const buscar = async () => {
      try {
        const res = await fetch(`${API_BASE}/rutas/buscar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipoTransporte: busqueda.mode, pasajeros: busqueda.pasajeros, tramos }),
        });
        if (!res.ok) {
          const mensaje = await leerError(res, 'No se pudo realizar la búsqueda.');
          if (vigente) setError(mensaje);
          return;
        }
        const data: BusquedaRutasResponse = await res.json();
        if (vigente) {
          setResultado(data);
          setSeleccion(data.tramos.map((t) => (t.viajes.length === 1 ? t.viajes[0] : null)));
        }
      } catch {
        if (vigente) setError('No se pudo conectar con el servidor. Verifica que el backend esté encendido.');
      }
    };
    buscar();
    return () => {
      vigente = false;
    };
  }, [busqueda.origen, busqueda.destino, busqueda.fechaIda, busqueda.fechaRegreso, busqueda.mode, busqueda.pasajeros]);

  const elegir = (indiceTramo: number, viaje: ViajeDisponible) => {
    setSeleccion((prev) => prev.map((v, i) => (i === indiceTramo ? viaje : v)));
  };

  const completa = resultado !== null && seleccion.length > 0 && seleccion.every((v) => v !== null);
  const total = seleccion.reduce((suma, v) => suma + (v?.precioTotal ?? 0), 0);

  const continuar = () => {
    if (!resultado || !completa) return;
    const viajes: ViajeElegido[] = resultado.tramos.map((tramo, i) => ({
      tipoTrayecto: i === 0 ? 'IDA' : 'VUELTA',
      origen: tramo.origen,
      destino: tramo.destino,
      viaje: seleccion[i] as ViajeDisponible,
    }));
    guardarCompra({ busqueda, viajes });
    if (!user) {
      navigate('/login', { state: { from: '/reserva' } });
      return;
    }
    navigate('/reserva');
  };

  return (
    <div className={styles.page}>
      <Navbar currentMode={busqueda.mode} />
      <main className={styles.content}>
        <div className={styles.topRow}>
          <div>
            <button type="button" className={styles.backButton} onClick={() => navigate('/')}>
              <img src={iconVolverAtras} alt="" className={styles.backIcon} />
              Cambiar búsqueda
            </button>
            <h2 className={styles.title}>
              {busqueda.origen} → {busqueda.destino}
            </h2>
            <p className={styles.subtitle}>
              {NOMBRE_TRANSPORTE[busqueda.mode]} · {busqueda.pasajeros}{' '}
              {busqueda.pasajeros === 1 ? 'pasajero' : 'pasajeros'} ·{' '}
              {busqueda.fechaRegreso ? 'Ida y vuelta' : 'Solo ida'}
            </p>
          </div>
        </div>

        <ol className={styles.steps}>
          <li className={`${styles.step} ${styles.stepActive}`}><span className={styles.stepNumber}>1</span>Elegir viaje</li>
          <li className={styles.step}><span className={styles.stepNumber}>2</span>Pasajeros</li>
          <li className={styles.step}><span className={styles.stepNumber}>3</span>Verificar</li>
          <li className={styles.step}><span className={styles.stepNumber}>4</span>Pago</li>
        </ol>

        {error && <div className={styles.alertError}>{error}</div>}
        {!error && !resultado && <div className={styles.loading}>Buscando viajes disponibles…</div>}

        {resultado?.tramos.map((tramo, i) => (
          <section key={`${tramo.origen}-${tramo.destino}-${tramo.fecha}`} className={styles.card}>
            <span className={styles.sectionLabel}>{i === 0 ? 'Ida' : 'Regreso'}</span>
            <h3 className={styles.cardTitle}>
              {tramo.origen} ({tramo.paisOrigen}) → {tramo.destino} ({tramo.paisDestino})
            </h3>
            <p className={styles.cardSubtitle}>{formatearFecha(tramo.fecha)}</p>

            {tramo.viajes.length === 0 ? (
              <div className={styles.empty}>
                No hay salidas en {NOMBRE_TRANSPORTE[busqueda.mode].toLowerCase()} con cupo para{' '}
                {busqueda.pasajeros} {busqueda.pasajeros === 1 ? 'pasajero' : 'pasajeros'} ese día. Prueba otra
                fecha (hay salidas del 1 de diciembre de 2026 al 31 de enero de 2027) u otro medio de transporte.
              </div>
            ) : (
              <div className={styles.tripList}>
                {tramo.viajes.map((viaje) => {
                  const elegido = seleccion[i]?.idProgramacionViaje === viaje.idProgramacionViaje;
                  return (
                    <label
                      key={viaje.idProgramacionViaje}
                      className={`${styles.tripOption} ${elegido ? styles.tripOptionSelected : ''}`}
                    >
                      <input
                        type="radio"
                        name={`tramo-${i}`}
                        className={styles.tripRadio}
                        checked={elegido}
                        onChange={() => elegir(i, viaje)}
                      />
                      <div>
                        <div className={styles.tripTimes}>
                          <span className={styles.time}>{formatearHora(viaje.fechaHoraSalida)}</span>
                          <span className={styles.timeLine}>{formatearDuracion(viaje.duracionEstimada)}</span>
                          <span className={styles.time}>{formatearHora(viaje.fechaHoraLlegada)}</span>
                        </div>
                        <div className={styles.tripMeta}>
                          {viaje.direccionOrigen ?? tramo.origen} → {viaje.direccionDestino ?? tramo.destino}
                          {' · '}
                          {viaje.codigoVehiculo} · {viaje.asientosDisponibles} asientos libres
                        </div>
                      </div>
                      <div className={styles.tripPrice}>
                        <div className={styles.price}>{formatearPrecio(viaje.precioTotal)}</div>
                        <div className={styles.priceNote}>
                          {formatearPrecio(viaje.precioBase)} por persona
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {resultado && (
          <div className={styles.card}>
            <div className={styles.summaryTotal} style={{ marginTop: 0, paddingTop: 0, borderTop: 'none' }}>
              <span>Total tiquetes (sin plan ni descuentos)</span>
              <span>{formatearPrecio(total)}</span>
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} disabled={!completa} onClick={continuar}>
                {user ? 'Continuar' : 'Iniciar sesión para continuar'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
