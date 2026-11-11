/**
 * Castigos: consecuencia de fallar misiones. Nunca quitan EXP ni progreso.
 *
 * Reglas:
 * - Como máximo un castigo por día (el día de la misión fallida).
 * - El resultado de la ruleta se decide y guarda al girar, no al terminar la animación.
 * - Un reroll por castigo, y nunca devuelve el mismo castigo.
 * - Mientras haya un castigo sin cumplir, no se pueden completar misiones.
 */
import { ErrorDominio, type GeneradorId } from './tipos';

export const LONGITUD_MAX_CASTIGO = 100;

/** Castigo de la pool definida por el usuario. */
export interface Castigo {
  id: string;
  texto: string;
  archivado: boolean;
  creadoEn: string;
}

export type EstadoAsignacion = 'sin_girar' | 'asignado' | 'cumplido';

/** Castigo que toca cumplir por los fallos de un día. El texto se copia al girar. */
export interface AsignacionCastigo {
  id: string;
  fecha: string; // día de las misiones fallidas
  estado: EstadoAsignacion;
  castigoId: string | null;
  texto: string | null;
  rerollUsado: boolean;
  creadaEn: string;
  giradaEn: string | null;
  cumplidaEn: string | null;
}

/** Número en [0, 1), como Math.random. Se inyecta para poder probar. */
export type Azar = () => number;

function clave(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function crearCastigo(texto: string, pool: readonly Castigo[], ahora: Date, nuevoId: GeneradorId): Castigo {
  const limpio = texto.trim().replace(/\s+/g, ' ');
  if (!limpio) throw new ErrorDominio('El castigo necesita un texto.');
  if (limpio.length > LONGITUD_MAX_CASTIGO) {
    throw new ErrorDominio(`El castigo admite como máximo ${LONGITUD_MAX_CASTIGO} caracteres.`);
  }
  if (pool.some((c) => !c.archivado && clave(c.texto) === clave(limpio))) {
    throw new ErrorDominio(`Ya existe el castigo "${limpio}".`);
  }
  return { id: nuevoId(), texto: limpio, archivado: false, creadoEn: ahora.toISOString() };
}

/**
 * Días que necesitan castigo nuevo: los de misiones recién fallidas que aún no
 * tienen uno. Sin castigos en la pool no se asigna ninguno.
 */
export function asignacionesNuevas(
  fechasFallidas: readonly string[],
  fechasConAsignacion: ReadonlySet<string>,
  hayPool: boolean,
  ahora: Date,
  nuevoId: GeneradorId,
): AsignacionCastigo[] {
  if (!hayPool) return [];
  const dias = [...new Set(fechasFallidas)].filter((f) => !fechasConAsignacion.has(f)).sort();
  return dias.map((fecha) => ({
    id: nuevoId(),
    fecha,
    estado: 'sin_girar',
    castigoId: null,
    texto: null,
    rerollUsado: false,
    creadaEn: ahora.toISOString(),
    giradaEn: null,
    cumplidaEn: null,
  }));
}

function elegir<T>(opciones: readonly T[], azar: Azar): T {
  const i = Math.min(Math.floor(azar() * opciones.length), opciones.length - 1);
  return opciones[i];
}

const activos = (pool: readonly Castigo[]) => pool.filter((c) => !c.archivado);

export function girar(a: AsignacionCastigo, pool: readonly Castigo[], azar: Azar, ahora: Date): AsignacionCastigo {
  if (a.estado !== 'sin_girar') throw new ErrorDominio('Este castigo ya se giró.');
  const opciones = activos(pool);
  if (opciones.length === 0) throw new ErrorDominio('Añade al menos un castigo a la pool para girar.');
  const c = elegir(opciones, azar);
  return { ...a, estado: 'asignado', castigoId: c.id, texto: c.texto, giradaEn: ahora.toISOString() };
}

/** Opciones de reroll: la pool activa sin el castigo actual. */
export function opcionesDeReroll(a: AsignacionCastigo, pool: readonly Castigo[]): Castigo[] {
  return activos(pool).filter((c) => c.id !== a.castigoId);
}

export function puedeReroll(a: AsignacionCastigo, pool: readonly Castigo[]): boolean {
  return a.estado === 'asignado' && !a.rerollUsado && opcionesDeReroll(a, pool).length > 0;
}

export function reroll(a: AsignacionCastigo, pool: readonly Castigo[], azar: Azar, ahora: Date): AsignacionCastigo {
  if (a.estado !== 'asignado') throw new ErrorDominio('Primero hay que girar la ruleta.');
  if (a.rerollUsado) throw new ErrorDominio('Ya usaste el reroll de este castigo.');
  const opciones = opcionesDeReroll(a, pool);
  if (opciones.length === 0) throw new ErrorDominio('No hay otro castigo en la pool para el reroll.');
  const c = elegir(opciones, azar);
  return { ...a, castigoId: c.id, texto: c.texto, rerollUsado: true, giradaEn: ahora.toISOString() };
}

export function cumplir(a: AsignacionCastigo, ahora: Date): AsignacionCastigo {
  if (a.estado === 'sin_girar') throw new ErrorDominio('Primero hay que girar la ruleta.');
  if (a.estado === 'cumplido') throw new ErrorDominio('Este castigo ya está cumplido.');
  return { ...a, estado: 'cumplido', cumplidaEn: ahora.toISOString() };
}

/** El bloqueo se calcula desde los datos: hay al menos un castigo sin cumplir. */
export function hayBloqueo(asignaciones: readonly AsignacionCastigo[]): boolean {
  return asignaciones.some((a) => a.estado !== 'cumplido');
}
