import { useState, useEffect, useMemo, type FormEvent } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { es } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import styles from './AdminCrud.module.css';
import type {
  ProgramacionItem,
  ProgramacionPayload,
  ProgramacionRecurrentePayload,
  ProgramacionRecurrenteResult,
  RutaItem,
} from '../../types';

registerLocale('es', es);

const API_BASE = 'http://localhost:8080/api';
const ITEMS_POR_PAGINA = 20;
/**
 * Los calendarios se dibujan en un contenedor aparte (pegado al <body>) para que el modal
 * no los recorte ni los aplaste: así la columna de horas queda al lado del mes.
 */
const PORTAL_CALENDARIO = 'calendario-portal';

function sumarDias(fechaBase: Date, dias: number): Date {
  const copia = new Date(fechaBase.getFullYear(), fechaBase.getMonth(), fechaBase.getDate());
  copia.setDate(copia.getDate() + dias);
  return copia;
}

function formatearFechaAPI(fecha: Date): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function formatearDateTimeAPI(fecha: Date): string {
  const fechaStr = formatearFechaAPI(fecha);
  const horas = String(fecha.getHours()).padStart(2, '0');
  const mins = String(fecha.getMinutes()).padStart(2, '0');
  return `${fechaStr}T${horas}:${mins}:00`;
}

function calcularDiasDiferencia(desde: Date, hasta: Date): number {
  const utc1 = Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const utc2 = Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

function formatearFechaHoraTabla(isoString: string): { fecha: string; hora: string } {
  if (!isoString) return { fecha: '—', hora: '' };
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return { fecha: isoString, hora: '' };
  }
  const fecha = date.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
  const hora = date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { fecha, hora };
}

interface SalidaFormState {
  idRuta: string;
  fechaHoraSalida: Date | null;
}

interface RecurrenteFormState {
  idRuta: string;
  fechaHoraInicio: Date | null;
  fechaHoraFin: Date | null;
  cadaHoras: string;
}

const INITIAL_SALIDA_FORM: SalidaFormState = {
  idRuta: '',
  fechaHoraSalida: null,
};

const INITIAL_RECURRENTE_FORM: RecurrenteFormState = {
  idRuta: '',
  fechaHoraInicio: null,
  fechaHoraFin: null,
  cadaHoras: '24',
};

