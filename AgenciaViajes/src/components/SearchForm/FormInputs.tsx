import { useState } from 'react';
import styles from './FormInputs.module.css';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import iconCalendar from '../../assets/iconCalendar.png';
import iconChangePasengers from '../../assets/iconChangePassengers.png';
import iconOrigen from '../../assets/iconOrigen.png';
import iconDestino from '../../assets/iconDestino.png';

export default function FormInputs() {
  const today = new Date();

  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [returnDate, setReturnDate] = useState<Date | null>(null);

  return (
    <div className={styles.gridContainer}>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Origen</span>

        <div className={styles.inputWrapper}>
          <img
            src={iconOrigen}
            className={styles.inputIcon}
            alt=""
          />

          <input
            type="text"
            defaultValue="Miami (MIA)"
            placeholder="¿De dónde sales?"
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Destino</span>

        <div className={styles.inputWrapper}>
          <img
            src={iconDestino}
            className={styles.inputIcon}
            alt=""
          />

          <input
            type="text"
            placeholder="¿A dónde vas?"
          />
        </div>
      </div>

      {/* SALIDA */}
      <div className={styles.inputGroup}>
        <span className={styles.label}>Salida</span>

        <div className={styles.inputWrapper}>
          <img
            src={iconCalendar}
            className={styles.inputIcon}
            alt=""
          />

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

      <div className={styles.inputGroup}>
        <span className={styles.label}>Regreso</span>

        <div className={styles.inputWrapper}>
          <img
            src={iconCalendar}
            className={styles.inputIcon}
            alt=""
          />

          <DatePicker
            selected={returnDate}
            onChange={(date: Date | null) => setReturnDate(date)}
            minDate={departureDate || today}
            dateFormat="dd/MM/yyyy"
            placeholderText="Seleccionar fecha"
            popperPlacement="bottom"
            className={styles.dateInput}
            calendarStartDay={1}
          />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Pasajeros</span>

        <div className={styles.inputWrapper}>
          <img
            src={iconChangePasengers}
            className={styles.inputIcon}
            alt=""
          />

          <select defaultValue="1">
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