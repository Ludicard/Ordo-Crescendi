import { describe, expect, it } from 'vitest';
import { diaLocal, esFechaValida, esHoraValida, horaLocal, instanteLocal, rangoDeDias, sumarDias } from '../src/domain/fechas';

describe('fechas en hora de Ecuador (UTC-5)', () => {
  it('el día local cambia a medianoche de Ecuador, no de UTC', () => {
    expect(diaLocal(new Date('2026-11-12T04:59:00Z'))).toBe('2026-11-11'); // 23:59 en Ecuador
    expect(diaLocal(new Date('2026-11-12T05:00:00Z'))).toBe('2026-11-12'); // 00:00 en Ecuador
    expect(horaLocal(new Date('2026-11-12T16:30:00Z'))).toBe('11:30');
  });

  it('convierte una hora local a instante', () => {
    expect(instanteLocal('2026-11-11', '11:00').toISOString()).toBe('2026-11-11T16:00:00.000Z');
    expect(instanteLocal('2026-11-11', '23:59').toISOString()).toBe('2026-11-12T04:59:00.000Z');
  });

  it('suma días cruzando meses y años', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01');
    expect(sumarDias('2028-03-01', -1)).toBe('2028-02-29');
    expect(rangoDeDias('2026-11-29', '2026-12-02')).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02']);
    expect(rangoDeDias('2026-11-12', '2026-11-11')).toEqual([]);
  });

  it('valida formatos', () => {
    expect(esFechaValida('2026-02-29')).toBe(false);
    expect(esFechaValida('2028-02-29')).toBe(true);
    expect(esFechaValida('2026-1-01')).toBe(false);
    expect(esHoraValida('23:59')).toBe(true);
    expect(esHoraValida('24:00')).toBe(false);
    expect(esHoraValida('7:00')).toBe(false);
  });
});
