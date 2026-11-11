import type { Mision } from '../src/domain/tipos';

/** Instante a partir de una hora local de Ecuador. */
export function ec(fecha: string, hora: string, segundos = 0): Date {
  return new Date(`${fecha}T${hora}:${String(segundos).padStart(2, '0')}-05:00`);
}

export function ids(prefijo = 'id'): () => string {
  let n = 0;
  return () => `${prefijo}-${++n}`;
}

export function mision(parcial: Partial<Mision> = {}): Mision {
  return {
    id: 'm1',
    titulo: 'Bañarme',
    descripcion: '',
    tipo: 'rutina',
    rutaId: 'r1',
    exp: 10,
    fecha: '2026-11-11',
    horaLimite: '11:00',
    estado: 'pendiente',
    plantillaId: null,
    completadaEn: null,
    creadaEn: '2026-11-11T05:00:00.000Z',
    ...parcial,
  };
}
