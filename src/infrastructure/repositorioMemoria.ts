import type { Repositorio } from '../application/repositorio';
import { expPorRuta } from '../domain/misiones';
import type { Mision, PlantillaRutina, Ruta } from '../domain/tipos';

/** Implementación en memoria, para pruebas. */
export class RepositorioMemoria implements Repositorio {
  rutas = new Map<string, Ruta>();
  plantillas = new Map<string, PlantillaRutina>();
  misiones = new Map<string, Mision>();

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
  }
  async guardarImportacion(plan: { rutas: Ruta[]; plantillas: PlantillaRutina[]; misiones: Mision[] }) {
    plan.rutas.forEach((r) => this.rutas.set(r.id, { ...r }));
    plan.plantillas.forEach((p) => this.plantillas.set(p.id, { ...p }));
    plan.misiones.forEach((m) => this.misiones.set(m.id, { ...m }));
  }
}
