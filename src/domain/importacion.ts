/**
 * Importación de misiones desde JSON (pensado para que lo genere una IA).
 * El formato está documentado en docs/formato-misiones.md.
 */
import { diaLocal, esFechaValida, esHoraValida } from './fechas';
import { estaVencida, primerDiaDePlantilla } from './misiones';
import { claveNombreRuta, crearRuta } from './rutas';
import {
  ErrorDominio,
  TIPOS_MISION,
  type GeneradorId,
  type Mision,
  type PlantillaRutina,
  type Ruta,
  type TipoMision,
} from './tipos';

export const VERSION_FORMATO = 1;
export const EXP_MAXIMA = 1000;
export const LONGITUD_MAX_TITULO = 100;
export const LONGITUD_MAX_DESCRIPCION = 500;
export const MAX_MISIONES_POR_IMPORTACION = 100;

export interface PlanImportacion {
  rutasNuevas: Ruta[];
  plantillas: PlantillaRutina[];
  misiones: Mision[];
  avisos: string[];
}

export type ResultadoImportacion =
  | { ok: true; plan: PlanImportacion }
  | { ok: false; errores: string[] };

/** Quita los bloques ```json ... ``` que las IAs suelen añadir. */
function extraerJson(texto: string): string {
  const t = texto.trim();
  const bloque = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return bloque ? bloque[1] : t;
}

/**
 * Al copiar desde un chat, el texto suele llegar con formato Markdown escapado
 * (`\[`, `\]`, `\_`...) o con comillas tipográficas. Se intenta el JSON tal cual
 * y, si falla, se repara eso y se reintenta. Si tampoco funciona, se lanza el
 * error del texto original.
 */
