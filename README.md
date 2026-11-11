# Ordo Crescendi

App móvil personal de desarrollo personal gamificada, inspirada en Solo Leveling.

## Estado: MVP

El ciclo es ruta → misión → completar → progreso visible.

- **Rutas**, cada una con su rango (todas empiezan en D) y su EXP acumulada.
- **Misiones** de tres tipos: `rutina` (se repite cada día), `algo_bueno` y `objetivo_ruta`.
- Cada misión tiene una **hora límite**. Si pasa sin completarse, la misión queda **fallida**
  y no suma EXP. El día cambia a medianoche, hora de Ecuador (UTC-5).
- Las misiones se **importan desde un JSON** generado por una IA, que también asigna la EXP.
  El formato está en [docs/formato-misiones.md](docs/formato-misiones.md).

Fuera de este MVP: ascenso de rango, atributos, feats, castigos, día mínimo, puntos de
recompensa, días de descanso y cartas.

## Ejecutar

```bash
npm install
npx expo start
```

Abre la app con **Expo Go** en el móvil escaneando el código QR.

```bash
npm test          # pruebas del dominio y los casos de uso
npm run typecheck # comprobación de tipos
```

## Arquitectura

Es un monolito modular, local en el móvil (SQLite) y sin servidor.

```
src/
  domain/          Reglas puras, sin BD ni UI: fechas, misiones, rutas, importación.
  application/     Casos de uso y el puerto Repositorio.
  infrastructure/  SQLite (esquema y migraciones) y repositorio en memoria para pruebas.
  ui/              Tema, componentes y hooks compartidos.
  app/             Pantallas (Expo Router): Misiones, Rutas, Importar.
tests/             Pruebas con Vitest.
```

Decisiones:
- Los IDs los genera la app (UUID v4).
- Las fechas se guardan como día local `YYYY-MM-DD` y las horas como `HH:MM`.
- La EXP, la hora límite y la ruta se **copian en cada misión** al crearla, así que cambiar una
  rutina no reescribe el pasado.
- La EXP de una ruta se calcula desde los datos: es la suma de sus misiones completadas.
- Una misión `11:00` se puede completar hasta las 11:00:59.
- Si la app no se abre algunos días, al abrirla se crean las rutinas de esos días y quedan fallidas.
- Una rutina importada después de su hora límite empieza al día siguiente.
