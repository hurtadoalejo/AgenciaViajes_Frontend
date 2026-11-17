import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import styles from './Compra.module.css';
import Navbar from '../components/Layout/Navbar';
import iconVolverAtras from '../assets/iconVolverAtras.png';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser, CatalogoItem, ClientePerfil, OfertaItem, PlanItem } from '../types';
import type {
  ClienteBusqueda,
  CompraEnCurso,
  PagoInfo,
  PasajeroForm,
  ReservaCreada,
  ReservaPayload,
} from '../types/compra';
import {
  API_BASE,
  formatearDuracion,
  formatearFecha,
  formatearHora,
  formatearPrecio,
  leerCompra,
  leerError,
  limpiarCompra,
} from '../utils/compra';

type Paso = 'pasajeros' | 'verificar' | 'pago' | 'confirmacion';
type Metodo = 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'PSE' | 'EFECTIVO';

const PASOS: { id: Paso; texto: string }[] = [
  { id: 'pasajeros', texto: 'Pasajeros' },
  { id: 'verificar', texto: 'Verificar' },
  { id: 'pago', texto: 'Pago' },
  { id: 'confirmacion', texto: 'Confirmación' },
];

const NOMBRE_METODO: Record<Metodo, string> = {
  TARJETA_CREDITO: 'Tarjeta de crédito',
  TARJETA_DEBITO: 'Tarjeta débito',
  PSE: 'PSE',
  EFECTIVO: 'Efectivo',
};

const BANCOS_PSE = ['Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco de Occidente', 'Nequi'];

const pasajeroVacio = (): PasajeroForm => ({
  tipoIdentificacion: 'CC',
  numeroIdentificacion: '',
  primerNombre: '',
  segundoNombre: '',
  primerApellido: '',
  segundoApellido: '',
  idPlan: '',
});

const pasajeroDesde = (c: ClienteBusqueda | ClientePerfil, idPlan: number | ''): PasajeroForm => ({
  tipoIdentificacion: c.tipoIdentificacion,
  numeroIdentificacion: c.numeroIdentificacion,
  primerNombre: c.primerNombre,
  segundoNombre: c.segundoNombre ?? '',
  primerApellido: c.primerApellido,
  segundoApellido: c.segundoApellido ?? '',
  idPlan,
});

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Algoritmo de Luhn: valida el número de tarjeta sin enviarlo a ningún lado. */
function tarjetaValida(numero: string): boolean {
  const digitos = numero.replace(/\D/g, '');
  if (digitos.length < 13 || digitos.length > 19) return false;
  let suma = 0;
  for (let i = 0; i < digitos.length; i++) {
    let d = Number(digitos[digitos.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    suma += d;
  }
  return suma % 10 === 0;
}

function vencimientoValido(texto: string): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(texto.trim());
  if (!m) return false;
  const mes = Number(m[1]);
  const anio = 2000 + Number(m[2]);
  if (mes < 1 || mes > 12) return false;
  const hoy = new Date();
  return anio > hoy.getFullYear() || (anio === hoy.getFullYear() && mes >= hoy.getMonth() + 1);
}

export default function Reserva() {
  const { user } = useAuth();
  const compra = leerCompra();
  if (!compra) {
    return <Navigate to="/" replace />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: '/reserva' }} />;
  }
  return <FlujoReserva compra={compra} user={user} />;
}

