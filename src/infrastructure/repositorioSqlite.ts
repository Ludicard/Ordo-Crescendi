import type { SQLiteDatabase } from 'expo-sqlite';
import type { Repositorio } from '../application/repositorio';
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
    });
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
