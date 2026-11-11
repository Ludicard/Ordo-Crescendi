import { describe, expect, it } from 'vitest';
import {
  asignacionesNuevas,
  crearCastigo,
  cumplir,
  girar,
  hayBloqueo,
  puedeReroll,
  reroll,
  type AsignacionCastigo,
  type Castigo,
} from '../src/domain/castigos';
import { ec, ids } from './ayudantes';

const ahora = ec('2026-11-11', '12:00');
const c = (id: string, texto = id, archivado = false): Castigo => ({ id, texto, archivado, creadoEn: '' });
const pool = [c('a', '4 horas sin internet'), c('b', 'Leer un libro entero'), c('d', 'Meditar 45 minutos')];
const sinGirar = (): AsignacionCastigo => asignacionesNuevas(['2026-11-11'], new Set(), true, ahora, ids())[0];

describe('pool de castigos', () => {
  it('no admite vacíos ni duplicados activos', () => {
    expect(() => crearCastigo('  ', pool, ahora, ids())).toThrow();
    expect(() => crearCastigo('meditar  45 MINUTOS', pool, ahora, ids())).toThrow('Ya existe');
    expect(crearCastigo('Meditar 45 minutos', [c('x', 'Meditar 45 minutos', true)], ahora, ids()).texto).toBe(
      'Meditar 45 minutos',
    );
  });
});

describe('asignación', () => {
  it('un castigo por día como máximo, aunque fallen varias misiones', () => {
    const r = asignacionesNuevas(['2026-11-11', '2026-11-11', '2026-11-10'], new Set(), true, ahora, ids());
    expect(r.map((a) => a.fecha)).toEqual(['2026-11-10', '2026-11-11']);
    expect(r.every((a) => a.estado === 'sin_girar')).toBe(true);
  });

  it('no repite un día que ya tiene castigo', () => {
    expect(asignacionesNuevas(['2026-11-11'], new Set(['2026-11-11']), true, ahora, ids())).toEqual([]);
  });

  it('sin pool no se asigna castigo', () => {
    expect(asignacionesNuevas(['2026-11-11'], new Set(), false, ahora, ids())).toEqual([]);
  });
});

describe('ruleta', () => {
  it('girar elige al azar de la pool activa y copia el texto', () => {
    const a = girar(sinGirar(), [...pool, c('z', 'archivado', true)], () => 0.99, ahora);
    expect(a).toMatchObject({ estado: 'asignado', castigoId: 'd', texto: 'Meditar 45 minutos' });
    expect(() => girar(a, pool, () => 0, ahora)).toThrow('ya se giró');
  });

  it('no se puede girar con la pool vacía', () => {
    expect(() => girar(sinGirar(), [c('z', 'z', true)], () => 0, ahora)).toThrow('pool');
  });

  it('un solo reroll, que nunca devuelve el mismo castigo', () => {
    const a = girar(sinGirar(), pool, () => 0, ahora); // 'a'
    for (const r of [0, 0.5, 0.99]) {
      expect(reroll(a, pool, () => r, ahora).castigoId).not.toBe('a');
    }
    const b = reroll(a, pool, () => 0, ahora);
    expect(b.rerollUsado).toBe(true);
    expect(puedeReroll(b, pool)).toBe(false);
    expect(() => reroll(b, pool, () => 0, ahora)).toThrow('Ya usaste');
  });

  it('sin otra opción no hay reroll', () => {
    const solo = [c('a')];
    const a = girar(sinGirar(), solo, () => 0, ahora);
    expect(puedeReroll(a, solo)).toBe(false);
    expect(() => reroll(a, solo, () => 0, ahora)).toThrow();
  });
});

describe('bloqueo y cumplimiento', () => {
  it('bloquea mientras haya un castigo sin cumplir', () => {
    const a = sinGirar();
    expect(hayBloqueo([a])).toBe(true);
    expect(() => cumplir(a, ahora)).toThrow('girar');
    const g = girar(a, pool, () => 0, ahora);
    expect(hayBloqueo([g])).toBe(true);
    const hecho = cumplir(g, ahora);
    expect(hecho.estado).toBe('cumplido');
    expect(hayBloqueo([hecho])).toBe(false);
    expect(hayBloqueo([])).toBe(false);
    expect(() => cumplir(hecho, ahora)).toThrow();
  });
});