function FlujoReserva({ compra, user }: { compra: CompraEnCurso; user: AuthUser }) {
  const navigate = useNavigate();
  const esEmpleado = user.tipoUsuario === 'EMPLEADO';
  const { busqueda, viajes } = compra;

  const [paso, setPaso] = useState<Paso>('pasajeros');
  const [error, setError] = useState<string | null>(null);

  // Catálogos
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [ofertas, setOfertas] = useState<OfertaItem[]>([]);
  const [tiposId, setTiposId] = useState<CatalogoItem[]>([]);
  const [metodosBackend, setMetodosBackend] = useState<string[]>([]);

  // Cliente de la reserva y pasajeros
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [textoCliente, setTextoCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<ClienteBusqueda[] | null>(null);
  const [pasajeros, setPasajeros] = useState<PasajeroForm[]>(() =>
    Array.from({ length: busqueda.pasajeros }, pasajeroVacio)
  );
  const [idOferta, setIdOferta] = useState<number | ''>('');

  // Reserva creada y pago
  const [reserva, setReserva] = useState<ReservaCreada | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [metodo, setMetodo] = useState<Metodo>('TARJETA_CREDITO');
  const [tarjeta, setTarjeta] = useState({ numero: '', titular: '', vencimiento: '', cvv: '', cuotas: '1' });
  const [pse, setPse] = useState({ banco: BANCOS_PSE[0], tipoPersona: 'Natural' });
  const [efectivoRecibido, setEfectivoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [pago, setPago] = useState<PagoInfo | null>(null);

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      try {
        const [rPlanes, rOfertas, rTipos, rMetodos] = await Promise.all([
          fetch(`${API_BASE}/planes`),
          fetch(`${API_BASE}/ofertas?vigentes=true`),
          fetch(`${API_BASE}/catalogos/tipos-identificacion`),
          fetch(`${API_BASE}/catalogos/metodos-pago`),
        ]);
        if (!rPlanes.ok || !rOfertas.ok || !rTipos.ok || !rMetodos.ok) {
          throw new Error();
        }
        const dataPlanes: PlanItem[] = await rPlanes.json();
        const dataOfertas: OfertaItem[] = await rOfertas.json();
        const dataTipos: CatalogoItem[] = await rTipos.json();
        const dataMetodos: CatalogoItem[] = await rMetodos.json();
        let perfil: ClientePerfil | null = null;
        if (!esEmpleado) {
          const rPerfil = await fetch(`${API_BASE}/clientes/${user.idUsuario}`);
          if (rPerfil.ok) perfil = await rPerfil.json();
        }
        if (!vigente) return;
        const planBasico = dataPlanes.length > 0 ? dataPlanes[0].idPlan : '';
        setPlanes(dataPlanes);
        setOfertas(dataOfertas);
        setTiposId(dataTipos);
        setMetodosBackend(dataMetodos.map((m) => m.nombre));
        // Por defecto la oferta vigente con mayor descuento.
        const mejor = [...dataOfertas].sort((a, b) => b.porcentajeDescuento - a.porcentajeDescuento)[0];
        setIdOferta(mejor ? mejor.idOferta : '');
        setPasajeros((prev) =>
          prev.map((p, i) => {
            if (i === 0 && perfil) return pasajeroDesde(perfil, planBasico);
            return p.idPlan === '' ? { ...p, idPlan: planBasico } : p;
          })
        );
        if (perfil) {
          setCliente({ ...perfil });
        }
      } catch {
        if (vigente) setError('No se pudieron cargar los planes y ofertas. Verifica que el backend esté encendido.');
      }
    };
    cargar();
    return () => {
      vigente = false;
    };
  }, [esEmpleado, user.idUsuario]);

  const metodosDisponibles = useMemo(
    () =>
      (Object.keys(NOMBRE_METODO) as Metodo[]).filter(
        (m) => metodosBackend.includes(m) && (m !== 'EFECTIVO' || esEmpleado)
      ),
    [metodosBackend, esEmpleado]
  );

  // ---------- Cálculo estimado (el definitivo lo devuelve el backend) ----------
  const tarifaViajes = viajes.reduce((suma, v) => suma + v.viaje.precioBase, 0);
  const planDe = (idPlan: number | '') => planes.find((p) => p.idPlan === idPlan);
  const subtotalEstimado = pasajeros.reduce((suma, p) => suma + tarifaViajes + (planDe(p.idPlan)?.precioExtra ?? 0), 0);
  const ofertaElegida = ofertas.find((o) => o.idOferta === idOferta);
  const descuentoEstimado = ofertaElegida ? Math.round(subtotalEstimado * ofertaElegida.porcentajeDescuento) / 100 : 0;

  // ---------- Paso 1: pasajeros ----------
  const actualizarPasajero = (indice: number, cambios: Partial<PasajeroForm>) => {
    setPasajeros((prev) => prev.map((p, i) => (i === indice ? { ...p, ...cambios } : p)));
  };

  const buscarClientes = async () => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/clientes?q=${encodeURIComponent(textoCliente.trim())}`);
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo buscar el cliente.'));
        return;
      }
      setClientesEncontrados(await res.json());
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const elegirCliente = (c: ClienteBusqueda) => {
    setCliente(c);
    // Por defecto el cliente es el primer pasajero; se puede cambiar abajo.
    actualizarPasajero(0, pasajeroDesde(c, pasajeros[0]?.idPlan ?? ''));
  };

  const validarPasajeros = (): string | null => {
    if (!cliente) {
      return esEmpleado
        ? 'Busca y selecciona el cliente al que le vendes la reserva.'
        : 'No se pudo cargar tu perfil de cliente. Vuelve a iniciar sesión.';
    }
    const vistos = new Set<string>();
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      const n = i + 1;
      if (!p.numeroIdentificacion.trim() || !p.primerNombre.trim() || !p.primerApellido.trim()) {
        return `Completa identificación, primer nombre y primer apellido del pasajero ${n}.`;
      }
      if (p.idPlan === '') return `Elige el plan del pasajero ${n}.`;
      if (vistos.has(p.numeroIdentificacion.trim())) {
        return `La identificación ${p.numeroIdentificacion} está repetida.`;
      }
      vistos.add(p.numeroIdentificacion.trim());
    }
    return null;
  };

  const irAVerificar = (e: FormEvent) => {
    e.preventDefault();
    const problema = validarPasajeros();
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    setPaso('verificar');
  };

  // ---------- Paso 2: verificar y crear la reserva ----------
  const confirmarReserva = async () => {
    if (!cliente) return;
    setEnviando(true);
    setError(null);
    const payload: ReservaPayload = {
      idCliente: cliente.idUsuario,
      idEmpleado: esEmpleado ? user.idUsuario : null,
      idOferta: idOferta === '' ? null : idOferta,
      viajes: viajes.map((v) => ({ idProgramacionViaje: v.viaje.idProgramacionViaje, tipoTrayecto: v.tipoTrayecto })),
      pasajeros: pasajeros.map((p) => ({
        tipoIdentificacion: p.tipoIdentificacion,
        numeroIdentificacion: p.numeroIdentificacion.trim(),
        primerNombre: p.primerNombre.trim(),
        segundoNombre: p.segundoNombre.trim() || null,
        primerApellido: p.primerApellido.trim(),
        segundoApellido: p.segundoApellido.trim() || null,
        numeroAsiento: null, // el backend asigna el primer asiento libre
        idPlan: Number(p.idPlan),
      })),
    };
    try {
      const res = await fetch(`${API_BASE}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo crear la reserva.'));
        return;
      }
      setReserva(await res.json());
      setPaso('pago');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setEnviando(false);
    }
  };

  // ---------- Paso 3: pasarela imaginaria ----------
  const validarPago = (): string | null => {
    if (!reserva) return 'No hay reserva para pagar.';
    if (metodo === 'TARJETA_CREDITO' || metodo === 'TARJETA_DEBITO') {
      if (!tarjetaValida(tarjeta.numero)) return 'El número de tarjeta no es válido (prueba con 4111 1111 1111 1111).';
      if (!tarjeta.titular.trim()) return 'Escribe el nombre del titular como aparece en la tarjeta.';
      if (!vencimientoValido(tarjeta.vencimiento)) return 'La fecha de vencimiento debe tener el formato MM/AA y no estar vencida.';
      if (!/^\d{3,4}$/.test(tarjeta.cvv)) return 'El CVV debe tener 3 o 4 dígitos.';
    }
    if (metodo === 'EFECTIVO') {
      const recibido = Number(efectivoRecibido);
      if (!recibido || recibido < reserva.valorTotal) return 'El efectivo recibido debe cubrir el total.';
    }
    return null;
  };

  const pagar = async (e: FormEvent) => {
    e.preventDefault();
    const problema = validarPago();
    if (problema || !reserva) {
      setError(problema);
      return;
    }
    setError(null);
    setProcesando(true);
    try {
      // Simulación: los datos de la tarjeta o del banco no se envían a ningún lado.
      await esperar(1800);
      const res = await fetch(`${API_BASE}/reservas/${reserva.idReserva}/pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metodoPago: metodo }),
      });
      if (!res.ok) {
        setError(await leerError(res, 'El pago no pudo procesarse.'));
        return;
      }
      setPago(await res.json());
      limpiarCompra();
      setPaso('confirmacion');
    } catch {
      setError('No se pudo conectar con el servidor.');
    } finally {
      setProcesando(false);
    }
  };

  const cancelarReserva = async () => {
    if (!reserva) return;
    if (!window.confirm('¿Cancelar la reserva? Los asientos quedarán libres.')) return;
    try {
      const res = await fetch(`${API_BASE}/reservas/${reserva.idReserva}/cancelar`, { method: 'PUT' });
      if (!res.ok) {
        setError(await leerError(res, 'No se pudo cancelar la reserva.'));
        return;
      }
      limpiarCompra();
      navigate('/', { replace: true });
    } catch {
      setError('No se pudo conectar con el servidor.');
    }
  };

  const indicePaso = PASOS.findIndex((p) => p.id === paso);
  const cambio = reserva ? Number(efectivoRecibido || 0) - reserva.valorTotal : 0;

  return (
    <div className={styles.page}>
      <Navbar currentMode={busqueda.mode} />
      <main className={styles.content}>
        <div className={styles.topRow}>
          <div>
            {paso === 'pasajeros' && (
              <button type="button" className={styles.backButton} onClick={() => navigate('/viajes')}>
                <img src={iconVolverAtras} alt="" className={styles.backIcon} />
                Cambiar viaje
              </button>
            )}
            <h2 className={styles.title}>
              {busqueda.origen} → {busqueda.destino}
            </h2>
            <p className={styles.subtitle}>
              {esEmpleado ? `Venta en sede · ${user.nombreCorto ?? user.correo}` : 'Compra en línea'}
            </p>
          </div>
        </div>

        <ol className={styles.steps}>
          <li className={`${styles.step} ${styles.stepDone}`}><span className={styles.stepNumber}>✓</span>Elegir viaje</li>
          {PASOS.map((p, i) => (
            <li
              key={p.id}
              className={`${styles.step} ${i === indicePaso ? styles.stepActive : ''} ${i < indicePaso ? styles.stepDone : ''}`}
            >
              <span className={styles.stepNumber}>{i < indicePaso ? '✓' : i + 2}</span>
              {p.texto}
            </li>
          ))}
        </ol>

        {error && <div className={styles.alertError}>{error}</div>}

        <ResumenViajes compra={compra} />

        {/* ---------------- Paso 1 ---------------- */}
        {paso === 'pasajeros' && (
          <form onSubmit={irAVerificar}>
            {esEmpleado && (
              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Cliente</h3>
                <p className={styles.cardSubtitle}>
                  Busca al cliente por identificación o apellido. Si no existe, debe registrarse primero.
                </p>
                <div className={styles.inlineSearch}>
                  <input
                    className={styles.input}
                    placeholder="Identificación o apellido"
                    value={textoCliente}
                    onChange={(e) => setTextoCliente(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter busca el cliente en lugar de enviar el formulario de pasajeros
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        buscarClientes();
                      }
                    }}
                  />
                  <button type="button" className={styles.secondaryButton} onClick={buscarClientes}>
                    Buscar cliente
                  </button>
                </div>
                {clientesEncontrados && clientesEncontrados.length === 0 && (
                  <div className={styles.empty} style={{ marginTop: '0.8rem' }}>No se encontraron clientes.</div>
                )}
                {clientesEncontrados && clientesEncontrados.length > 0 && (
                  <div className={styles.clientList}>
                    {clientesEncontrados.slice(0, 8).map((c) => (
                      <div
                        key={c.idUsuario}
                        className={`${styles.clientItem} ${cliente?.idUsuario === c.idUsuario ? styles.clientSelected : ''}`}
                      >
                        <span>
                          <strong>
                            {c.primerNombre} {c.primerApellido} {c.segundoApellido ?? ''}
                          </strong>
                          {' · '}
                          {c.tipoIdentificacion} {c.numeroIdentificacion} · {c.correo}
                        </span>
                        <button type="button" className={styles.secondaryButton} onClick={() => elegirCliente(c)}>
                          {cliente?.idUsuario === c.idUsuario ? 'Seleccionado' : 'Elegir'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {pasajeros.map((p, i) => (
              <section key={i} className={styles.card}>
                <div className={styles.passengerHeader}>
                  <h3 className={styles.cardTitle}>Pasajero {i + 1}</h3>
                  {i === 0 && cliente && (
                    <span className={styles.summaryMuted} style={{ fontSize: '0.8rem' }}>
                      Datos de {esEmpleado ? 'el cliente' : 'tu perfil'}; puedes cambiarlos si viaja otra persona
                    </span>
                  )}
                </div>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor={`tipo-${i}`}>Tipo de identificación</label>
                    <select
                      id={`tipo-${i}`}
                      className={styles.select}
                      value={p.tipoIdentificacion}
                      onChange={(e) => actualizarPasajero(i, { tipoIdentificacion: e.target.value })}
                    >
                      {tiposId.map((t) => (
                        <option key={t.id} value={t.nombre}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`ident-${i}`}>Número de identificación *</label>
                    <input
                      id={`ident-${i}`}
                      className={styles.input}
                      maxLength={20}
                      value={p.numeroIdentificacion}
                      onChange={(e) => actualizarPasajero(i, { numeroIdentificacion: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`plan-${i}`}>Plan *</label>
                    <select
                      id={`plan-${i}`}
                      className={styles.select}
                      value={p.idPlan}
                      onChange={(e) => actualizarPasajero(i, { idPlan: e.target.value === '' ? '' : Number(e.target.value) })}
                    >
                      {planes.map((plan) => (
                        <option key={plan.idPlan} value={plan.idPlan}>
                          {plan.nombrePlan} (+{formatearPrecio(plan.precioExtra)}) · {plan.pesoMaxEquipaje} kg
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`pn-${i}`}>Primer nombre *</label>
                    <input
                      id={`pn-${i}`}
                      className={styles.input}
                      maxLength={20}
                      value={p.primerNombre}
                      onChange={(e) => actualizarPasajero(i, { primerNombre: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`sn-${i}`}>Segundo nombre</label>
                    <input
                      id={`sn-${i}`}
                      className={styles.input}
                      maxLength={20}
                      value={p.segundoNombre}
                      onChange={(e) => actualizarPasajero(i, { segundoNombre: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`pa-${i}`}>Primer apellido *</label>
                    <input
                      id={`pa-${i}`}
                      className={styles.input}
                      maxLength={20}
                      value={p.primerApellido}
                      onChange={(e) => actualizarPasajero(i, { primerApellido: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor={`sa-${i}`}>Segundo apellido</label>
                    <input
                      id={`sa-${i}`}
                      className={styles.input}
                      maxLength={20}
                      value={p.segundoApellido}
                      onChange={(e) => actualizarPasajero(i, { segundoApellido: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            ))}

            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Oferta</h3>
              <p className={styles.cardSubtitle}>Se aplica el descuento de una oferta vigente.</p>
              <select
                className={styles.select}
                value={idOferta}
                onChange={(e) => setIdOferta(e.target.value === '' ? '' : Number(e.target.value))}
              >
                <option value="">Sin oferta</option>
                {ofertas.map((o) => (
                  <option key={o.idOferta} value={o.idOferta}>
                    {o.titulo} · {o.porcentajeDescuento}% (hasta {formatearFecha(o.fechaFin)})
                  </option>
                ))}
              </select>
            </section>

            <div className={styles.actions}>
              <button type="submit" className={styles.primaryButton} disabled={planes.length === 0}>
                Continuar a verificar
              </button>
            </div>
          </form>
        )}

        {/* ---------------- Paso 2 ---------------- */}
        {paso === 'verificar' && (
          <>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Verifica tu reserva</h3>
              <p className={styles.cardSubtitle}>
                Cliente: <strong>{cliente?.primerNombre} {cliente?.primerApellido}</strong>
                {esEmpleado && ` · Vendida por ${user.nombreCorto ?? user.correo}`}. Los asientos se asignan
                automáticamente al confirmar.
              </p>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pasajero</th>
                    <th>Identificación</th>
                    <th>Plan</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {pasajeros.map((p, i) => (
                    <tr key={i}>
                      <td>{p.primerNombre} {p.primerApellido}</td>
                      <td>{p.tipoIdentificacion} {p.numeroIdentificacion}</td>
                      <td>{planDe(p.idPlan)?.nombrePlan}</td>
                      <td style={{ textAlign: 'right' }}>
                        {formatearPrecio(tarifaViajes + (planDe(p.idPlan)?.precioExtra ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '0.8rem' }}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryMuted}>Subtotal</span>
                  <span>{formatearPrecio(subtotalEstimado)}</span>
                </div>
                {ofertaElegida && (
                  <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
                    <span>{ofertaElegida.titulo} (−{ofertaElegida.porcentajeDescuento}%)</span>
                    <span>−{formatearPrecio(descuentoEstimado)}</span>
                  </div>
                )}
                <div className={styles.summaryTotal}>
                  <span>Total a pagar</span>
                  <span>{formatearPrecio(subtotalEstimado - descuentoEstimado)}</span>
                </div>
              </div>
            </section>
            <div className={styles.actions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setPaso('pasajeros')} disabled={enviando}>
                Editar pasajeros
              </button>
              <button type="button" className={styles.primaryButton} onClick={confirmarReserva} disabled={enviando}>
                {enviando ? 'Reservando…' : 'Confirmar y pagar'}
              </button>
            </div>
          </>
        )}

        {/* ---------------- Paso 3: pasarela ---------------- */}
        {paso === 'pago' && reserva && (
          <div className={styles.gateway}>
            <div className={styles.gatewayHeader}>
              <span className={styles.gatewayBrand}>PagoSeguro · Reserva #{reserva.idReserva}</span>
              <span className={styles.gatewayAmount}>{formatearPrecio(reserva.valorTotal)}</span>
            </div>

            <section className={styles.card}>
              {procesando ? (
                <div className={styles.processing}>
                  <div className={styles.spinner} />
                  <strong>Procesando el pago…</strong>
                  <span className={styles.summaryMuted}>No cierres esta ventana.</span>
                </div>
              ) : (
                <form onSubmit={pagar}>
                  <div className={styles.methods}>
                    {metodosDisponibles.map((m) => (
                      <button
                        type="button"
                        key={m}
                        className={`${styles.method} ${metodo === m ? styles.methodActive : ''}`}
                        onClick={() => {
                          setMetodo(m);
                          setError(null);
                        }}
                      >
                        {NOMBRE_METODO[m]}
                      </button>
                    ))}
                  </div>

                  {(metodo === 'TARJETA_CREDITO' || metodo === 'TARJETA_DEBITO') && (
                    <div className={styles.formGrid}>
                      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="numero">Número de tarjeta</label>
                        <input
                          id="numero"
                          className={styles.input}
                          inputMode="numeric"
                          placeholder="4111 1111 1111 1111"
                          maxLength={23}
                          value={tarjeta.numero}
                          onChange={(e) => setTarjeta({ ...tarjeta, numero: e.target.value })}
                        />
                      </div>
                      <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                        <label htmlFor="titular">Titular</label>
                        <input
                          id="titular"
                          className={styles.input}
                          placeholder="Como aparece en la tarjeta"
                          value={tarjeta.titular}
                          onChange={(e) => setTarjeta({ ...tarjeta, titular: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="vencimiento">Vencimiento</label>
                        <input
                          id="vencimiento"
                          className={styles.input}
                          placeholder="MM/AA"
                          maxLength={5}
                          value={tarjeta.vencimiento}
                          onChange={(e) => setTarjeta({ ...tarjeta, vencimiento: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="cvv">CVV</label>
                        <input
                          id="cvv"
                          className={styles.input}
                          inputMode="numeric"
                          maxLength={4}
                          value={tarjeta.cvv}
                          onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value })}
                        />
                      </div>
                      {metodo === 'TARJETA_CREDITO' && (
                        <div className={styles.field}>
                          <label htmlFor="cuotas">Cuotas</label>
                          <select
                            id="cuotas"
                            className={styles.select}
                            value={tarjeta.cuotas}
                            onChange={(e) => setTarjeta({ ...tarjeta, cuotas: e.target.value })}
                          >
                            {[1, 3, 6, 12, 24, 36].map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}

                  {metodo === 'PSE' && (
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label htmlFor="banco">Banco</label>
                        <select
                          id="banco"
                          className={styles.select}
                          value={pse.banco}
                          onChange={(e) => setPse({ ...pse, banco: e.target.value })}
                        >
                          {BANCOS_PSE.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="persona">Tipo de persona</label>
                        <select
                          id="persona"
                          className={styles.select}
                          value={pse.tipoPersona}
                          onChange={(e) => setPse({ ...pse, tipoPersona: e.target.value })}
                        >
                          <option value="Natural">Natural</option>
                          <option value="Jurídica">Jurídica</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {metodo === 'EFECTIVO' && (
                    <div className={styles.formGrid}>
                      <div className={styles.field}>
                        <label htmlFor="recibido">Efectivo recibido</label>
                        <input
                          id="recibido"
                          className={styles.input}
                          type="number"
                          min={0}
                          step={1000}
                          value={efectivoRecibido}
                          onChange={(e) => setEfectivoRecibido(e.target.value)}
                        />
                      </div>
                      <div className={styles.field}>
                        <label>Cambio a devolver</label>
                        <div className={styles.input} style={{ backgroundColor: '#f8fafc' }}>
                          {cambio > 0 ? formatearPrecio(cambio) : formatearPrecio(0)}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={styles.actions}>
                    <button type="button" className={styles.dangerButton} onClick={cancelarReserva}>
                      Cancelar reserva
                    </button>
                    <button type="submit" className={styles.primaryButton}>
                      Pagar {formatearPrecio(reserva.valorTotal)}
                    </button>
                  </div>
                  <p className={styles.secureNote}>
                    🔒 Pasarela simulada: los datos de pago no se guardan ni se envían a ningún banco.
                  </p>
                </form>
              )}
            </section>
          </div>
        )}

        {/* ---------------- Paso 4: confirmación ---------------- */}
        {paso === 'confirmacion' && reserva && pago && (
          <>
            <div className={styles.successBanner}>
              <span className={styles.successIcon}>✓</span>
              <div>
                <strong>¡Pago aprobado! Reserva #{reserva.idReserva} confirmada.</strong>
                <div className={styles.summaryMuted} style={{ fontSize: '0.88rem' }}>
                  Factura {pago.numeroFactura} · {NOMBRE_METODO[pago.metodoPago as Metodo] ?? pago.metodoPago} ·{' '}
                  {pago.fechaPago.replace('T', ' ').slice(0, 16)}
                </div>
              </div>
            </div>
            <section className={styles.card}>
              <h3 className={styles.cardTitle}>Pasajeros y asientos</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Pasajero</th>
                    <th>Identificación</th>
                    <th>Plan</th>
                    <th>Asiento</th>
                  </tr>
                </thead>
                <tbody>
                  {reserva.pasajeros.map((p) => (
                    <tr key={p.idDetalle}>
                      <td>{p.nombreCompleto}</td>
                      <td>{p.tipoIdentificacion} {p.numeroIdentificacion}</td>
                      <td>{p.nombrePlan}</td>
                      <td><strong>{p.numeroAsiento}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '0.8rem' }}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryMuted}>Subtotal</span>
                  <span>{formatearPrecio(reserva.subtotal)}</span>
                </div>
                {reserva.descuento > 0 && (
                  <div className={`${styles.summaryRow} ${styles.summaryDiscount}`}>
                    <span>{reserva.tituloOferta}</span>
                    <span>−{formatearPrecio(reserva.descuento)}</span>
                  </div>
                )}
                <div className={styles.summaryTotal}>
                  <span>Total pagado</span>
                  <span>{formatearPrecio(pago.montoPagado)}</span>
                </div>
              </div>
            </section>
            <div className={styles.actions}>
              <button type="button" className={styles.primaryButton} onClick={() => navigate('/', { replace: true })}>
                Volver al inicio
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/** Tarjeta con los viajes elegidos (se muestra en todos los pasos). */
function ResumenViajes({ compra }: { compra: CompraEnCurso }) {
  return (
    <section className={styles.card}>
      {compra.viajes.map((v) => (
        <div key={v.viaje.idProgramacionViaje} className={styles.summaryRow}>
          <span>
            <span className={styles.sectionLabel} style={{ marginRight: '0.5rem' }}>
              {v.tipoTrayecto === 'IDA' ? 'Ida' : 'Regreso'}
            </span>
            {v.origen} → {v.destino} · {formatearFecha(v.viaje.fechaHoraSalida)}
          </span>
          <span className={styles.summaryMuted}>
            {formatearHora(v.viaje.fechaHoraSalida)} – {formatearHora(v.viaje.fechaHoraLlegada)} (
            {formatearDuracion(v.viaje.duracionEstimada)}) · {v.viaje.codigoVehiculo}
          </span>
        </div>
      ))}
    </section>
  );
}
