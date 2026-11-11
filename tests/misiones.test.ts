import { describe, expect, it } from 'vitest';
import {
  completarMision,
  estaVencida,
  expPorRuta,
  generarMisionesDePlantilla,
  misionesAFallar,
  primerDiaDePlantilla,
} from '../src/domain/misiones';
import type { PlantillaRutina } from '../src/domain/tipos';
import { ec, ids, mision } from './ayudantes';

const plantilla = (p: Partial<PlantillaRutina> = {}): PlantillaRutina => ({
  id: 'p1',
  titulo: 'Bañarme',
  descripcion: '',
  rutaId: 'r1',
  exp: 10,
  horaLimite: '11:00',
  primerDia: '2026-11-11',
  ultimoDiaGenerado: null,
  archivada: false,
  creadaEn: '2026-11-11T05:00:00.000Z',
  ...p,
});

describe('vencimiento', () => {
  it('se puede completar durante todo el minuto límite', () => {
    const m = mision({ horaLimite: '11:00' });
    expect(estaVencida(m, ec('2026-11-11', '11:00', 59))).toBe(false);
    expect(estaVencida(m, ec('2026-11-11', '11:01'))).toBe(true);
  });

  it('las pendientes de días anteriores fallan aunque su hora no haya llegado hoy', () => {
    const ayer = mision({ id: 'a', fecha: '2026-11-10', horaLimite: '23:59' });
    const hoy = mision({ id: 'b', fecha: '2026-11-11', horaLimite: '23:59' });
    expect(misionesAFallar([ayer, hoy], ec('2026-11-11', '00:00'))).toEqual(['a']);
  });

  it('solo falla misiones pendientes', () => {
    const hecha = mision({ estado: 'completada' });
    expect(misionesAFallar([hecha], ec('2026-11-12', '12:00'))).toEqual([]);
  });
});

describe('completar', () => {
  it('marca la misión completada y guarda el instante', () => {
    const ahora = ec('2026-11-11', '10:30');
    const m = completarMision(mision(), ahora);
    expect(m.estado).toBe('completada');
    expect(m.completadaEn).toBe(ahora.toISOString());
  });

  it('no permite completar tras la hora límite, dos veces, ni misiones futuras', () => {
    expect(() => completarMision(mision(), ec('2026-11-11', '11:01'))).toThrow('venció');
    expect(() => completarMision(mision({ estado: 'completada' }), ec('2026-11-11', '10:00'))).toThrow();
    expect(() => completarMision(mision({ estado: 'fallida' }), ec('2026-11-11', '10:00'))).toThrow();
    expect(() => completarMision(mision({ fecha: '2026-11-12' }), ec('2026-11-11', '10:00'))).toThrow('futuro');
  });
});

describe('generación de rutinas', () => {
  it('genera la misión de hoy copiando los valores de la plantilla', () => {
    const r = generarMisionesDePlantilla(plantilla(), ec('2026-11-11', '08:00'), ids('m'));
    expect(r.ultimoDiaGenerado).toBe('2026-11-11');
    expect(r.misiones).toHaveLength(1);
    expect(r.misiones[0]).toMatchObject({
      id: 'm-1', fecha: '2026-11-11', exp: 10, horaLimite: '11:00', plantillaId: 'p1', tipo: 'rutina', estado: 'pendiente',
    });
  });

  it('es idempotente: no repite un día ya generado', () => {
    const r = generarMisionesDePlantilla(plantilla({ ultimoDiaGenerado: '2026-11-11' }), ec('2026-11-11', '20:00'), ids());
    expect(r.misiones).toEqual([]);
  });

  it('rellena los días en que no se abrió la app', () => {
    const r = generarMisionesDePlantilla(plantilla({ ultimoDiaGenerado: '2026-11-08' }), ec('2026-11-11', '08:00'), ids());
    expect(r.misiones.map((m) => m.fecha)).toEqual(['2026-11-09', '2026-11-10', '2026-11-11']);
  });

  it('no genera nada si está archivada o empieza mañana', () => {
    expect(generarMisionesDePlantilla(plantilla({ archivada: true }), ec('2026-11-11', '08:00'), ids()).misiones).toEqual([]);
    expect(generarMisionesDePlantilla(plantilla({ primerDia: '2026-11-12' }), ec('2026-11-11', '08:00'), ids()).misiones).toEqual([]);
  });

  it('una rutina nueva empieza mañana si su hora límite ya pasó hoy', () => {
    expect(primerDiaDePlantilla('11:00', ec('2026-11-11', '10:00'))).toBe('2026-11-11');
    expect(primerDiaDePlantilla('11:00', ec('2026-11-11', '12:00'))).toBe('2026-11-12');
  });
});

describe('EXP por ruta', () => {
  it('suma solo misiones completadas con ruta', () => {
    const total = expPorRuta([
      mision({ id: '1', estado: 'completada', exp: 10 }),
      mision({ id: '2', estado: 'completada', exp: 5 }),
      mision({ id: '3', estado: 'fallida', exp: 100 }),
      mision({ id: '4', estado: 'pendiente', exp: 100 }),
      mision({ id: '5', estado: 'completada', exp: 7, rutaId: null }),
      mision({ id: '6', estado: 'completada', exp: 3, rutaId: 'r2' }),
    ]);
    expect(total.get('r1')).toBe(15);
    expect(total.get('r2')).toBe(3);
    expect(total.size).toBe(2);
  });
});
