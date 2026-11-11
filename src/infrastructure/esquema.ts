import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Migraciones en orden. Cada una se aplica una sola vez; `PRAGMA user_version`
 * guarda cuántas se aplicaron. Nunca editar una migración ya publicada: añadir otra.
 */
const MIGRACIONES: string[] = [
  `
  CREATE TABLE rutas (
    id TEXT PRIMARY KEY NOT NULL,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    rango TEXT NOT NULL,
    creada_en TEXT NOT NULL
  );
  CREATE TABLE plantillas (
    id TEXT PRIMARY KEY NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    ruta_id TEXT REFERENCES rutas(id),
    exp INTEGER NOT NULL,
    hora_limite TEXT NOT NULL,
    primer_dia TEXT NOT NULL,
    ultimo_dia_generado TEXT,
    archivada INTEGER NOT NULL DEFAULT 0,
    creada_en TEXT NOT NULL
  );
  CREATE TABLE misiones (
    id TEXT PRIMARY KEY NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL,
    ruta_id TEXT REFERENCES rutas(id),
    exp INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    hora_limite TEXT NOT NULL,
    estado TEXT NOT NULL,
    plantilla_id TEXT REFERENCES plantillas(id),
    completada_en TEXT,
    creada_en TEXT NOT NULL,
    UNIQUE (plantilla_id, fecha)
  );
  CREATE INDEX misiones_fecha ON misiones (fecha);
  CREATE INDEX misiones_estado ON misiones (estado, fecha);
  `,
];

export async function migrar(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = fila?.user_version ?? 0;
  while (version < MIGRACIONES.length) {
    const sql = MIGRACIONES[version];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${version + 1}`);
    });
    version++;
  }
}
