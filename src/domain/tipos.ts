export type Rango = 'D' | 'C' | 'B' | 'A' | 'S';
export const RANGO_INICIAL: Rango = 'D';

export interface Ruta {
  id: string;
  nombre: string;
  rango: Rango;
  creadaEn: string; // ISO
}

export type TipoMision = 'rutina' | 'algo_bueno' | 'objetivo_ruta';
export const TIPOS_MISION: readonly TipoMision[] = ['rutina', 'algo_bueno', 'objetivo_ruta'];

export type EstadoMision = 'pendiente' | 'completada' | 'fallida';

/** Rutina recurrente: genera una misión cada día. */
export interface PlantillaRutina {
  id: string;
  titulo: string;
  descripcion: string;
  rutaId: string | null;
  exp: number;
  horaLimite: string; // HH:MM
  /** Primer día local para el que se genera misión. */
  primerDia: string;
  /** Último día local ya generado (null si aún ninguno). */
  ultimoDiaGenerado: string | null;
  archivada: boolean;
  creadaEn: string;
}

/**
 * Misión de un día concreto. Los valores (exp, hora límite, ruta) se copian al
 * crearla, para que cambiar una plantilla o regla no reescriba el pasado.
 */
export interface Mision {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: TipoMision;
  rutaId: string | null;
  exp: number;
  fecha: string; // YYYY-MM-DD
  horaLimite: string; // HH:MM
  estado: EstadoMision;
  plantillaId: string | null;
  completadaEn: string | null;
  creadaEn: string;
}

export class ErrorDominio extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorDominio';
  }
}

export type GeneradorId = () => string;
