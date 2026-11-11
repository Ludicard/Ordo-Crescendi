import { EXP_MAXIMA, MAX_MISIONES_POR_IMPORTACION, VERSION_FORMATO } from '../domain/importacion';

/**
 * Texto para pegar en una IA y que genere misiones en el formato que la app importa.
 * Incluye las rutas existentes para que la IA las reutilice con el mismo nombre.
 */
export function instruccionesParaIA(rutasExistentes: readonly string[], hoy: string): string {
  const rutas = rutasExistentes.length
    ? rutasExistentes.map((r) => `- ${r}`).join('\n')
    : '(todavía no hay rutas; puedes proponer nuevas)';
  return `Eres el "Sistema" de Ordo Crescendi, una app de desarrollo personal gamificada.
Genera mis misiones y asigna tú la EXP de cada una según el progreso real que aporta
(no por cantidad de tareas: una acción difícil y significativa vale más que una trivial).

Responde SOLO con un JSON válido dentro de un único bloque de código \`\`\`json, sin texto adicional
(así se copia sin formato), con esta forma:

{
  "version": ${VERSION_FORMATO},
  "rutas": ["Nombre de ruta"],
  "misiones": [
    {
      "titulo": "texto corto",
      "descripcion": "opcional",
      "tipo": "rutina | algo_bueno | objetivo_ruta",
      "ruta": "Nombre de ruta (opcional salvo en objetivo_ruta)",
      "exp": 0,
      "hora_limite": "HH:MM",
      "fecha": "YYYY-MM-DD (solo algo_bueno y objetivo_ruta; opcional)"
    }
  ]
}

Reglas:
- "version" siempre es ${VERSION_FORMATO}.
- "tipo":
  - "rutina": actividad que se repite todos los días (ej. "Bañarme", "20 flexiones"). NO lleva "fecha".
  - "algo_bueno": acción de valor para otros (ej. "Cocinar el desayuno para la familia").
  - "objetivo_ruta": acción ligada a una ruta (ej. "Practicar tiros 30 minutos"). "ruta" es obligatoria.
- "ruta": como máximo una por misión. Usa exactamente el nombre de una ruta existente si encaja.
  Si usas una ruta nueva, se creará. Una misión sin ruta no suma EXP a ninguna ruta.
- "exp": entero entre 0 y ${EXP_MAXIMA}.
- "hora_limite": hora máxima para completarla, formato 24 h "HH:MM" (00:00 a 23:59), hora de Ecuador.
  Ej. "Bañarme" hasta las 11 de la mañana → "11:00".
- "fecha": día de la misión. Si se omite, es hoy (${hoy}). No uses fechas pasadas.
- "rutas" (opcional): rutas nuevas a crear aunque ninguna misión las use todavía.
- Máximo ${MAX_MISIONES_POR_IMPORTACION} misiones. "titulo" hasta 100 caracteres; "descripcion" hasta 500.

Mis rutas actuales:
${rutas}

Mis objetivos y contexto:
[ESCRIBE AQUÍ TUS OBJETIVOS, HORARIOS Y LO QUE QUIERES TRABAJAR]`;
}
