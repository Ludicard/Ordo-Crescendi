import {
  asignacionesNuevas,
  crearCastigo,
  cumplir,
  girar,
  hayBloqueo,
  puedeReroll,
  reroll,
  type AsignacionCastigo,
  type Azar,
  type Castigo,
} from '../domain/castigos';
import { diaLocal } from '../domain/fechas';
import { analizarImportacion, type ResultadoImportacion } from '../domain/importacion';
import {
  completarMision,
  generarMisionesDePlantilla,
  misionesAFallar,
  ordenarParaMostrar,
} from '../domain/misiones';
import { crearRuta } from '../domain/rutas';
import { ErrorDominio, type GeneradorId, type Mision, type Ruta } from '../domain/tipos';
import type { Repositorio } from './repositorio';

export interface Dependencias {
  repo: Repositorio;
  reloj: () => Date;
  nuevoId: GeneradorId;
  azar: Azar;
}

/**
 * Pone el día al corriente: genera las misiones de rutinas que falten y marca
 * como fallidas las pendientes que ya vencieron, y asigna un castigo (sin girar)
 * a cada día con misiones recién fallidas. Es idempotente.
 */
export async function sincronizarDia({ repo, reloj, nuevoId }: Dependencias): Promise<void> {
  const ahora = reloj();
  const nuevas: Mision[] = [];
  const generadas: { plantillaId: string; ultimoDiaGenerado: string }[] = [];
  for (const p of await repo.listarPlantillasActivas()) {
    const r = generarMisionesDePlantilla(p, ahora, nuevoId);
    if (r.misiones.length > 0 && r.ultimoDiaGenerado) {
      nuevas.push(...r.misiones);
      generadas.push({ plantillaId: p.id, ultimoDiaGenerado: r.ultimoDiaGenerado });
    }
  }
  const pendientes = [...(await repo.misionesPendientesHasta(diaLocal(ahora))), ...nuevas];
  const fallidas = misionesAFallar(pendientes, ahora);
  let asignaciones: AsignacionCastigo[] = [];
  if (fallidas.length) {
    const idsFallidas = new Set(fallidas);
    const fechas = [...new Set(pendientes.filter((m) => idsFallidas.has(m.id)).map((m) => m.fecha))];
    const hayPool = (await repo.listarCastigos()).length > 0;
    asignaciones = asignacionesNuevas(fechas, await repo.fechasConAsignacion(fechas), hayPool, ahora, nuevoId);
  }
  if (nuevas.length || fallidas.length) {
    await repo.guardarSincronizacion({ nuevas, generadas, fallidas, asignaciones });
  }
}

export async function misionesDeHoy(deps: Dependencias): Promise<Mision[]> {
  await sincronizarDia(deps);
  return ordenarParaMostrar(await deps.repo.misionesDelDia(diaLocal(deps.reloj())));
}

export async function completar(deps: Dependencias, misionId: string): Promise<Mision> {
  await sincronizarDia(deps);
  if (hayBloqueo(await deps.repo.asignacionesPendientes())) {
    throw new ErrorDominio('Tienes un castigo pendiente. Cúmplelo para desbloquear las misiones.');
  }
  const m = await deps.repo.obtenerMision(misionId);
  if (!m) throw new ErrorDominio('La misión no existe.');
  const completada = completarMision(m, deps.reloj());
  await deps.repo.actualizarMision(completada);
  return completada;
}

/** Solo se pueden eliminar misiones pendientes (no se borra historial). */
export async function eliminarMisionPendiente({ repo }: Dependencias, misionId: string): Promise<void> {
  const m = await repo.obtenerMision(misionId);
  if (!m) return;
  if (m.estado !== 'pendiente') throw new ErrorDominio('Solo se pueden eliminar misiones pendientes.');
  await repo.eliminarMision(misionId);
}

export interface RutaConProgreso extends Ruta {
  exp: number;
}

export async function rutasConProgreso({ repo }: Dependencias): Promise<RutaConProgreso[]> {
  const [rutas, exp] = await Promise.all([repo.listarRutas(), repo.expPorRuta()]);
  return rutas.map((r) => ({ ...r, exp: exp.get(r.id) ?? 0 }));
}

