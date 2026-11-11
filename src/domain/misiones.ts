import { diaLocal, instanteLocal, rangoDeDias, sumarDias } from './fechas';
import { ErrorDominio, type GeneradorId, type Mision, type PlantillaRutina } from './tipos';

/** Instante a partir del cual la misión ya no se puede completar. */
export function vencimientoDe(m: Pick<Mision, 'fecha' | 'horaLimite'>): Date {
  return instanteLocal(m.fecha, m.horaLimite);
}

/** Una misión vence al pasar su hora límite (la hora límite misma aún cuenta). */
export function estaVencida(m: Pick<Mision, 'fecha' | 'horaLimite'>, ahora: Date): boolean {
  // Se puede completar hasta el final del minuto límite (11:00:59 para "11:00").
  return ahora.getTime() >= vencimientoDe(m).getTime() + 60_000;
}

/** Ids de misiones pendientes que ya vencieron y deben marcarse como fallidas. */
export function misionesAFallar(misiones: readonly Mision[], ahora: Date): string[] {
  return misiones.filter((m) => m.estado === 'pendiente' && estaVencida(m, ahora)).map((m) => m.id);
}

export function completarMision(m: Mision, ahora: Date): Mision {
  if (m.estado !== 'pendiente') {
    throw new ErrorDominio(`La misión ya está ${m.estado}.`);
  }
  if (diaLocal(ahora) < m.fecha) {
    throw new ErrorDominio('La misión es de un día futuro.');
  }
  if (estaVencida(m, ahora)) {
    throw new ErrorDominio('La misión ya venció.');
  }
  return { ...m, estado: 'completada', completadaEn: ahora.toISOString() };
}

/**
 * Primer día para el que una rutina nueva genera misión: hoy si su hora límite
 * aún no pasó; si ya pasó, mañana (no se crean misiones que nacen fallidas).
 */
export function primerDiaDePlantilla(horaLimite: string, ahora: Date): string {
  const hoy = diaLocal(ahora);
  return estaVencida({ fecha: hoy, horaLimite }, ahora) ? sumarDias(hoy, 1) : hoy;
}

/**
 * Genera las misiones que faltan de una rutina hasta hoy. Si la app no se abrió
 * algunos días, también se crean esos días (y luego vencerán como fallidas).
 */
export function generarMisionesDePlantilla(
  p: PlantillaRutina,
  ahora: Date,
  nuevoId: GeneradorId,
): { misiones: Mision[]; ultimoDiaGenerado: string | null } {
  if (p.archivada) return { misiones: [], ultimoDiaGenerado: p.ultimoDiaGenerado };
  const hoy = diaLocal(ahora);
  const desde = p.ultimoDiaGenerado ? sumarDias(p.ultimoDiaGenerado, 1) : p.primerDia;
  const dias = rangoDeDias(desde, hoy);
  if (dias.length === 0) return { misiones: [], ultimoDiaGenerado: p.ultimoDiaGenerado };
  const creadaEn = ahora.toISOString();
  const misiones = dias.map<Mision>((fecha) => ({
    id: nuevoId(),
    titulo: p.titulo,
    descripcion: p.descripcion,
    tipo: 'rutina',
    rutaId: p.rutaId,
    exp: p.exp,
    fecha,
    horaLimite: p.horaLimite,
    estado: 'pendiente',
    plantillaId: p.id,
    completadaEn: null,
    creadaEn,
  }));
  return { misiones, ultimoDiaGenerado: hoy };
}

/** EXP de una ruta: suma de la EXP de sus misiones completadas. */
export function expPorRuta(misiones: readonly Mision[]): Map<string, number> {
  const total = new Map<string, number>();
  for (const m of misiones) {
    if (m.estado === 'completada' && m.rutaId) {
      total.set(m.rutaId, (total.get(m.rutaId) ?? 0) + m.exp);
    }
  }
  return total;
}

const ORDEN_ESTADO: Record<Mision['estado'], number> = { pendiente: 0, completada: 1, fallida: 2 };

/** Orden para mostrar: pendientes primero, y por hora límite. */
export function ordenarParaMostrar(misiones: readonly Mision[]): Mision[] {
  return [...misiones].sort(
    (a, b) =>
      ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado] ||
      a.horaLimite.localeCompare(b.horaLimite) ||
      a.titulo.localeCompare(b.titulo),
  );
}
