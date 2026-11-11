/**
 * Fechas y horas en la zona del usuario (Ecuador continental, UTC-5).
 * Ecuador no usa horario de verano, así que un desfase fijo es exacto y evita
 * depender del soporte de zonas horarias del motor JS del móvil.
 *
 * Convenciones:
 * - Un "día local" es un texto `YYYY-MM-DD`.
 * - Una "hora local" es un texto `HH:MM` (00:00–23:59).
 */
export const DESFASE_ZONA_MINUTOS = -5 * 60;

const MS_MINUTO = 60_000;
const MS_DIA = 24 * 60 * MS_MINUTO;

const RE_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

function dos(n: number): string {
  return String(n).padStart(2, '0');
}

/** Día local (`YYYY-MM-DD`) en el que cae un instante. */
export function diaLocal(instante: Date): string {
  const local = new Date(instante.getTime() + DESFASE_ZONA_MINUTOS * MS_MINUTO);
  return `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-${dos(local.getUTCDate())}`;
}

/** Hora local (`HH:MM`) de un instante. */
export function horaLocal(instante: Date): string {
  const local = new Date(instante.getTime() + DESFASE_ZONA_MINUTOS * MS_MINUTO);
  return `${dos(local.getUTCHours())}:${dos(local.getUTCMinutes())}`;
}

export function esFechaValida(fecha: string): boolean {
  const m = RE_FECHA.exec(fecha);
  if (!m) return false;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, mes - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === mes - 1 && f.getUTCDate() === d;
}

export function esHoraValida(hora: string): boolean {
  return RE_HORA.test(hora);
}

function fechaAUtcMedianoche(fecha: string): number {
  if (!esFechaValida(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  const [a, m, d] = fecha.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
}

export function sumarDias(fecha: string, dias: number): string {
  const t = fechaAUtcMedianoche(fecha) + dias * MS_DIA;
  const f = new Date(t);
  return `${f.getUTCFullYear()}-${dos(f.getUTCMonth() + 1)}-${dos(f.getUTCDate())}`;
}

/** Días desde `desde` hasta `hasta`, ambos incluidos. Vacío si desde > hasta. */
export function rangoDeDias(desde: string, hasta: string): string[] {
  const dias: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
  return dias;
}

/** Instante exacto en que vence una hora local de un día local. */
export function instanteLocal(fecha: string, hora: string): Date {
  if (!esHoraValida(hora)) throw new Error(`Hora inválida: ${hora}`);
  const [h, min] = hora.split(':').map(Number);
  return new Date(fechaAUtcMedianoche(fecha) + (h * 60 + min - DESFASE_ZONA_MINUTOS) * MS_MINUTO);
}
