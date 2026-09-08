# Koinonia e-League — Home desktop

Proyecto independiente React + Vite. No utiliza archivos, estilos, componentes ni API del frontend anterior.

## Ejecutar

```sh
pnpm install
pnpm dev
```

Abre http://127.0.0.1:5174. El frontend anterior conserva su puerto 5173.

```sh
pnpm build
pnpm preview
```

## Alcance

La primera etapa incluye Inicio, listado de equipos y ficha de equipo conectados a Cheeto API v1. El resto del menú se implementará por fases.

El navegador consume `/api`; Vite reenvía esas solicitudes al gateway local de `api-proxy.mjs`. La llave se agrega en el gateway y no se incorpora al bundle del frontend. El gateway acepta GET, POST, PATCH, PUT y DELETE, conserva query strings y cuerpos JSON, y normaliza los fallos de red.

La composición desktop se diseña sobre un lienzo de 1536 × 1024 y se escala proporcionalmente al ancho de la ventana.

La identidad visual desktop conserva el lienzo de referencia de 1536 × 1024. Bajo 900 px la interfaz cambia a una composición responsive: menú, contenido y paneles laterales se apilan; bajo 560 px también se reorganizan artículos, fichas y planteles. La navegación usa rutas hash para funcionar en hosting estático y permitir enlaces directos sin configuración adicional del servidor.

El código se organiza por responsabilidades en `src/app`, `src/components` y `src/features`. Las secciones que todavía no consumen endpoints cuentan con una ruta y una pantalla preparada, sin botones inactivos.

Las consultas públicas de Cheeto API v1 están centralizadas en `src/api/endpoints.js`. Resultados, partidos, clasificación, rankings, clubes, jugadores, selecciones, torneos, actividad y mercado cuentan con vistas de lectura, filtros y estados de carga/error. Si una ruta documentada todavía no está publicada por el backend, la interfaz lo indica y permite reintentar sin afectar las demás secciones.

La tercera etapa habilita la gestión pública definida por la API: creación y edición de equipos, créditos y débitos de presupuesto, vinculación con Discord, edición individual y orden masivo del plantel, además de creación, asignación y liberación de selecciones. Después de cada operación exitosa, las vistas relacionadas vuelven a consultar los datos. Las acciones destructivas o financieras muestran una confirmación antes de enviarse.

La cuarta etapa incorpora las operaciones de jugadores y mercado: alta, asignación, compra y liberación de futbolistas; creación, aprobación, rechazo y reversa de transferencias; y creación, aprobación y rechazo de trueques. Los formularios utilizan los equipos y jugadores publicados por la API y solicitan confirmación antes de cualquier movimiento financiero o cambio de estado del mercado.

La quinta etapa agrega la administración integral de torneos: creación y cambio de estado, eliminación forzada, participantes, sorteo de grupos, generación de fixtures, llaves y avance de rondas, cuartos de copa, octavos de mundial, inicialización de divisiones, ascensos y movimientos divisionales. Las acciones estructurales piden confirmación y refrescan el torneo, la tabla, la llave y el fixture al completarse.

La sexta etapa completa partidos y actas: creación manual de encuentros, inicio, finalización, cancelación y reapertura; carga de resultados, goles y tarjetas rojas; eliminación de goles y definición del ganador, incluida la modalidad de promoción. La gestión se abre desde la ficha de cada partido y actualiza tanto el acta como el listado al finalizar una operación.

La séptima etapa cierra la integración con controles operativos: indicador de salud de la API con actualización periódica y manual, recuperación ante errores inesperados de render, cancelación segura de consultas y mutaciones al abandonar una vista, bloqueo de envíos duplicados y una prueba de humo de solo lectura para todas las rutas públicas. `pnpm check` compila la aplicación y ejecuta esa auditoría sin modificar datos.

## Recursos

`public/stadium-background.jpeg` es el fondo principal proporcionado por el usuario. `public/reference-art.png` conserva los recortes gráficos del boceto que se reutilizan como atlas: fotografía, retratos y escudos. Encima se construyen menú, artículos, tablas, marca y controles con React y CSS. Los textos de muestra no corresponden a datos deportivos actuales. Las fuentes Anton, Oswald y Roboto Condensed se cargan desde Google Fonts.

## Configuración de API

Copia `.env.example` como `.env` y completa `API_BASE_URL` y `API_KEY`. Si `API_BASE_URL` termina en `/v1`, las rutas del cliente se escriben sin repetir ese prefijo; `/api/health` se dirige correctamente a `/health`.

Dependencias: React, React DOM y Vite. El gateway usa únicamente APIs incluidas en Node.js.
