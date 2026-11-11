import { useState } from 'react';
import styles from './FormInputs.module.css';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import iconCalendar from '../../assets/iconCalendar.png';
import iconChangePasengers from '../../assets/iconChangePassengers.png';
import iconOrigen from '../../assets/iconOrigen.png';
import iconDestino from '../../assets/iconDestino.png';

import { EUROPEAN_CITIES } from './europeanCities';

interface FormInputsProps {
  tripType: 'ida-vuelta' | 'solo-ida';
}

export default function FormInputs({ tripType }: FormInputsProps) {
  const today = new Date();

  const [origin, setOrigin] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);

  const isSoloIda = tripType === 'solo-ida';

  const availableDestinations = EUROPEAN_CITIES.filter(city => city.code !== origin);
  const availableOrigins = EUROPEAN_CITIES.filter(city => city.code !== destination);

  return (
    <div className={styles.gridContainer}>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Origen</span>
        <div className={styles.inputWrapper}>
          <img src={iconOrigen} className={styles.inputIcon} alt="" />
          <select 
            value={origin} 
            onChange={(e) => setOrigin(e.target.value)}
            className={styles.selectInput}
          >
            <option value="" disabled>
              Selecciona ciudad origen
            </option>
            {availableOrigins.map((city) => (
              <option key={`origin-${city.code}`} value={city.code}>
                {city.name} ({city.code}) - {city.country}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`${styles.inputGroup} ${isSoloIda ? styles.hiddenKeepSpace : ''}`}>
        <span className={styles.label}>Destino</span>
        <div className={styles.inputWrapper}>
          <img src={iconDestino} className={styles.inputIcon} alt="" />
          <select 
            value={destination} 
            onChange={(e) => setDestination(e.target.value)}
            disabled={isSoloIda}
            className={styles.selectInput}
          >
            <option value="" disabled>
              Selecciona ciudad destino
            </option>
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
              setDepartureDate(date);
              if (returnDate && date && returnDate < date) {
                setReturnDate(null);
              }
            }}
            minDate={today}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar fecha"
            popperPlacement="bottom"
            className={styles.dateInput}
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
            onChange={(date: Date | null) => setReturnDate(date)}
            minDate={departureDate || today}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar fecha"
            popperPlacement="bottom"
            className={styles.dateInput}
            calendarStartDay={1}
            disabled={isSoloIda}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Pasajeros</span>
        <div className={styles.inputWrapper}>
          <img src={iconChangePasengers} className={styles.inputIcon} alt="" />
          <select defaultValue="1" className={styles.selectInput}>
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