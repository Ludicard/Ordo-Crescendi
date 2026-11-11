import type { Repositorio } from '../application/repositorio';
import type { AsignacionCastigo, Castigo } from '../domain/castigos';
import { expPorRuta } from '../domain/misiones';
import type { Mision, PlantillaRutina, Ruta } from '../domain/tipos';

/** Implementación en memoria, para pruebas. */
export class RepositorioMemoria implements Repositorio {
  rutas = new Map<string, Ruta>();
  plantillas = new Map<string, PlantillaRutina>();
  misiones = new Map<string, Mision>();
  castigos = new Map<string, Castigo>();
  asignaciones = new Map<string, AsignacionCastigo>();

  async listarRutas() {
    return [...this.rutas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  async guardarRuta(r: Ruta) {
    this.rutas.set(r.id, { ...r });
  }
  async expPorRuta() {
    return expPorRuta([...this.misiones.values()]);
  }
  async listarPlantillasActivas() {
    return [...this.plantillas.values()].filter((p) => !p.archivada).map((p) => ({ ...p }));
  }
  async archivarPlantilla(id: string) {
    const p = this.plantillas.get(id);
    if (p) this.plantillas.set(id, { ...p, archivada: true });
  }
  async obtenerMision(id: string) {
    const m = this.misiones.get(id);
    return m ? { ...m } : null;
  }
  async misionesDelDia(fecha: string) {
    return [...this.misiones.values()].filter((m) => m.fecha === fecha).map((m) => ({ ...m }));
  }
  async misionesPendientesHasta(fecha: string) {
    return [...this.misiones.values()]
      .filter((m) => m.estado === 'pendiente' && m.fecha <= fecha)
      .map((m) => ({ ...m }));
  }
  async actualizarMision(m: Mision) {
    this.misiones.set(m.id, { ...m });
  }
  async eliminarMision(id: string) {
    this.misiones.delete(id);
  }
  async guardarSincronizacion(c: {
    nuevas: Mision[];
    generadas: { plantillaId: string; ultimoDiaGenerado: string }[];
    fallidas: string[];
    asignaciones: AsignacionCastigo[];
  }) {
    for (const m of c.nuevas) this.misiones.set(m.id, { ...m });
    for (const g of c.generadas) {
      const p = this.plantillas.get(g.plantillaId);
      if (p) this.plantillas.set(p.id, { ...p, ultimoDiaGenerado: g.ultimoDiaGenerado });
    }
    for (const id of c.fallidas) {
      const m = this.misiones.get(id);
      if (m && m.estado === 'pendiente') this.misiones.set(id, { ...m, estado: 'fallida' });
    }
    const conCastigo = new Set([...this.asignaciones.values()].map((a) => a.fecha));
    for (const a of c.asignaciones) if (!conCastigo.has(a.fecha)) this.asignaciones.set(a.id, { ...a });
  }
  async listarCastigos() {
    return [...this.castigos.values()].filter((c) => !c.archivado).map((c) => ({ ...c }));
  }
  async guardarCastigo(c: Castigo) {
    this.castigos.set(c.id, { ...c });
  }
  async archivarCastigo(id: string) {
    const c = this.castigos.get(id);
    if (c) this.castigos.set(id, { ...c, archivado: true });
  }
  async asignacionesPendientes() {
    return [...this.asignaciones.values()]
      .filter((a) => a.estado !== 'cumplido')
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((a) => ({ ...a }));
  }
  async fechasConAsignacion(fechas: string[]) {
    const todas = new Set([...this.asignaciones.values()].map((a) => a.fecha));
    return new Set(fechas.filter((f) => todas.has(f)));
  }
  async obtenerAsignacion(id: string) {
    const a = this.asignaciones.get(id);
    return a ? { ...a } : null;
  }
  async actualizarAsignacion(a: AsignacionCastigo) {
    this.asignaciones.set(a.id, { ...a });
  }
  async guardarImportacion(plan: { rutas: Ruta[]; plantillas: PlantillaRutina[]; misiones: Mision[] }) {
    plan.rutas.forEach((r) => this.rutas.set(r.id, { ...r }));
    plan.plantillas.forEach((p) => this.plantillas.set(p.id, { ...p }));
    plan.misiones.forEach((m) => this.misiones.set(m.id, { ...m }));
  }
}
