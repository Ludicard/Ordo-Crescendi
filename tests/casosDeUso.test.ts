import { describe, expect, it } from 'vitest';
import {
  completar,
  eliminarMisionPendiente,
  importar,
  misionesDeHoy,
  nuevaRuta,
  rutasConProgreso,
  type Dependencias,
} from '../src/application/casosDeUso';
import { RepositorioMemoria } from '../src/infrastructure/repositorioMemoria';
import { ec, ids } from './ayudantes';

function entorno(inicio: Date) {
  let ahora = inicio;
  const repo = new RepositorioMemoria();
  const deps: Dependencias = { repo, reloj: () => ahora, nuevoId: ids() };
  return { repo, deps, mover: (d: Date) => (ahora = d) };
}

const texto = JSON.stringify({
  version: 1,
  misiones: [
    { titulo: 'Bañarme', tipo: 'rutina', ruta: 'Baloncesto', exp: 10, hora_limite: '11:00' },
    { titulo: 'Practicar tiros', tipo: 'objetivo_ruta', ruta: 'Baloncesto', exp: 40, hora_limite: '20:00' },
  ],
});

describe('ciclo ruta → misión → completar → progreso', () => {
  it('importar, completar y ver la EXP de la ruta', async () => {
    const { deps } = entorno(ec('2026-11-11', '08:00'));
    expect((await importar(deps, texto)).ok).toBe(true);

    const hoy = await misionesDeHoy(deps);
    expect(hoy.map((m) => m.titulo)).toEqual(['Bañarme', 'Practicar tiros']);

    await completar(deps, hoy[0].id);
    await completar(deps, hoy[1].id);
    const [ruta] = await rutasConProgreso(deps);
    expect(ruta).toMatchObject({ nombre: 'Baloncesto', rango: 'D', exp: 50 });
  });

  it('las misiones vencidas se marcan fallidas y no suman EXP', async () => {
    const { deps, mover } = entorno(ec('2026-11-11', '08:00'));
    await importar(deps, texto);
    mover(ec('2026-11-11', '12:00'));
    const hoy = await misionesDeHoy(deps);
    const banarse = hoy.find((m) => m.titulo === 'Bañarme')!;
    expect(banarse.estado).toBe('fallida');
    await expect(completar(deps, banarse.id)).rejects.toThrow();
    expect((await rutasConProgreso(deps))[0].exp).toBe(0);
  });

  it('la rutina se regenera al día siguiente y el día anterior queda fallido', async () => {
    const { deps, repo, mover } = entorno(ec('2026-11-11', '08:00'));
    await importar(deps, texto);
    mover(ec('2026-11-13', '07:00'));
    const hoy = await misionesDeHoy(deps);
    expect(hoy.map((m) => m.titulo)).toEqual(['Bañarme']);
    const todas = [...repo.misiones.values()];
    expect(todas.filter((m) => m.titulo === 'Bañarme').map((m) => [m.fecha, m.estado]).sort()).toEqual([
      ['2026-11-11', 'fallida'],
      ['2026-11-12', 'fallida'],
      ['2026-11-13', 'pendiente'],
    ]);
  });

  it('cambiar la plantilla no reescribe misiones ya creadas', async () => {
    const { deps, repo } = entorno(ec('2026-11-11', '08:00'));
    await importar(deps, texto);
    const [p] = repo.plantillas.values();
    repo.plantillas.set(p.id, { ...p, exp: 999 });
    const hoy = await misionesDeHoy(deps);
    expect(hoy.find((m) => m.titulo === 'Bañarme')!.exp).toBe(10);
  });

  it('solo se eliminan misiones pendientes', async () => {
    const { deps, repo } = entorno(ec('2026-11-11', '08:00'));
    await importar(deps, texto);
    const [a, b] = await misionesDeHoy(deps);
    await completar(deps, a.id);
    await expect(eliminarMisionPendiente(deps, a.id)).rejects.toThrow();
    await eliminarMisionPendiente(deps, b.id);
    expect(repo.misiones.has(b.id)).toBe(false);
  });

  it('no se crean rutas duplicadas', async () => {
    const { deps } = entorno(ec('2026-11-11', '08:00'));
    await nuevaRuta(deps, 'Baloncesto');
    await expect(nuevaRuta(deps, '  baloncesto ')).rejects.toThrow('Ya existe');
  });
});
