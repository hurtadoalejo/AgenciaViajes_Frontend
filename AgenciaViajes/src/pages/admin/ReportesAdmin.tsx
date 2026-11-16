import { useState } from 'react';
import styles from './AdminCrud.module.css';
import ReportesSimples from './reportes/ReportesSimples';

type NivelComplejidad = 'SIMPLES' | 'INTERMEDIOS' | 'AVANZADOS';

export default function ReportesAdmin() {
  const [nivel, setNivel] = useState<NivelComplejidad>('SIMPLES');

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Centro de Reportes — Viaja por Europa</h1>
          <p className={styles.subtitle}>
            Generación de informes ejecutivos para la toma de decisiones y exportación oficial a PDF
          </p>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={() => setNivel('SIMPLES')}
            className={nivel === 'SIMPLES' ? styles.primaryButton : styles.secondaryButton}
          >
            1. Reportes Simples (3)
          </button>
          <button
            type="button"
            onClick={() => setNivel('INTERMEDIOS')}
            className={nivel === 'INTERMEDIOS' ? styles.primaryButton : styles.secondaryButton}
          >
            2. Reportes Intermedios (4)
          </button>
          <button
            type="button"
            onClick={() => setNivel('AVANZADOS')}
            className={nivel === 'AVANZADOS' ? styles.primaryButton : styles.secondaryButton}
          >
            3. Reportes Avanzados (3)
          </button>
        </div>
      </div>

      {nivel === 'SIMPLES' && <ReportesSimples />}

      {nivel === 'INTERMEDIOS' && (
        <div className={styles.tableCard}>
          <div className={styles.emptyState}>
            Módulo reservado para los 4 Reportes Intermedios (consultas multitabla con JOIN, GROUP BY y HAVING).
          </div>
        </div>
      )}

      {nivel === 'AVANZADOS' && (
        <div className={styles.tableCard}>
          <div className={styles.emptyState}>
            Módulo reservado para los 3 Reportes Avanzados (consultas con subconsultas SQL).
          </div>
        </div>
      )}
    </div>
  );
}