import { ErrorDominio, RANGO_INICIAL, type GeneradorId, type Ruta } from './tipos';

export const LONGITUD_MAX_NOMBRE_RUTA = 40;

/** Clave para comparar nombres de ruta sin distinguir mayúsculas ni espacios extra. */
export function claveNombreRuta(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

export function limpiarNombreRuta(nombre: string): string {
  return nombre.trim().replace(/\s+/g, ' ');
}

export function crearRuta(
  nombre: string,
  existentes: readonly Ruta[],
  ahora: Date,
  nuevoId: GeneradorId,
): Ruta {
  const limpio = limpiarNombreRuta(nombre);
  if (!limpio) throw new ErrorDominio('La ruta necesita un nombre.');
  if (limpio.length > LONGITUD_MAX_NOMBRE_RUTA) {
    throw new ErrorDominio(`El nombre admite como máximo ${LONGITUD_MAX_NOMBRE_RUTA} caracteres.`);
  }
  const clave = claveNombreRuta(limpio);
  if (existentes.some((r) => claveNombreRuta(r.nombre) === clave)) {
    throw new ErrorDominio(`Ya existe la ruta "${limpio}".`);
  }
  return { id: nuevoId(), nombre: limpio, rango: RANGO_INICIAL, creadaEn: ahora.toISOString() };
}
