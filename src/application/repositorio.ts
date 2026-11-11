import type { Mision, PlantillaRutina, Ruta } from '../domain/tipos';

/** Puerto de persistencia. Lo implementa SQLite en la app y memoria en las pruebas. */
export interface Repositorio {
  listarRutas(): Promise<Ruta[]>;
  guardarRuta(ruta: Ruta): Promise<void>;
  /** Suma de EXP de misiones completadas, por id de ruta. */
  expPorRuta(): Promise<Map<string, number>>;

  listarPlantillasActivas(): Promise<PlantillaRutina[]>;
  archivarPlantilla(id: string): Promise<void>;

  obtenerMision(id: string): Promise<Mision | null>;
  misionesDelDia(fecha: string): Promise<Mision[]>;
  /** Misiones pendientes con fecha menor o igual a la dada. */
  misionesPendientesHasta(fecha: string): Promise<Mision[]>;
  actualizarMision(mision: Mision): Promise<void>;
  eliminarMision(id: string): Promise<void>;

  /** Guarda en una sola transacción el resultado de sincronizar el día. */
  guardarSincronizacion(cambios: {
    nuevas: Mision[];
    generadas: { plantillaId: string; ultimoDiaGenerado: string }[];
    fallidas: string[];
  }): Promise<void>;

  /** Guarda en una sola transacción lo importado. */
  guardarImportacion(plan: { rutas: Ruta[]; plantillas: PlantillaRutina[]; misiones: Mision[] }): Promise<void>;
}
