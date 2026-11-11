# Formato de misiones para la IA (versión 1)

La app importa misiones desde un JSON. La idea es que una IA lo genere y asigne
la EXP, para que la valoración no dependa de ti.

En la app, pestaña **Importar → Compartir instrucciones para la IA**, obtienes el
mismo texto de abajo con tus rutas actuales ya incluidas. Pégalo en la IA, añade
tus objetivos, y pega su respuesta en el cuadro de importación.

## Ejemplo

```json
{
  "version": 1,
  "rutas": ["Programación"],
  "misiones": [
    {
      "titulo": "Bañarme",
      "tipo": "rutina",
      "ruta": "Baloncesto",
      "exp": 5,
      "hora_limite": "11:00"
    },
    {
      "titulo": "20 flexiones",
      "tipo": "rutina",
      "ruta": "Condición física",
      "exp": 15,
      "hora_limite": "21:00"
    },
    {
      "titulo": "Practicar tiros 30 minutos",
      "descripcion": "Tiros libres y de media distancia",
      "tipo": "objetivo_ruta",
      "ruta": "Baloncesto",
      "exp": 40,
      "hora_limite": "19:00"
    },
    {
      "titulo": "Cocinar el desayuno para la familia",
      "tipo": "algo_bueno",
      "exp": 0,
      "hora_limite": "09:00"
    }
  ]
}
```

## Campos

| Campo | Obligatorio | Formato | Notas |
|---|---|---|---|
| `version` | sí | `1` | Versión del formato. |
| `rutas` | no | lista de textos | Rutas a crear aunque ninguna misión las use aún. |
| `misiones` | sí | lista (1–100) | |
| `titulo` | sí | texto (≤100) | |
| `descripcion` | no | texto (≤500) | |
| `tipo` | sí | `rutina`, `algo_bueno`, `objetivo_ruta` | |
| `ruta` | solo en `objetivo_ruta` | texto | Una ruta por misión. Si no existe, se crea. Sin ruta, la EXP no suma a ninguna ruta. |
| `exp` | sí | entero 0–1000 | La asigna la IA. |
| `hora_limite` | sí | `HH:MM` (24 h, Ecuador) | Pasada esta hora, la misión queda fallida. `11:00` se puede completar hasta 11:00:59. |
| `fecha` | no | `YYYY-MM-DD` | Solo `algo_bueno` y `objetivo_ruta`. Por defecto, hoy. Las rutinas no llevan fecha. |

## Reglas de la importación

- La importación es todo o nada: si hay un error, no se guarda nada y se listan todos los errores.
- Los nombres de ruta no distinguen mayúsculas ni espacios extra (`baloncesto` = `Baloncesto`).
- Una rutina se repite todos los días. Si su hora límite ya pasó el día en que la importas, empieza al día siguiente.
- Una misión con fecha pasada o cuya hora límite ya pasó se rechaza.
- Se acepta el JSON envuelto en un bloque ```` ```json ````, como suelen responder las IAs.
- Los campos desconocidos se ignoran con un aviso.
