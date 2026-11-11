/// <reference types="node" />
import { describe, expect, it } from 'vitest';
import { instruccionesParaIA } from '../src/application/instruccionesIA';
import { analizarImportacion } from '../src/domain/importacion';
import { ec, ids } from './ayudantes';

describe('instrucciones para la IA', () => {
  it('incluye las rutas existentes y la fecha de hoy', () => {
    const t = instruccionesParaIA(['Baloncesto', 'Programación'], '2026-11-11');
    expect(t).toContain('- Baloncesto');
    expect(t).toContain('- Programación');
    expect(t).toContain('2026-11-11');
  });

  it('el ejemplo de docs/formato-misiones.md se importa sin errores', async () => {
    const fs = await import('node:fs');
    const md = fs.readFileSync(new URL('../docs/formato-misiones.md', import.meta.url), 'utf8');
    const json = /```json\n([\s\S]*?)```/.exec(md)![1];
    const r = analizarImportacion(json, [], ec('2026-11-11', '06:00'), ids());
    if (!r.ok) throw new Error(r.errores.join('\n'));
  });
});
