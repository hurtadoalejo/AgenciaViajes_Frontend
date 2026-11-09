import styles from './TripType.module.css';

interface TripTypeProps {
  currentType: 'ida-vuelta' | 'solo-ida';
  onTypeChange: (type: 'ida-vuelta' | 'solo-ida') => void;
}

export default function TripType({ currentType, onTypeChange }: TripTypeProps) {
  return (
    <div className={styles.container}>
      <div className={`${styles.slider} ${currentType === 'solo-ida' ? styles.slideRight : ''}`} />

      <button 
        className={`${styles.toggleBtn} ${currentType === 'ida-vuelta' ? styles.activeText : ''}`}
        onClick={() => onTypeChange('ida-vuelta')}
      >
        Ida y vuelta
      </button>
      <button 
        className={`${styles.toggleBtn} ${currentType === 'solo-ida' ? styles.activeText : ''}`}
        onClick={() => onTypeChange('solo-ida')}
      >
        Solo ida
      </button>
    </div>
  );
}