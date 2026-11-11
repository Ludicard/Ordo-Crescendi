import { describe, expect, it } from 'vitest';
import {
  completar,
  cumplirCastigo,
  estadoCastigos,
  girarRuleta,
  importar,
  misionesDeHoy,
  nuevoCastigo,
  rerollRuleta,
  rutasConProgreso,
  type Dependencias,
} from '../src/application/casosDeUso';
import { RepositorioMemoria } from '../src/infrastructure/repositorioMemoria';
import { ec, ids } from './ayudantes';

function entorno(inicio: Date) {
  let ahora = inicio;
  const repo = new RepositorioMemoria();
  const deps: Dependencias = { repo, reloj: () => ahora, nuevoId: ids(), azar: () => 0 };
  return { repo, deps, mover: (d: Date) => (ahora = d) };
}

const texto = JSON.stringify({
  version: 1,
  misiones: [
    { titulo: 'Bañarme', tipo: 'rutina', ruta: 'Baloncesto', exp: 10, hora_limite: '11:00' },
    { titulo: '20 flexiones', tipo: 'rutina', ruta: 'Baloncesto', exp: 10, hora_limite: '11:30' },
    { titulo: 'Practicar tiros', tipo: 'objetivo_ruta', ruta: 'Baloncesto', exp: 40, hora_limite: '20:00' },
  ],
});

async function preparar(conPool = true) {
  const e = entorno(ec('2026-11-11', '08:00'));
  if (conPool) {
    await nuevoCastigo(e.deps, '4 horas sin internet');
    await nuevoCastigo(e.deps, 'Meditar 45 minutos');
  }
  await importar(e.deps, texto);
  return e;
}

describe('castigos en el ciclo diario', () => {
  it('fallar misiones asigna un solo castigo por día y bloquea completar', async () => {
    const { deps, repo, mover } = await preparar();
    const practicar = (await misionesDeHoy(deps)).find((m) => m.titulo === 'Practicar tiros')!;
    await completar(deps, (await misionesDeHoy(deps))[0].id); // completa "Bañarme" a tiempo
    mover(ec('2026-11-11', '12:00')); // falla "20 flexiones"
    const estado = await estadoCastigos(deps);
    expect(estado).toMatchObject({ pendientes: 1, bloqueado: true });
    expect(estado.actual).toMatchObject({ fecha: '2026-11-11', estado: 'sin_girar' });
    await expect(completar(deps, practicar.id)).rejects.toThrow('castigo pendiente');
    expect(repo.asignaciones.size).toBe(1);
  });

  it('el castigo no quita EXP ya ganada', async () => {
    const { deps, mover } = await preparar();
    await completar(deps, (await misionesDeHoy(deps))[0].id);
    mover(ec('2026-11-11', '12:00'));
    await estadoCastigos(deps);
    expect((await rutasConProgreso(deps))[0].exp).toBe(10);
  });

  it('girar, reroll y cumplir desbloquean las misiones', async () => {
    const { deps, mover } = await preparar();
    mover(ec('2026-11-11', '12:00'));
    const { actual } = await estadoCastigos(deps);
    const girado = await girarRuleta(deps, actual!.id);
    expect(girado.texto).toBeTruthy();
    expect((await estadoCastigos(deps)).puedeReroll).toBe(true);

    const otro = await rerollRuleta(deps, actual!.id);
    expect(otro.castigoId).not.toBe(girado.castigoId);
    expect((await estadoCastigos(deps)).puedeReroll).toBe(false);
    await expect(rerollRuleta(deps, actual!.id)).rejects.toThrow();

    await cumplirCastigo(deps, actual!.id);
    const tras = await estadoCastigos(deps);
    expect(tras).toMatchObject({ bloqueado: false, actual: null });
    const practicar = (await misionesDeHoy(deps)).find((m) => m.titulo === 'Practicar tiros')!;
    expect((await completar(deps, practicar.id)).estado).toBe('completada');
  });

  it('el resultado queda guardado: recargar no permite volver a girar', async () => {
    const { deps, mover } = await preparar();
    mover(ec('2026-11-11', '12:00'));
    const { actual } = await estadoCastigos(deps);
    await girarRuleta(deps, actual!.id);
    expect((await estadoCastigos(deps)).actual!.estado).toBe('asignado');
    await expect(girarRuleta(deps, actual!.id)).rejects.toThrow('ya se giró');
  });

  it('días distintos con fallos generan castigos distintos', async () => {
    const { deps, mover } = await preparar();
    mover(ec('2026-11-13', '07:00')); // fallan el 11 y el 12
    const estado = await estadoCastigos(deps);
    expect(estado.pendientes).toBe(2);
    expect(estado.actual!.fecha).toBe('2026-11-11');
  });

  it('sin castigos en la pool, fallar no asigna castigo', async () => {
    const { deps, mover } = await preparar(false);
    mover(ec('2026-11-11', '12:00'));
    expect(await estadoCastigos(deps)).toMatchObject({ bloqueado: false, pendientes: 0 });
  });
});
