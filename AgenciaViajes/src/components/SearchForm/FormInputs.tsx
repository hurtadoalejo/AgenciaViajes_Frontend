import styles from './FormInputs.module.css';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import iconCalendar from '../../assets/iconCalendar.png';
import iconChangePasengers from '../../assets/iconChangePassengers.png';
import iconOrigen from '../../assets/iconOrigen.png';
import iconDestino from '../../assets/iconDestino.png';

import { EUROPEAN_CITIES } from './europeanCities';

/** Valores del buscador. origin y destination son códigos de EUROPEAN_CITIES (MAD, PAR...). */
export interface SearchValues {
  origin: string;
  destination: string;
  passengers: string;
  departureDate: Date | null;
  returnDate: Date | null;
}

interface FormInputsProps {
  tripType: 'ida-vuelta' | 'solo-ida';
  values: SearchValues;
  onChange: (cambios: Partial<SearchValues>) => void;
}

export default function FormInputs({ tripType, values, onChange }: FormInputsProps) {
  const today = new Date();
  const { origin, destination, passengers, departureDate, returnDate } = values;

  const isSoloIda = tripType === 'solo-ida';

  const availableDestinations = EUROPEAN_CITIES.filter(city => city.code !== origin);
  const availableOrigins = EUROPEAN_CITIES.filter(city => city.code !== destination);

  const getCityLabel = (code: string) => {
    const city = EUROPEAN_CITIES.find(c => c.code === code);
    return city ? `${city.name} (${city.code}) - ${city.country}` : 'Selecciona ciudad';
  };

  return (
    <div className={styles.gridContainer}>
      <div className={styles.inputGroup}>
        <span className={styles.label}>Origen</span>
        <div className={styles.inputWrapper}>
          <img src={iconOrigen} className={styles.inputIcon} alt="" />
          <span className={styles.selectedText}>
            {origin ? getCityLabel(origin) : 'Selecciona ciudad origen'}
          </span>
          <select
            value={origin}
            onChange={(e) => onChange({ origin: e.target.value })}
            className={styles.selectOverlay}
          >
            <option value="" disabled>Selecciona ciudad origen</option>
            {availableOrigins.map((city) => (
              <option key={`origin-${city.code}`} value={city.code}>
                {city.name} ({city.code}) - {city.country}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* El destino se pide siempre; en "Solo ida" lo que se oculta es la fecha de regreso. */}
      <div className={styles.inputGroup}>
        <span className={styles.label}>Destino</span>
        <div className={styles.inputWrapper}>
          <img src={iconDestino} className={styles.inputIcon} alt="" />
          <span className={styles.selectedText}>
            {destination ? getCityLabel(destination) : 'Selecciona ciudad destino'}
          </span>
          <select
            value={destination}
            onChange={(e) => onChange({ destination: e.target.value })}
            className={styles.selectOverlay}
          >
            <option value="" disabled>Selecciona ciudad destino</option>
            {availableDestinations.map((city) => (
              <option key={`dest-${city.code}`} value={city.code}>
                {city.name} ({city.code}) - {city.country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Salida</span>
        <div className={styles.inputWrapper}>
          <img src={iconCalendar} className={styles.inputIcon} alt="" />
          <DatePicker
            selected={departureDate}
            onChange={(date: Date | null) => {
              if (returnDate && date && returnDate < date) {
                onChange({ departureDate: date, returnDate: null });
              } else {
                onChange({ departureDate: date });
              }
            }}
            minDate={today}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar fecha"
            popperPlacement="bottom"
            className={styles.dateInputWrapper}
            calendarStartDay={1}
          />
        </div>
      </div>

      <div className={`${styles.inputGroup} ${isSoloIda ? styles.hiddenKeepSpace : ''}`}>
        <span className={styles.label}>Regreso</span>
        <div className={styles.inputWrapper}>
          <img src={iconCalendar} className={styles.inputIcon} alt="" />
          <DatePicker
            selected={returnDate}
            onChange={(date: Date | null) => onChange({ returnDate: date })}
            minDate={departureDate || today}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar fecha"
            popperPlacement="bottom"
            className={styles.dateInputWrapper}
            calendarStartDay={1}
            disabled={isSoloIda}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Pasajeros</span>
        <div className={styles.inputWrapper}>
          <img src={iconChangePasengers} className={styles.inputIcon} alt="" />
          <span className={styles.selectedText}>
            {passengers} {Number(passengers) === 1 ? 'Pasajero' : 'Pasajeros'}
          </span>
          <select
            value={passengers}
            onChange={(e) => onChange({ passengers: e.target.value })}
            className={styles.selectOverlay}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>
    </div>
  );
}