export async function nuevaRuta({ repo, reloj, nuevoId }: Dependencias, nombre: string): Promise<Ruta> {
  const ruta = crearRuta(nombre, await repo.listarRutas(), reloj(), nuevoId);
  await repo.guardarRuta(ruta);
  return ruta;
}

export async function analizarTextoImportacion(
  { repo, reloj, nuevoId }: Dependencias,
  texto: string,
): Promise<ResultadoImportacion> {
  return analizarImportacion(texto, await repo.listarRutas(), reloj(), nuevoId);
}

/** Vuelve a analizar en el momento de confirmar (la hora pudo cambiar) y guarda. */
export async function importar(deps: Dependencias, texto: string): Promise<ResultadoImportacion> {
  const r = await analizarTextoImportacion(deps, texto);
  if (r.ok) {
    await deps.repo.guardarImportacion({
      rutas: r.plan.rutasNuevas,
      plantillas: r.plan.plantillas,
      misiones: r.plan.misiones,
    });
    await sincronizarDia(deps);
  }
  return r;
}

export async function rutinasActivas({ repo }: Dependencias) {
  return (await repo.listarPlantillasActivas()).sort((a, b) => a.horaLimite.localeCompare(b.horaLimite));
}

/** Deja de generar la rutina. Las misiones ya creadas se conservan. */
export async function archivarRutina({ repo }: Dependencias, plantillaId: string): Promise<void> {
  await repo.archivarPlantilla(plantillaId);
}

// ---------- Castigos ----------

export interface EstadoCastigos {
  /** El castigo a resolver ahora (el más antiguo sin cumplir), o null. */
  actual: AsignacionCastigo | null;
  /** Castigos sin cumplir en total (incluido el actual). */
  pendientes: number;
  bloqueado: boolean;
  puedeReroll: boolean;
  pool: Castigo[];
}

export async function estadoCastigos(deps: Dependencias): Promise<EstadoCastigos> {
  await sincronizarDia(deps);
  const [pendientes, pool] = await Promise.all([deps.repo.asignacionesPendientes(), deps.repo.listarCastigos()]);
  const actual = pendientes[0] ?? null;
  return {
    actual,
    pendientes: pendientes.length,
    bloqueado: hayBloqueo(pendientes),
    puedeReroll: actual ? puedeReroll(actual, pool) : false,
    pool,
  };
}

async function asignacion({ repo }: Dependencias, id: string): Promise<AsignacionCastigo> {
  const a = await repo.obtenerAsignacion(id);
  if (!a) throw new ErrorDominio('El castigo no existe.');
  return a;
}

/** Decide y guarda el resultado antes de que empiece la animación. */
export async function girarRuleta(deps: Dependencias, asignacionId: string): Promise<AsignacionCastigo> {
  const a = girar(await asignacion(deps, asignacionId), await deps.repo.listarCastigos(), deps.azar, deps.reloj());
  await deps.repo.actualizarAsignacion(a);
  return a;
}

export async function rerollRuleta(deps: Dependencias, asignacionId: string): Promise<AsignacionCastigo> {
  const a = reroll(await asignacion(deps, asignacionId), await deps.repo.listarCastigos(), deps.azar, deps.reloj());
  await deps.repo.actualizarAsignacion(a);
  return a;
}

export async function cumplirCastigo(deps: Dependencias, asignacionId: string): Promise<AsignacionCastigo> {
  const a = cumplir(await asignacion(deps, asignacionId), deps.reloj());
  await deps.repo.actualizarAsignacion(a);
  return a;
}

export async function nuevoCastigo({ repo, reloj, nuevoId }: Dependencias, texto: string): Promise<Castigo> {
  const c = crearCastigo(texto, await repo.listarCastigos(), reloj(), nuevoId);
  await repo.guardarCastigo(c);
  return c;
}

/** Quita el castigo de la pool. Los castigos ya asignados conservan su texto. */
export async function quitarCastigo({ repo }: Dependencias, id: string): Promise<void> {
  await repo.archivarCastigo(id);
}
