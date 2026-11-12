import { useState } from 'react';
import styles from '../App.module.css'; // Ajusta la ruta si mueves el CSS
import Navbar from '../components/Layout/Navbar';
import ModeSelector from '../components/SearchForm/ModeSelector';
import TripType from '../components/SearchForm/TripType';
import FormInputs from '../components/SearchForm/FormInputs';
import SearchButton from '../components/SearchForm/SearchButton';
import type { TransportMode } from '../types';

const backgroundClasses: Record<TransportMode, string> = {
  avion: styles.bgAvion,
  tren: styles.bgTren,
  bus: styles.bgBus,
};

export default function Home() {
  const [mode, setMode] = useState<TransportMode>('avion');
  const [tripType, setTripType] = useState<'ida-vuelta' | 'solo-ida'>('ida-vuelta');

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
                <FormInputs tripType={tripType} />
              </div>
              <SearchButton />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}