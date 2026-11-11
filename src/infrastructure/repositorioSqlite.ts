import type { SQLiteDatabase } from 'expo-sqlite';
import type { Repositorio } from '../application/repositorio';
import type { AsignacionCastigo, Castigo, EstadoAsignacion } from '../domain/castigos';
import type { EstadoMision, Mision, PlantillaRutina, Rango, Ruta, TipoMision } from '../domain/tipos';

interface FilaRuta { id: string; nombre: string; rango: string; creada_en: string }
interface FilaPlantilla {
  id: string; titulo: string; descripcion: string; ruta_id: string | null; exp: number; hora_limite: string;
  primer_dia: string; ultimo_dia_generado: string | null; archivada: number; creada_en: string;
}
interface FilaMision {
  id: string; titulo: string; descripcion: string; tipo: string; ruta_id: string | null; exp: number; fecha: string;
  hora_limite: string; estado: string; plantilla_id: string | null; completada_en: string | null; creada_en: string;
}

const aRuta = (f: FilaRuta): Ruta => ({ id: f.id, nombre: f.nombre, rango: f.rango as Rango, creadaEn: f.creada_en });
const aPlantilla = (f: FilaPlantilla): PlantillaRutina => ({
  id: f.id, titulo: f.titulo, descripcion: f.descripcion, rutaId: f.ruta_id, exp: f.exp, horaLimite: f.hora_limite,
  primerDia: f.primer_dia, ultimoDiaGenerado: f.ultimo_dia_generado, archivada: f.archivada === 1, creadaEn: f.creada_en,
});
const aMision = (f: FilaMision): Mision => ({
  id: f.id, titulo: f.titulo, descripcion: f.descripcion, tipo: f.tipo as TipoMision, rutaId: f.ruta_id, exp: f.exp,
  fecha: f.fecha, horaLimite: f.hora_limite, estado: f.estado as EstadoMision, plantillaId: f.plantilla_id,
  completadaEn: f.completada_en, creadaEn: f.creada_en,
});

interface FilaCastigo { id: string; texto: string; archivado: number; creado_en: string }
interface FilaAsignacion {
  id: string; fecha: string; estado: string; castigo_id: string | null; texto: string | null; reroll_usado: number;
  creada_en: string; girada_en: string | null; cumplida_en: string | null;
}
const aCastigo = (f: FilaCastigo): Castigo => ({ id: f.id, texto: f.texto, archivado: f.archivado === 1, creadoEn: f.creado_en });
const aAsignacion = (f: FilaAsignacion): AsignacionCastigo => ({
  id: f.id, fecha: f.fecha, estado: f.estado as EstadoAsignacion, castigoId: f.castigo_id, texto: f.texto,
  rerollUsado: f.reroll_usado === 1, creadaEn: f.creada_en, giradaEn: f.girada_en, cumplidaEn: f.cumplida_en,
});

export class RepositorioSqlite implements Repositorio {
  constructor(private readonly db: SQLiteDatabase) {}

  async listarRutas() {
    const filas = await this.db.getAllAsync<FilaRuta>('SELECT * FROM rutas ORDER BY nombre COLLATE NOCASE');
    return filas.map(aRuta);
  }

  async guardarRuta(r: Ruta) {
    await this.insertarRuta(r);
  }

  async expPorRuta() {
    const filas = await this.db.getAllAsync<{ ruta_id: string; total: number }>(
      `SELECT ruta_id, SUM(exp) AS total FROM misiones
       WHERE estado = 'completada' AND ruta_id IS NOT NULL GROUP BY ruta_id`,
    );
    return new Map(filas.map((f) => [f.ruta_id, f.total]));
  }

  async listarPlantillasActivas() {
    const filas = await this.db.getAllAsync<FilaPlantilla>('SELECT * FROM plantillas WHERE archivada = 0');
    return filas.map(aPlantilla);
  }

  async archivarPlantilla(id: string) {
    await this.db.runAsync('UPDATE plantillas SET archivada = 1 WHERE id = ?', id);
  }

  async obtenerMision(id: string) {
    const f = await this.db.getFirstAsync<FilaMision>('SELECT * FROM misiones WHERE id = ?', id);
    return f ? aMision(f) : null;
  }

  async misionesDelDia(fecha: string) {
    const filas = await this.db.getAllAsync<FilaMision>('SELECT * FROM misiones WHERE fecha = ?', fecha);
    return filas.map(aMision);
  }

  async misionesPendientesHasta(fecha: string) {
    const filas = await this.db.getAllAsync<FilaMision>(
      `SELECT * FROM misiones WHERE estado = 'pendiente' AND fecha <= ?`,
      fecha,
    );
    return filas.map(aMision);
  }

  async actualizarMision(m: Mision) {
    await this.db.runAsync(
      'UPDATE misiones SET estado = ?, completada_en = ? WHERE id = ?',
      m.estado,
      m.completadaEn,
      m.id,
    );
  }

  async eliminarMision(id: string) {
    await this.db.runAsync(`DELETE FROM misiones WHERE id = ? AND estado = 'pendiente'`, id);
  }

