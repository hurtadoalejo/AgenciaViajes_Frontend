import styles from './FormInputs.module.css';
import iconCalendar from '../../assets/iconCalendar.png';
import iconChangePasengers from '../../assets/iconChangePassengers.png';
import iconOrigen from '../../assets/iconOrigen.png';
import iconDestino from '../../assets/iconDestino.png';

export default function FormInputs() {
  return (
    <div className={styles.gridContainer}>
      <div className={styles.inputGroup}>
        <span className={styles.label}>Origen</span>
        <div className={styles.inputWrapper}>
          <img src={iconOrigen} className={styles.inputIcon}/> 
          <input type="text" defaultValue="Miami (MIA)" placeholder="¿De dónde sales?" />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Destino</span>
        <div className={styles.inputWrapper}>
          <img src={iconDestino} className={styles.inputIcon}/> 
          <input type="text" placeholder="¿A dónde vas?" />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Salida</span>
        <div className={styles.inputWrapper}>
          <img src={iconCalendar} className={styles.inputIcon}/> 
          <input type="date" />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Regreso</span>
        <div className={styles.inputWrapper}>
          <img src={iconCalendar} className={styles.inputIcon}/> 
          <input type="date" />
        </div>
      </div>

      <div className={styles.inputGroup}>
        <span className={styles.label}>Pasajeros</span>
        <div className={styles.inputWrapper}>
          <img src={iconChangePasengers} className={styles.inputIcon}/> 
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
