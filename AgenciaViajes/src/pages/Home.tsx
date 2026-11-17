import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from '../App.module.css';
import Navbar from '../components/Layout/Navbar';
import ModeSelector from '../components/SearchForm/ModeSelector';
import TripType from '../components/SearchForm/TripType';
import FormInputs, { type SearchValues } from '../components/SearchForm/FormInputs';
import SearchButton from '../components/SearchForm/SearchButton';
import { EUROPEAN_CITIES } from '../components/SearchForm/europeanCities';
import type { TransportMode } from '../types';
import { aFechaApi, guardarBusqueda, leerBusqueda } from '../utils/compra';

const backgroundClasses: Record<TransportMode, string> = {
  avion: styles.bgAvion,
  tren: styles.bgTren,
  bus: styles.bgBus,
};

const codigoDe = (nombre: string) => EUROPEAN_CITIES.find((c) => c.name === nombre)?.code ?? '';
const nombreDe = (codigo: string) => EUROPEAN_CITIES.find((c) => c.code === codigo)?.name ?? '';

/** "2026-12-10" -> Date local (o null si ya pasó). */
function aFecha(texto: string | null): Date | null {
  if (!texto) return null;
  const [a, m, d] = texto.split('-').map(Number);
  const fecha = new Date(a, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha < hoy ? null : fecha;
}

export default function Home() {
  const navigate = useNavigate();
  const anterior = leerBusqueda();

  const [mode, setMode] = useState<TransportMode>(anterior?.mode ?? 'avion');
  const [tripType, setTripType] = useState<'ida-vuelta' | 'solo-ida'>(anterior?.tripType ?? 'ida-vuelta');
  const [values, setValues] = useState<SearchValues>(() => ({
    origin: anterior ? codigoDe(anterior.origen) : '',
    destination: anterior ? codigoDe(anterior.destino) : '',
    passengers: String(anterior?.pasajeros ?? 1),
    departureDate: aFecha(anterior?.fechaIda ?? null),
    returnDate: aFecha(anterior?.fechaRegreso ?? null),
  }));
  const [error, setError] = useState<string | null>(null);

  const handleChange = (cambios: Partial<SearchValues>) => {
    setError(null);
    setValues((prev) => ({ ...prev, ...cambios }));
  };

  const handleBuscar = () => {
    if (!values.origin || !values.destination) {
      setError('Selecciona la ciudad de origen y la de destino.');
      return;
    }
    if (!values.departureDate) {
      setError('Selecciona la fecha de salida.');
      return;
    }
    if (tripType === 'ida-vuelta' && !values.returnDate) {
      setError('Selecciona la fecha de regreso o cambia a "Solo ida".');
      return;
    }
    guardarBusqueda({
      mode,
      tripType,
      origen: nombreDe(values.origin),
      destino: nombreDe(values.destination),
      fechaIda: aFechaApi(values.departureDate),
      fechaRegreso: tripType === 'ida-vuelta' && values.returnDate ? aFechaApi(values.returnDate) : null,
      pasajeros: Number(values.passengers),
    });
    navigate('/viajes');
  };

  return (
    <div className={`${styles.mainContainer} ${backgroundClasses[mode]}`}>
      <div className={styles.overlay}>
        <Navbar currentMode={mode} />
        <main className={styles.contentWrapper}>
          <div className={styles.searchBox}>
            <div>
              <label className={styles.selectorLabel}>
                ¿En dónde quieres viajar hoy?
              </label>
              <ModeSelector currentMode={mode} onModeChange={setMode} />
            </div>

            <hr className={styles.divider} />

            <div className={styles.formRow}>
              <div style={{ flexGrow: 1, width: '100%' }}>
                <TripType currentType={tripType} onTypeChange={setTripType} />
                <FormInputs tripType={tripType} values={values} onChange={handleChange} />
              </div>
              <SearchButton onClick={handleBuscar} />
            </div>

            {error && <p className={styles.searchError}>{error}</p>}
          </div>
        </main>
      </div>
    </div>
  );
}