  async guardarSincronizacion(c: {
    nuevas: Mision[];
    generadas: { plantillaId: string; ultimoDiaGenerado: string }[];
    fallidas: string[];
    asignaciones: AsignacionCastigo[];
  }) {
    await this.db.withTransactionAsync(async () => {
      for (const m of c.nuevas) await this.insertarMision(m);
      for (const g of c.generadas) {
        await this.db.runAsync(
          'UPDATE plantillas SET ultimo_dia_generado = ? WHERE id = ?',
          g.ultimoDiaGenerado,
          g.plantillaId,
        );
      }
      for (const id of c.fallidas) {
        await this.db.runAsync(`UPDATE misiones SET estado = 'fallida' WHERE id = ? AND estado = 'pendiente'`, id);
      }
      for (const a of c.asignaciones) {
        // OR IGNORE + UNIQUE(fecha): como máximo un castigo por día.
        await this.db.runAsync(
          `INSERT OR IGNORE INTO asignaciones_castigo (id, fecha, estado, castigo_id, texto, reroll_usado,
             creada_en, girada_en, cumplida_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          a.id, a.fecha, a.estado, a.castigoId, a.texto, a.rerollUsado ? 1 : 0, a.creadaEn, a.giradaEn, a.cumplidaEn,
        );
      }
    });
  }

  async listarCastigos() {
    const filas = await this.db.getAllAsync<FilaCastigo>(
      'SELECT * FROM castigos WHERE archivado = 0 ORDER BY texto COLLATE NOCASE',
    );
    return filas.map(aCastigo);
  }

  async guardarCastigo(c: Castigo) {
    await this.db.runAsync(
      'INSERT INTO castigos (id, texto, archivado, creado_en) VALUES (?, ?, ?, ?)',
      c.id, c.texto, c.archivado ? 1 : 0, c.creadoEn,
    );
  }

  async archivarCastigo(id: string) {
    await this.db.runAsync('UPDATE castigos SET archivado = 1 WHERE id = ?', id);
  }

  async asignacionesPendientes() {
    const filas = await this.db.getAllAsync<FilaAsignacion>(
      `SELECT * FROM asignaciones_castigo WHERE estado != 'cumplido' ORDER BY fecha`,
    );
    return filas.map(aAsignacion);
  }

  async fechasConAsignacion(fechas: string[]) {
    if (fechas.length === 0) return new Set<string>();
    const filas = await this.db.getAllAsync<{ fecha: string }>(
      `SELECT fecha FROM asignaciones_castigo WHERE fecha IN (${fechas.map(() => '?').join(', ')})`,
      fechas,
    );
    return new Set(filas.map((f) => f.fecha));
  }

  async obtenerAsignacion(id: string) {
    const f = await this.db.getFirstAsync<FilaAsignacion>('SELECT * FROM asignaciones_castigo WHERE id = ?', id);
    return f ? aAsignacion(f) : null;
  }

  async actualizarAsignacion(a: AsignacionCastigo) {
    await this.db.runAsync(
      `UPDATE asignaciones_castigo SET estado = ?, castigo_id = ?, texto = ?, reroll_usado = ?, girada_en = ?,
         cumplida_en = ? WHERE id = ?`,
      a.estado, a.castigoId, a.texto, a.rerollUsado ? 1 : 0, a.giradaEn, a.cumplidaEn, a.id,
    );
  }

  async guardarImportacion(plan: { rutas: Ruta[]; plantillas: PlantillaRutina[]; misiones: Mision[] }) {
    await this.db.withTransactionAsync(async () => {
      for (const r of plan.rutas) await this.insertarRuta(r);
      for (const p of plan.plantillas) {
        await this.db.runAsync(
          `INSERT INTO plantillas (id, titulo, descripcion, ruta_id, exp, hora_limite, primer_dia,
             ultimo_dia_generado, archivada, creada_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          p.id, p.titulo, p.descripcion, p.rutaId, p.exp, p.horaLimite, p.primerDia,
          p.ultimoDiaGenerado, p.archivada ? 1 : 0, p.creadaEn,
        );
      }
      for (const m of plan.misiones) await this.insertarMision(m);
    });
  }

  private async insertarRuta(r: Ruta) {
    await this.db.runAsync(
      'INSERT INTO rutas (id, nombre, rango, creada_en) VALUES (?, ?, ?, ?)',
      r.id, r.nombre, r.rango, r.creadaEn,
    );
  }

  private async insertarMision(m: Mision) {
    // OR IGNORE: si una sincronización concurrente ya creó la misión de ese día, no se duplica.
    await this.db.runAsync(
      `INSERT OR IGNORE INTO misiones (id, titulo, descripcion, tipo, ruta_id, exp, fecha, hora_limite, estado,
         plantilla_id, completada_en, creada_en) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      m.id, m.titulo, m.descripcion, m.tipo, m.rutaId, m.exp, m.fecha, m.horaLimite, m.estado,
      m.plantillaId, m.completadaEn, m.creadaEn,
    );
  }
}