function parsearTolerante(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch (original) {
    const reparado = texto
      // Quita la barra de escapes que JSON no admite; respeta \" \\ \/ \b \f \n \r \t \u.
      .replace(/\\(.)/g, (todo, c: string) => ('"\\/bfnrtu'.includes(c) ? todo : c))
      .replace(/[“”]/g, '"')
      .replace(/ /g, ' ');
    try {
      return JSON.parse(reparado);
    } catch {
      throw original;
    }
  }
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const CAMPOS_MISION = new Set(['titulo', 'descripcion', 'tipo', 'ruta', 'exp', 'hora_limite', 'fecha']);

export function analizarImportacion(
  texto: string,
  rutasExistentes: readonly Ruta[],
  ahora: Date,
  nuevoId: GeneradorId,
): ResultadoImportacion {
  let datos: unknown;
  try {
    datos = parsearTolerante(extraerJson(texto));
  } catch (e) {
    const detalle = e instanceof Error ? ` (${e.message})` : '';
    return {
      ok: false,
      errores: [`El texto no es JSON válido${detalle}. Pide a la IA que responda solo con el JSON en un bloque de código.`],
    };
  }
  if (!esObjeto(datos)) return { ok: false, errores: ['El JSON debe ser un objeto { "version", "misiones" }.'] };
  if (datos.version !== VERSION_FORMATO) {
    return { ok: false, errores: [`"version" debe ser ${VERSION_FORMATO}.`] };
  }

  const errores: string[] = [];
  const avisos: string[] = [];
  const hoy = diaLocal(ahora);
  const creadaEn = ahora.toISOString();

  // Rutas: existentes + declaradas + referenciadas por misiones.
  const rutasPorClave = new Map(rutasExistentes.map((r) => [claveNombreRuta(r.nombre), r]));
  const rutasNuevas: Ruta[] = [];
  const resolverRuta = (nombre: string, donde: string): Ruta | null => {
    const existente = rutasPorClave.get(claveNombreRuta(nombre));
    if (existente) return existente;
    try {
      const r = crearRuta(nombre, [...rutasPorClave.values()], ahora, nuevoId);
      rutasPorClave.set(claveNombreRuta(r.nombre), r);
      rutasNuevas.push(r);
      return r;
    } catch (e) {
      errores.push(`${donde}: ${e instanceof ErrorDominio ? e.message : String(e)}`);
      return null;
    }
  };

  if (datos.rutas !== undefined) {
    if (!Array.isArray(datos.rutas)) errores.push('"rutas" debe ser una lista de nombres.');
    else
      datos.rutas.forEach((n, i) => {
        if (typeof n !== 'string') errores.push(`rutas[${i}]: debe ser texto.`);
        else resolverRuta(n, `rutas[${i}]`);
      });
  }

  if (!Array.isArray(datos.misiones) || datos.misiones.length === 0) {
    errores.push('"misiones" debe ser una lista con al menos una misión.');
    return { ok: false, errores };
  }
  if (datos.misiones.length > MAX_MISIONES_POR_IMPORTACION) {
    errores.push(`Como máximo ${MAX_MISIONES_POR_IMPORTACION} misiones por importación.`);
    return { ok: false, errores };
  }

  const plantillas: PlantillaRutina[] = [];
  const misiones: Mision[] = [];

  datos.misiones.forEach((crudo, i) => {
    const donde = `misiones[${i}]`;
    if (!esObjeto(crudo)) {
      errores.push(`${donde}: debe ser un objeto.`);
      return;
    }
    const err = (msg: string) => errores.push(`${donde}: ${msg}`);
    const antes = errores.length;

    for (const k of Object.keys(crudo)) {
      if (!CAMPOS_MISION.has(k)) avisos.push(`${donde}: se ignora el campo desconocido "${k}".`);
    }

    const titulo = typeof crudo.titulo === 'string' ? crudo.titulo.trim() : '';
    if (!titulo) err('"titulo" es obligatorio.');
    else if (titulo.length > LONGITUD_MAX_TITULO) err(`"titulo" admite como máximo ${LONGITUD_MAX_TITULO} caracteres.`);

    let descripcion = '';
    if (crudo.descripcion !== undefined) {
      if (typeof crudo.descripcion !== 'string') err('"descripcion" debe ser texto.');
      else if (crudo.descripcion.length > LONGITUD_MAX_DESCRIPCION)
        err(`"descripcion" admite como máximo ${LONGITUD_MAX_DESCRIPCION} caracteres.`);
      else descripcion = crudo.descripcion.trim();
    }

    const tipo = crudo.tipo as TipoMision;
    if (!TIPOS_MISION.includes(tipo)) err(`"tipo" debe ser uno de: ${TIPOS_MISION.join(', ')}.`);

    const exp = crudo.exp;
    if (typeof exp !== 'number' || !Number.isInteger(exp) || exp < 0 || exp > EXP_MAXIMA) {
      err(`"exp" debe ser un entero entre 0 y ${EXP_MAXIMA}.`);
    }

    const horaLimite = crudo.hora_limite;
    if (typeof horaLimite !== 'string' || !esHoraValida(horaLimite)) {
      err('"hora_limite" es obligatoria con formato "HH:MM" (24 h, hora de Ecuador).');
    }

    let rutaId: string | null = null;
    if (crudo.ruta !== undefined && crudo.ruta !== null) {
      if (typeof crudo.ruta !== 'string' || !crudo.ruta.trim()) err('"ruta" debe ser un nombre de ruta.');
      else rutaId = resolverRuta(crudo.ruta, donde)?.id ?? null;
    } else if (tipo === 'objetivo_ruta') {
      err('las misiones "objetivo_ruta" necesitan "ruta".');
    }

    let fecha = hoy;
    if (crudo.fecha !== undefined) {
      if (tipo === 'rutina') err('las rutinas se repiten cada día y no llevan "fecha".');
      else if (typeof crudo.fecha !== 'string' || !esFechaValida(crudo.fecha)) err('"fecha" debe tener formato "YYYY-MM-DD".');
      else fecha = crudo.fecha;
    }

    if (errores.length > antes) return;
    if (rutaId === null && (exp as number) > 0) {
      avisos.push(`${donde}: "${titulo}" no tiene ruta; su EXP no se sumará a ninguna ruta.`);
    }

    if (tipo === 'rutina') {
      const primerDia = primerDiaDePlantilla(horaLimite as string, ahora);
      if (primerDia !== hoy) avisos.push(`${donde}: la hora límite de "${titulo}" ya pasó hoy; empieza mañana.`);
      plantillas.push({
        id: nuevoId(),
        titulo,
        descripcion,
        rutaId,
        exp: exp as number,
        horaLimite: horaLimite as string,
        primerDia,
        ultimoDiaGenerado: null,
        archivada: false,
        creadaEn,
      });
    } else {
      if (fecha < hoy || estaVencida({ fecha, horaLimite: horaLimite as string }, ahora)) {
        err(`"${titulo}" ya venció (${fecha} ${horaLimite}).`);
        return;
      }
      misiones.push({
        id: nuevoId(),
        titulo,
        descripcion,
        tipo,
        rutaId,
        exp: exp as number,
        fecha,
        horaLimite: horaLimite as string,
        estado: 'pendiente',
        plantillaId: null,
        completadaEn: null,
        creadaEn,
      });
    }
  });

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, plan: { rutasNuevas, plantillas, misiones, avisos } };
}