export default function ProgramacionAdmin() {
  const [programaciones, setProgramaciones] = useState<ProgramacionItem[]>([]);
  const [rutas, setRutas] = useState<RutaItem[]>([]);
  const [rutasCargadas, setRutasCargadas] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recargaTrigger, setRecargaTrigger] = useState(0);

  // Filtros obligatorios por par de ciudades + transporte + rango de fechas
  const [filtroCiudadOrigen, setFiltroCiudadOrigen] = useState<string>('');
  const [filtroCiudadDestino, setFiltroCiudadDestino] = useState<string>('');
  const [filtroTransporte, setFiltroTransporte] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<Date>(() => sumarDias(new Date(), 0));
  const [fechaHasta, setFechaHasta] = useState<Date>(() => sumarDias(new Date(), 29));
  const [paginaActual, setPaginaActual] = useState<number>(1);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal salida única (crear / editar)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formSalida, setFormSalida] = useState<SalidaFormState>(INITIAL_SALIDA_FORM);

  // Modal programación recurrente
  const [isRecurrenteOpen, setIsRecurrenteOpen] = useState(false);
  const [formRecurrente, setFormRecurrente] = useState<RecurrenteFormState>(
    INITIAL_RECURRENTE_FORM
  );

  // 1. Cargar catálogo de rutas y preseleccionar el primer par Origen -> Destino
  useEffect(() => {
    let activo = true;

    const cargarRutas = async () => {
      try {
        const res = await fetch(`${API_BASE}/rutas`);
        if (!res.ok) throw new Error('No se pudo cargar el catálogo de rutas.');
        const data: RutaItem[] = await res.json();

        if (!activo) return;

        setRutas(data);

        const origenes = Array.from(new Set(data.map((r) => r.ciudadOrigen))).sort((a, b) =>
          a.localeCompare(b, 'es')
        );

        if (origenes.length > 0) {
          const primerOrigen = origenes[0];
          const destinos = Array.from(
            new Set(
              data
                .filter((r) => r.ciudadOrigen === primerOrigen)
                .map((r) => r.ciudadDestino)
            )
          ).sort((a, b) => a.localeCompare(b, 'es'));

          setFiltroCiudadOrigen(primerOrigen);
          setFiltroCiudadDestino(destinos[0] ?? '');
        } else {
          setLoading(false);
        }
      } catch (err) {
        if (activo) {
          setLoading(false);
          setFeedback({
            type: 'error',
            text: err instanceof Error ? err.message : 'Error al cargar rutas.',
          });
        }
      } finally {
        if (activo) {
          setRutasCargadas(true);
        }
      }
    };

    cargarRutas();

    return () => {
      activo = false;
    };
  }, []);

  const ciudadesOrigenDisponibles = useMemo(
    () =>
      Array.from(new Set(rutas.map((r) => r.ciudadOrigen))).sort((a, b) =>
        a.localeCompare(b, 'es')
      ),
    [rutas]
  );

  const ciudadesDestinoDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          rutas
            .filter((r) => r.ciudadOrigen === filtroCiudadOrigen)
            .map((r) => r.ciudadDestino)
        )
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [rutas, filtroCiudadOrigen]
  );

  const rutasDelTrayecto = useMemo(
    () =>
      rutas.filter((r) => {
        if (r.ciudadOrigen !== filtroCiudadOrigen) return false;
        if (r.ciudadDestino !== filtroCiudadDestino) return false;
        if (filtroTransporte && r.tipoTransporte !== filtroTransporte) return false;
        return true;
      }),
    [rutas, filtroCiudadOrigen, filtroCiudadDestino, filtroTransporte]
  );

  const tiposTransporteDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          rutas
            .filter(
              (r) =>
                r.ciudadOrigen === filtroCiudadOrigen &&
                r.ciudadDestino === filtroCiudadDestino
            )
            .map((r) => r.tipoTransporte)
            .filter((t): t is string => Boolean(t))
        )
      ).sort(),
    [rutas, filtroCiudadOrigen, filtroCiudadDestino]
  );

  // 2. Consultar programaciones únicamente para las rutas entre Origen y Destino
  useEffect(() => {
    if (!rutasCargadas) return;

    let activo = true;

    const cargarProgramaciones = async () => {
      if (!filtroCiudadOrigen || !filtroCiudadDestino) {
        setProgramaciones([]);
        setLoading(false);
        return;
      }

      const dias = calcularDiasDiferencia(fechaDesde, fechaHasta);
      if (dias < 0) {
        setProgramaciones([]);
        setLoading(false);
        setFeedback({
          type: 'error',
          text: 'La fecha límite no puede ser anterior a la fecha inicial.',
        });
        return;
      }

      if (dias > 29) {
        setProgramaciones([]);
        setLoading(false);
        setFeedback({
          type: 'error',
          text: 'Consulta máximo 30 días a la vez.',
        });
        return;
      }

      if (rutasDelTrayecto.length === 0) {
        setProgramaciones([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const desdeStr = formatearFechaAPI(fechaDesde);
        const hastaStr = formatearFechaAPI(fechaHasta);

        const respuestas = await Promise.all(
          rutasDelTrayecto.map(async (ruta) => {
            const params = new URLSearchParams({
              idRuta: String(ruta.idRuta),
              desde: desdeStr,
              hasta: hastaStr,
            });

            const res = await fetch(`${API_BASE}/programaciones?${params.toString()}`);
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              const mensaje =
                body?.mensaje ||
                body?.message ||
                body?.detail ||
                'No se pudieron cargar las programaciones de viaje.';
              throw new Error(mensaje);
            }
            const items: ProgramacionItem[] = await res.json();
            return items;
          })
        );

        if (activo) {
          const consolidadas = respuestas
            .flat()
            .sort((a, b) => a.fechaHoraSalida.localeCompare(b.fechaHoraSalida));
          setProgramaciones(consolidadas);
          setPaginaActual(1);
          // Solo se limpian errores de carga anteriores: el resultado de crear/generar salidas
          // debe seguir visible después de recargar la tabla.
          setFeedback((prev) => (prev?.type === 'error' ? null : prev));
        }
      } catch (err) {
        if (activo) {
          setFeedback({
            type: 'error',
            text: err instanceof Error ? err.message : 'Error de conexión con el servidor.',
          });
        }
      } finally {
        if (activo) {
          setLoading(false);
        }
      }
    };

    cargarProgramaciones();

    return () => {
      activo = false;
    };
  }, [
    rutasCargadas,
    filtroCiudadOrigen,
    filtroCiudadDestino,
    rutasDelTrayecto,
    fechaDesde,
    fechaHasta,
    recargaTrigger,
  ]);

  useEffect(() => {
    if (!feedback) return;
    // Los avisos (salidas que no se pudieron crear) se quedan más tiempo para alcanzar a leerlos.
    const timer = setTimeout(() => setFeedback(null), feedback.type === 'success' ? 4500 : 10000);
    return () => clearTimeout(timer);
  }, [feedback]);

  const handleCambioCiudadOrigen = (nuevoOrigen: string) => {
    setFiltroCiudadOrigen(nuevoOrigen);
    setFiltroTransporte('');
    const destinos = Array.from(
      new Set(
        rutas.filter((r) => r.ciudadOrigen === nuevoOrigen).map((r) => r.ciudadDestino)
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));
    setFiltroCiudadDestino(destinos[0] ?? '');
  };

  const handleCambioCiudadDestino = (nuevoDestino: string) => {
    setFiltroCiudadDestino(nuevoDestino);
    setFiltroTransporte('');
  };

  const handleCambioFechaDesde = (nuevaFecha: Date | null) => {
    if (!nuevaFecha) return;
    setFechaDesde(nuevaFecha);

    const dias = calcularDiasDiferencia(nuevaFecha, fechaHasta);
    if (dias < 0 || dias > 29) {
      setFechaHasta(sumarDias(nuevaFecha, 29));
    }
  };

  const handleCambioFechaHasta = (nuevaFecha: Date | null) => {
    if (!nuevaFecha) return;
    if (calcularDiasDiferencia(fechaDesde, nuevaFecha) < 0) {
      setFechaHasta(fechaDesde);
      return;
    }
    setFechaHasta(nuevaFecha);
  };

  const avanzar30Dias = () => {
    const nuevoInicio = sumarDias(fechaHasta, 1);
    const nuevoFin = sumarDias(nuevoInicio, 29);
    setFechaDesde(nuevoInicio);
    setFechaHasta(nuevoFin);
  };

  const abrirModalCrear = () => {
    setEditingId(null);
    setModalError(null);
    const rutaPorDefecto =
      rutasDelTrayecto.length > 0 ? String(rutasDelTrayecto[0].idRuta) : '';

    setFormSalida({
      idRuta: rutaPorDefecto,
      fechaHoraSalida: null,
    });
    setIsModalOpen(true);
  };

  const abrirModalEditar = (item: ProgramacionItem) => {
    setEditingId(item.idProgramacionViaje);
    setModalError(null);
    setFormSalida({
      idRuta: String(item.idRuta),
      fechaHoraSalida: item.fechaHoraSalida ? new Date(item.fechaHoraSalida) : null,
    });
    setIsModalOpen(true);
  };

  const abrirModalRecurrente = () => {
    setModalError(null);
    const rutaPorDefecto =
      rutasDelTrayecto.length > 0 ? String(rutasDelTrayecto[0].idRuta) : '';

    setFormRecurrente({
      idRuta: rutaPorDefecto,
      fechaHoraInicio: null,
      fechaHoraFin: null,
      cadaHoras: '24',
    });
    setIsRecurrenteOpen(true);
  };

  const extraerErrorBackend = async (res: Response): Promise<string> => {
    try {
      const errorBody = await res.json();
      if (typeof errorBody?.mensaje === 'string') return errorBody.mensaje;
      if (typeof errorBody?.message === 'string') return errorBody.message;
      if (typeof errorBody?.detail === 'string') return errorBody.detail;
      if (errorBody?.errors && typeof errorBody.errors === 'object') {
        const firstError = Object.values(errorBody.errors)[0];
        if (typeof firstError === 'string') return firstError;
      }
    } catch {
      const textError = await res.text();
      if (textError) return textError;
    }

    if (res.status === 409) {
      return 'No se puede eliminar o modificar la salida porque ya tiene reservas asociadas o presenta cruce de horario.';
    }

    return `Error ${res.status} al procesar la solicitud.`;
  };

  const sincronizarVistaConRuta = (idRuta: number, fechaOperacion: Date) => {
    const rutaSeleccionada = rutas.find((r) => r.idRuta === idRuta);
    if (rutaSeleccionada) {
      setFiltroCiudadOrigen(rutaSeleccionada.ciudadOrigen);
      setFiltroCiudadDestino(rutaSeleccionada.ciudadDestino);
      setFiltroTransporte('');
    }
    const soloDia = sumarDias(fechaOperacion, 0);
    if (
      calcularDiasDiferencia(fechaDesde, soloDia) < 0 ||
      calcularDiasDiferencia(soloDia, fechaHasta) < 0
    ) {
      setFechaDesde(soloDia);
      setFechaHasta(sumarDias(soloDia, 29));
    }
    setRecargaTrigger((n) => n + 1);
  };

  const handleSubmitSalida = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    const idRuta = Number(formSalida.idRuta);
    if (!idRuta) {
      setModalError('Debes seleccionar una ruta.');
      return;
    }

    if (!formSalida.fechaHoraSalida) {
      setModalError('Debes seleccionar la fecha y hora de salida.');
      return;
    }

    setSubmitting(true);

    const payload: ProgramacionPayload = {
      idRuta,
      fechaHoraSalida: formatearDateTimeAPI(formSalida.fechaHoraSalida),
    };

    try {
      const isEditing = editingId !== null;
      const url = isEditing
        ? `${API_BASE}/programaciones/${editingId}`
        : `${API_BASE}/programaciones`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setModalError(msg);
        return;
      }

      setIsModalOpen(false);
      sincronizarVistaConRuta(idRuta, formSalida.fechaHoraSalida);
      setFeedback({
        type: 'success',
        text: isEditing
          ? 'Programación de salida actualizada correctamente.'
          : 'Salida programada correctamente.',
      });
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRecurrente = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setModalError(null);
    setFeedback(null);

    const idRuta = Number(formRecurrente.idRuta);
    const cadaHoras = Number(formRecurrente.cadaHoras);

    if (!idRuta) {
      setModalError('Debes seleccionar una ruta.');
      return;
    }

    if (!formRecurrente.fechaHoraInicio || !formRecurrente.fechaHoraFin) {
      setModalError('Debes completar la fecha/hora inicial y la fecha/hora límite.');
      return;
    }

    if (formRecurrente.fechaHoraFin.getTime() < formRecurrente.fechaHoraInicio.getTime()) {
      setModalError('La fecha límite no puede ser anterior a la primera salida.');
      return;
    }

    if (!Number.isInteger(cadaHoras) || cadaHoras < 1 || cadaHoras > 720) {
      setModalError('La frecuencia debe estar entre 1 y 720 horas.');
      return;
    }

    setSubmitting(true);

    const payload: ProgramacionRecurrentePayload = {
      idRuta,
      fechaHoraInicio: formatearDateTimeAPI(formRecurrente.fechaHoraInicio),
      fechaHoraFin: formatearDateTimeAPI(formRecurrente.fechaHoraFin),
      cadaHoras,
    };

    try {
      const res = await fetch(`${API_BASE}/programaciones/recurrente`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setModalError(msg);
        return;
      }

      const resultado: ProgramacionRecurrenteResult = await res.json();
      const conflictos = resultado.conflictos ?? 0;
      const ruta = rutas.find((r) => r.idRuta === idRuta);
      const vehiculo = ruta?.codigoVehiculo ? `El vehículo ${ruta.codigoVehiculo}` : 'El vehículo de la ruta';
      const motivoConflicto = `${vehiculo} ya tiene otros viajes en esas fechas y necesita al menos 12 horas de descanso entre la llegada de un viaje y la siguiente salida.`;

      // No se creó nada: el modal queda abierto con la explicación para que el admin cambie fechas u hora.
      if (resultado.creadas === 0) {
        const partes: string[] = [];
        if (conflictos > 0) {
          partes.push(
            `${conflictos} ${conflictos === 1 ? 'salida chocaba' : 'salidas chocaban'} con el descanso del vehículo. ${motivoConflicto}`
          );
        }
        if (resultado.omitidas > 0) {
          partes.push(
            `${resultado.omitidas} ${resultado.omitidas === 1 ? 'salida ya existía' : 'salidas ya existían'} en esa ruta y ${resultado.omitidas === 1 ? 'se omitió' : 'se omitieron'}.`
          );
        }
        setModalError(
          `No se pudo programar ninguna salida. ${partes.join(' ')} Prueba con otra hora, otro rango de fechas o una frecuencia mayor.`
        );
        return;
      }

      setIsRecurrenteOpen(false);
      sincronizarVistaConRuta(idRuta, formRecurrente.fechaHoraInicio);

      let texto = `Programación generada: ${resultado.creadas} ${resultado.creadas === 1 ? 'salida creada' : 'salidas creadas'}.`;
      if (resultado.omitidas > 0) {
        texto += ` ${resultado.omitidas} ${resultado.omitidas === 1 ? 'se omitió porque ya existía' : 'se omitieron porque ya existían'}.`;
      }
      if (conflictos > 0) {
        texto += ` ${conflictos} no ${conflictos === 1 ? 'se pudo crear' : 'se pudieron crear'}. ${motivoConflicto}`;
      }
      setFeedback({ type: conflictos > 0 ? 'warning' : 'success', text: texto });
    } catch {
      setModalError('No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminar = async (item: ProgramacionItem) => {
    const salidaFmt = formatearFechaHoraTabla(item.fechaHoraSalida);
    const confirmado = window.confirm(
      `¿Seguro que deseas cancelar y eliminar la salida #${item.idProgramacionViaje} (${item.ciudadOrigen} → ${item.ciudadDestino} del ${salidaFmt.fecha} ${salidaFmt.hora})?`
    );
    if (!confirmado) return;

    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/programaciones/${item.idProgramacionViaje}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const msg = await extraerErrorBackend(res);
        setFeedback({ type: 'error', text: msg });
        return;
      }

      setFeedback({ type: 'success', text: 'Salida eliminada correctamente.' });
      setProgramaciones((prev) =>
        prev.filter((p) => p.idProgramacionViaje !== item.idProgramacionViaje)
      );
    } catch {
      setFeedback({ type: 'error', text: 'Error de conexión al intentar eliminar.' });
    }
  };

  const totalPaginas = Math.max(1, Math.ceil(programaciones.length / ITEMS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const indiceInicio = (paginaSegura - 1) * ITEMS_POR_PAGINA;
  const programacionesPaginadas = programaciones.slice(
    indiceInicio,
    indiceInicio + ITEMS_POR_PAGINA
  );

  const restablecerFiltros = () => {
    const primerOrigen = ciudadesOrigenDisponibles[0] ?? '';
    const destinos = Array.from(
      new Set(
        rutas.filter((r) => r.ciudadOrigen === primerOrigen).map((r) => r.ciudadDestino)
      )
    ).sort((a, b) => a.localeCompare(b, 'es'));

    setFiltroCiudadOrigen(primerOrigen);
    setFiltroCiudadDestino(destinos[0] ?? '');
    setFiltroTransporte('');
    setFechaDesde(sumarDias(new Date(), 0));
    setFechaHasta(sumarDias(new Date(), 29));
    setPaginaActual(1);
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.headerCard}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.title}>Programación de Viajes</h1>
          <p className={styles.subtitle}>
            Consulta y agenda salidas seleccionando el trayecto entre ciudades europeas
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
          <button
            type="button"
            onClick={abrirModalRecurrente}
            className={styles.secondaryButton}
          >
            + Programación Recurrente
          </button>
          <button type="button" onClick={abrirModalCrear} className={styles.primaryButton}>
            + Nueva Salida
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filterCard}>
        <div
          className={styles.filterGrid}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}
        >
          <div className={styles.inputGroup}>
            <label htmlFor="filtroCiudadOrigen">Ciudad de origen *</label>
            <select
              id="filtroCiudadOrigen"
              value={filtroCiudadOrigen}
              onChange={(e) => handleCambioCiudadOrigen(e.target.value)}
            >
              {ciudadesOrigenDisponibles.length === 0 && (
                <option value="">Sin ciudades disponibles</option>
              )}
              {ciudadesOrigenDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  {ciudad}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroCiudadDestino">Ciudad de destino *</label>
            <select
              id="filtroCiudadDestino"
              value={filtroCiudadDestino}
              onChange={(e) => handleCambioCiudadDestino(e.target.value)}
              disabled={!filtroCiudadOrigen || ciudadesDestinoDisponibles.length === 0}
            >
              {ciudadesDestinoDisponibles.length === 0 && (
                <option value="">Sin destinos disponibles</option>
              )}
              {ciudadesDestinoDisponibles.map((ciudad) => (
                <option key={ciudad} value={ciudad}>
                  {ciudad}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroTransporte">Tipo de transporte</label>
            <select
              id="filtroTransporte"
              value={filtroTransporte}
              onChange={(e) => setFiltroTransporte(e.target.value)}
            >
              <option value="">Todos los transportes</option>
              {tiposTransporteDisponibles.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroDesde">Desde fecha</label>
            <DatePicker
              id="filtroDesde"
              locale="es"
              selected={fechaDesde}
              onChange={handleCambioFechaDesde}
              dateFormat="yyyy-MM-dd"
              popperPlacement="bottom-start"
                    portalId={PORTAL_CALENDARIO}
              wrapperClassName={styles.datePickerWrapper}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="filtroHasta">Hasta fecha (máx. 30 días)</label>
            <DatePicker
              id="filtroHasta"
              locale="es"
              selected={fechaHasta}
              onChange={handleCambioFechaHasta}
              minDate={fechaDesde}
              maxDate={sumarDias(fechaDesde, 29)}
              dateFormat="yyyy-MM-dd"
              popperPlacement="bottom-start"
                    portalId={PORTAL_CALENDARIO}
              wrapperClassName={styles.datePickerWrapper}
            />
          </div>
        </div>

        <div className={styles.filterFooter}>
          <span className={styles.resultsCount}>
            {programaciones.length === 0
              ? `0 salidas entre ${filtroCiudadOrigen} y ${filtroCiudadDestino}`
              : `Mostrando ${indiceInicio + 1}–${Math.min(
                  indiceInicio + ITEMS_POR_PAGINA,
                  programaciones.length
                )} de ${programaciones.length} salida(s) (${filtroCiudadOrigen} → ${filtroCiudadDestino})`}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {totalPaginas > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className={styles.clearFilterButton}
                >
                  ← Anterior
                </button>
                <span className={styles.secondaryText}>
                  Página {paginaSegura} de {totalPaginas}
                </span>
                <button
                  type="button"
                  onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className={styles.clearFilterButton}
                >
                  Siguiente →
                </button>
              </>
            )}

            <button
              type="button"
              onClick={avanzar30Dias}
              className={styles.clearFilterButton}
            >
              Siguientes 30 días →
            </button>

            <button
              type="button"
              onClick={restablecerFiltros}
              className={styles.clearFilterButton}
            >
              Restablecer filtros
            </button>
          </div>
        </div>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'success' ? 'status' : 'alert'}
          className={
            feedback.type === 'error'
              ? styles.alertError
              : feedback.type === 'warning'
                ? styles.alertWarning
                : styles.alertSuccess
          }
        >
          {feedback.text}
        </div>
      )}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.emptyState}>
            Cargando salidas de {filtroCiudadOrigen} → {filtroCiudadDestino}...
          </div>
        ) : programacionesPaginadas.length === 0 ? (
          <div className={styles.emptyState}>
            No hay salidas programadas entre {filtroCiudadOrigen} y {filtroCiudadDestino} en el
            rango de fechas seleccionado. Prueba con &quot;Siguientes 30 días →&quot;.
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID Salida</th>
                  <th>Ruta (Origen → Destino)</th>
                  <th>Fecha y Hora de Salida</th>
                  <th>Llegada Estimada</th>
                  <th>Vehículo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {programacionesPaginadas.map((item) => {
                  const salidaFmt = formatearFechaHoraTabla(item.fechaHoraSalida);
                  const llegadaFmt = formatearFechaHoraTabla(item.fechaHoraLlegada);

                  return (
                    <tr key={item.idProgramacionViaje}>
                      <td>
                        <span className={styles.secondaryText}>
                          #{item.idProgramacionViaje}
                        </span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>
                          {item.ciudadOrigen} → {item.ciudadDestino}
                        </span>
                        <span className={styles.secondaryText}>Ruta #{item.idRuta}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{salidaFmt.fecha}</span>
                        <span className={styles.badgeAdmin}>{salidaFmt.hora}</span>
                      </td>
                      <td>
                        <span className={styles.primaryText}>{llegadaFmt.fecha}</span>
                        <span className={styles.secondaryText}>{llegadaFmt.hora}</span>
                      </td>
                      <td>
                        {item.codigoVehiculo ? (
                          <>
                            <span className={styles.primaryText}>{item.codigoVehiculo}</span>
                            <span className={styles.badgeEmpleado}>
                              {item.tipoTransporte}
                            </span>
                          </>
                        ) : (
                          <span className={styles.secondaryText}>Sin vehículo</span>
                        )}
                      </td>
                      <td>
                        <div className={styles.rowActions}>
                          <button
                            type="button"
                            onClick={() => abrirModalEditar(item)}
                            className={styles.btnEdit}
                          >
                            Reprogramar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(item)}
                            className={styles.btnDelete}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Salida única (Crear o Editar) */}
      {isModalOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard} style={{ maxWidth: '540px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingId !== null
                  ? `Reprogramar Salida #${editingId}`
                  : 'Programar Nueva Salida'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className={styles.closeButton}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className={styles.alertError} style={{ marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitSalida}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="idRutaSalida">Ruta europea *</label>
                  <select
                    id="idRutaSalida"
                    name="idRuta"
                    value={formSalida.idRuta}
                    onChange={(e) =>
                      setFormSalida((prev) => ({ ...prev, idRuta: e.target.value }))
                    }
                    required
                  >
                    <option value="">Selecciona una ruta</option>
                    {rutas.map((r) => (
                      <option key={r.idRuta} value={r.idRuta}>
                        #{r.idRuta} — {r.ciudadOrigen} → {r.ciudadDestino} (
                        {r.tipoTransporte ?? 'Sin transporte'} · {r.codigoVehiculo ?? 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="fechaHoraSalida">Fecha y hora de salida *</label>
                  <DatePicker
                    id="fechaHoraSalida"
                    locale="es"
                    selected={formSalida.fechaHoraSalida}
                    onChange={(date: Date | null) =>
                      setFormSalida((prev) => ({ ...prev, fechaHoraSalida: date }))
                    }
                    minDate={new Date()}
                    showTimeSelect
                    timeCaption="Hora"
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="yyyy-MM-dd HH:mm"
                    placeholderText="Selecciona fecha y hora futura"
                    popperPlacement="bottom-start"
                    portalId={PORTAL_CALENDARIO}
                    wrapperClassName={styles.datePickerWrapper}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.secondaryButton}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className={styles.primaryButton}>
                  {submitting
                    ? 'Guardando...'
                    : editingId !== null
                    ? 'Guardar cambios'
                    : 'Programar salida'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Programación recurrente */}
      {isRecurrenteOpen && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard} style={{ maxWidth: '600px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Generar Programación Recurrente</h2>
              <button
                type="button"
                onClick={() => setIsRecurrenteOpen(false)}
                className={styles.closeButton}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className={styles.alertError} style={{ marginBottom: '1rem' }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmitRecurrente}>
              <div className={styles.formGrid}>
                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="idRutaRecurrente">Ruta europea *</label>
                  <select
                    id="idRutaRecurrente"
                    name="idRuta"
                    value={formRecurrente.idRuta}
                    onChange={(e) =>
                      setFormRecurrente((prev) => ({ ...prev, idRuta: e.target.value }))
                    }
                    required
                  >
                    <option value="">Selecciona una ruta</option>
                    {rutas.map((r) => (
                      <option key={r.idRuta} value={r.idRuta}>
                        #{r.idRuta} — {r.ciudadOrigen} → {r.ciudadDestino} (
                        {r.tipoTransporte ?? 'Sin transporte'} · {r.codigoVehiculo ?? 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaHoraInicio">Primera salida *</label>
                  <DatePicker
                    id="fechaHoraInicio"
                    locale="es"
                    selected={formRecurrente.fechaHoraInicio}
                    onChange={(date: Date | null) =>
                      setFormRecurrente((prev) => ({
                        ...prev,
                        fechaHoraInicio: date,
                        fechaHoraFin:
                          date && prev.fechaHoraFin && prev.fechaHoraFin < date
                            ? date
                            : prev.fechaHoraFin,
                      }))
                    }
                    minDate={new Date()}
                    showTimeSelect
                    timeCaption="Hora"
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="yyyy-MM-dd HH:mm"
                    placeholderText="Inicio"
                    popperPlacement="bottom-start"
                    portalId={PORTAL_CALENDARIO}
                    wrapperClassName={styles.datePickerWrapper}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="fechaHoraFin">Fecha y hora límite *</label>
                  <DatePicker
                    id="fechaHoraFin"
                    locale="es"
                    selected={formRecurrente.fechaHoraFin}
                    onChange={(date: Date | null) =>
                      setFormRecurrente((prev) => ({ ...prev, fechaHoraFin: date }))
                    }
                    minDate={formRecurrente.fechaHoraInicio ?? new Date()}
                    showTimeSelect
                    timeCaption="Hora"
                    timeFormat="HH:mm"
                    timeIntervals={15}
                    dateFormat="yyyy-MM-dd HH:mm"
                    placeholderText="Límite"
                    popperPlacement="bottom-start"
                    portalId={PORTAL_CALENDARIO}
                    wrapperClassName={styles.datePickerWrapper}
                    required
                  />
                </div>

                <div className={styles.inputGroup} style={{ gridColumn: '1 / -1' }}>
                  <label htmlFor="cadaHoras">Frecuencia de repetición *</label>
                  <select
                    id="cadaHoras"
                    name="cadaHoras"
                    value={formRecurrente.cadaHoras}
                    onChange={(e) =>
                      setFormRecurrente((prev) => ({ ...prev, cadaHoras: e.target.value }))
                    }
                    required
                  >
                    <option value="12">Cada 12 horas (2 salidas al día)</option>
                    <option value="24">Cada 24 horas (Salida diaria a la misma hora)</option>
                    <option value="48">Cada 48 horas (Cada 2 días)</option>
                    <option value="72">Cada 72 horas (Cada 3 días)</option>
                    <option value="168">Cada 168 horas (Salida semanal)</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  onClick={() => setIsRecurrenteOpen(false)}
                  className={styles.secondaryButton}
                >
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className={styles.primaryButton}>
                  {submitting ? 'Generando salidas...' : 'Generar programación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}