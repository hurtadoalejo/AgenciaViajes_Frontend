import type { TransportMode } from '../../types';
import styles from './ModeSelector.module.css';
import iconBus from '../../assets/iconBus.png';
import iconTrain from '../../assets/iconTrain.png';
import iconPlane from '../../assets/iconPlane.png';

interface ModeSelectorProps {
  currentMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  const modes: { id: TransportMode; label: string; icon: string }[] = [
    { id: 'avion', label: 'Avión', icon: iconPlane },
    { id: 'tren', label: 'Tren', icon: iconTrain },
    { id: 'bus', label: 'Bus', icon: iconBus },
  ];

  const activeStyles: Record<TransportMode, string> = {
    avion: styles.activeAvion,
    tren: styles.activeTren,
    bus: styles.activeBus,
  };

  return (
    <div className={styles.container}>
      {modes.map((item) => (
        <button
          key={item.id}
          onClick={() => onModeChange(item.id)}
          className={`${styles.btn} ${currentMode === item.id ? activeStyles[item.id] : ''}`}
        >
          <img src={item.icon} className={styles.inputIcon} alt="" /> 
          {item.label}
        </button>
      ))}
    </div>
  );
}