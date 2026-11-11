import { describe, expect, it } from 'vitest';
import { analizarImportacion } from '../src/domain/importacion';
import type { Ruta } from '../src/domain/tipos';
import { ec, ids } from './ayudantes';

const baloncesto: Ruta = { id: 'r1', nombre: 'Baloncesto', rango: 'D', creadaEn: '2026-11-01T00:00:00Z' };
const ahora = ec('2026-11-11', '08:00');
const analizar = (datos: unknown, rutas: Ruta[] = [baloncesto]) =>
  analizarImportacion(typeof datos === 'string' ? datos : JSON.stringify(datos), rutas, ahora, ids('n'));

const ejemplo = {
  version: 1,
  misiones: [
    { titulo: 'Bañarme', tipo: 'rutina', ruta: 'baloncesto', exp: 10, hora_limite: '11:00' },
    { titulo: 'Practicar tiros 30 min', tipo: 'objetivo_ruta', ruta: 'Programación', exp: 40, hora_limite: '20:00', fecha: '2026-11-12' },
    { titulo: 'Cocinar desayuno para la familia', tipo: 'algo_bueno', exp: 0, hora_limite: '09:00' },
  ],
};

describe('importación de misiones', () => {
  it('crea plantillas, misiones puntuales y rutas nuevas', () => {
    const r = analizar(ejemplo);
    if (!r.ok) throw new Error(r.errores.join('\n'));
    const { plan } = r;
    expect(plan.rutasNuevas.map((x) => x.nombre)).toEqual(['Programación']);
    expect(plan.plantillas).toHaveLength(1);
    expect(plan.plantillas[0]).toMatchObject({ titulo: 'Bañarme', rutaId: 'r1', primerDia: '2026-11-11', exp: 10 });
    expect(plan.misiones).toHaveLength(2);
    expect(plan.misiones[0]).toMatchObject({ fecha: '2026-11-12', rutaId: plan.rutasNuevas[0].id, tipo: 'objetivo_ruta' });
    expect(plan.misiones[1]).toMatchObject({ fecha: '2026-11-11', rutaId: null, tipo: 'algo_bueno' });
  });

  it('acepta el JSON envuelto en un bloque de código', () => {
    const r = analizar('```json\n' + JSON.stringify(ejemplo) + '\n```');
    expect(r.ok).toBe(true);
  });

  it('no duplica una ruta referenciada varias veces', () => {
    const r = analizar({
      version: 1,
      rutas: ['Lectura'],
      misiones: [
        { titulo: 'A', tipo: 'objetivo_ruta', ruta: 'lectura', exp: 5, hora_limite: '22:00' },
        { titulo: 'B', tipo: 'rutina', ruta: 'LECTURA ', exp: 5, hora_limite: '22:00' },
      ],
    });
    expect(r.ok && r.plan.rutasNuevas.length).toBe(1);
  });

  it('reúne todos los errores con su posición', () => {
    const r = analizar({
      version: 1,
      misiones: [
        { tipo: 'rutina', exp: 10, hora_limite: '11:00' },
        { titulo: 'X', tipo: 'otro', exp: -1, hora_limite: '7:00' },
        { titulo: 'Y', tipo: 'objetivo_ruta', exp: 10, hora_limite: '10:00' },
        { titulo: 'Z', tipo: 'rutina', exp: 10, hora_limite: '10:00', fecha: '2026-11-11' },
        { titulo: 'W', tipo: 'rutina', exp: 2.5, hora_limite: '10:00' },
      ],
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores.some((e) => e.startsWith('misiones[0]') && e.includes('titulo'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[1]') && e.includes('tipo'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[1]') && e.includes('exp'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[1]') && e.includes('hora_limite'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[2]') && e.includes('ruta'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[3]') && e.includes('fecha'))).toBe(true);
    expect(r.errores.some((e) => e.startsWith('misiones[4]') && e.includes('exp'))).toBe(true);
  });

  it('rechaza misiones puntuales ya vencidas', () => {
    const r = analizar({ version: 1, misiones: [{ titulo: 'Tarde', tipo: 'algo_bueno', exp: 0, hora_limite: '07:00' }] });
    expect(r.ok).toBe(false);
  });

  it('una rutina cuya hora ya pasó hoy empieza mañana, con aviso', () => {
    const r = analizar({ version: 1, misiones: [{ titulo: 'Madrugar', tipo: 'rutina', exp: 5, hora_limite: '06:00' }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.plantillas[0].primerDia).toBe('2026-11-12');
    expect(r.plan.avisos.some((a) => a.includes('mañana'))).toBe(true);
  });

  it('avisa de EXP sin ruta y de campos desconocidos', () => {
    const r = analizar({ version: 1, misiones: [{ titulo: 'A', tipo: 'rutina', exp: 5, hora_limite: '22:00', prioridad: 1 }] });
    expect(r.ok && r.plan.avisos.length).toBe(2);
  });

  it('rechaza JSON inválido, versión incorrecta y lista vacía', () => {
    expect(analizar('{no es json').ok).toBe(false);
    expect(analizar({ version: 2, misiones: [] }).ok).toBe(false);
    expect(analizar({ version: 1, misiones: [] }).ok).toBe(false);
  });
});
