# Arquitectura de la web: navegación, avisos y sistema de diseño

Resultado del rediseño por fases (1 a 8). Las reglas de negocio no cambiaron: solo dónde vive cada cosa y cómo se avisa.

## 1. Mapa de navegación

Menú principal (`src/app/navigation.js`): **Inicio · Partidos · Torneos · Equipos · Jugadores · Mercado**, más **Mi club** (si tienes club) y **Admin** (si eres admin). `activeNavigationPath` decide qué ítem se ilumina en cada ruta.

| Área | Rutas | Notas |
|---|---|---|
| Inicio | `/`, `/noticias`, `/noticias/:id` | Las noticias viven en Inicio; "Noticias" también en el pie y en el menú de cuenta |
| Partidos | `/partidos[/jugados\|pendientes\|calendario]`, `/partidos/:id`, `/sanciones`, `/marcador/:id` | Sanciones es un botón del Centro de partidos |
| Torneos | `/torneos?torneo=&vista=tabla\|goleadores\|playoffs`, `/calculadora` | Barra propia (Torneos · Calculadora). El torneo y la vista quedan en el enlace |
| Equipos | `/equipos`, `/equipos/estadios\|rankings\|plantillas\|presupuestos\|presidentes\|directores-tecnicos\|emblemas\|selecciones`, fichas de clubes ajenos | `LeagueSectionTabs` muestra la barra de Equipos; Estadios es el catálogo global (comprar, cambiar, vender, fotos) |
| Jugadores | `/equipos/jugadores[/importar]`, `/jugadores/:id`, `/efootball/:id` | |
| Mercado | `/transferencias?tab=subastas\|encuestas\|ofertas\|venta\|historial&id=` | `tab` e `id` los respeta el enlace de los avisos |
| Mi club | `/equipos/:miClubId?tab=` | Central y seis secciones (ver §2) |
| Admin | `/admin?tab=personas\|torneos\|mercado\|vida\|atajos[&id=]`, alias `/personas` | Sala de control. Las pestañas viejas (equipos, jugadores, partidos, noticias) caen en Clubes y atajos |
| Cuenta | `/notificaciones?tab=avisos\|preferencias`, `/reglas` | Menú de cuenta y pie |

## 2. Mi club frente a la ficha pública

`TeamDetailPage` muestra una u otra según quién mira (`ownerMode`):

- **Presidente de ese club → Mi club** (abre en Central): CENTRAL · EQUIPO (Resumen | Partidos | Tabla | Clásico | Historia, con los fichajes) · PLANTEL · FINANZAS (Contratos y nómina | Caja | Simulador) · ESTADIO (Estadio y taquilla | Eventos | Derechos de TV) · SEGUIMIENTO · BANDEJA. Comprar o cambiar de estadio se hace en Equipos › Estadios.
- **Cualquier otra persona → ficha pública**: Resumen · Plantel · Partidos · Tabla · Clásico · Historia (con los fichajes) · Nómina (solo lectura) · Estadio (hinchada y taquilla, sin el negocio).
- **Admin en un club ajeno** ve la ficha del presi, con un aviso arriba de que actúa por él y que todo queda registrado a su nombre.

El id de la pestaña en la URL es siempre la "hoja" (`central`, `nomina`, `finanzas`, `seguimiento`, `fichajes`, `bandeja`, `resumen`, `partidos`, `tabla`, `historia`, `estadio`, `eventos`, `tv`, `clasico`, `plantel`); la sección se deduce de ella. Los enlaces viejos siguen funcionando: `catalogo` cae en `estadio`, `fichajes` en `historia` y `auspicio` en `tv`.

## 3. Qué vivía dónde → dónde vive ahora

| Antes | Ahora |
|---|---|
| Calculadora en el menú | Torneos > Calculadora |
| Comprar estadio dentro de Mi club | Equipos > Estadios (catálogo global con fotos) |
| Fichajes en Mi club > Mercado | Equipo > Historia (igual que la ficha pública) |
| Hacer oferta solo desde Mercado | También desde la ficha del jugador (abre el formulario con él elegido); ahí también se le sigue |
| Equipos y Jugadores como entradas separadas del menú | Clubes dentro de Torneos; Jugadores sigue en el menú |
| Noticias y Reglas en el menú | Pie de página y menú de cuenta |
| Rutas sin menú (plantillas, presupuestos, presidentes, DTs, emblemas, rankings, sanciones) | Barra de Torneos (y botón en Partidos) |
| Nómina, Simulador de presupuesto, PitchBoard simulado | Mi club > Finanzas (Contratos y nómina \| Simulador de plantel \| Simulador de contratos) |
| Objetivos de la directiva dentro de la Bandeja | Central |
| Editor de estadio de texto libre en Resumen | Se quitó: el estadio se elige en la tienda (Estadio) |
| ⚙ Gestionar mercado, 🧪 Simulador de subastas | Admin > Mercado |
| + Crear torneo, Gestionar torneo, Premios | Admin > Torneos |
| + Crear equipo | Admin > Equipos |
| Personas y permisos (solo en el menú de cuenta) | Admin > Personas (`/personas` sigue andando) |
| Las 11 pestañas del presi | Seis secciones con sub-vistas |

## 4. Catálogo de avisos

Todo pasa por `notify()` (backend `src/core/notifications.js`): una fila en `notifications` con categoría, prioridad, enlace y clave de deduplicación. La web la ve en la campana, el bot la manda por DM y el navegador la hace sonar, según las preferencias de cada persona (`/notificaciones?tab=preferencias`).

| Evento | Categoría | Quién | Enlace | Sonido |
|---|---|---|---|---|
| Carta de un jugador (por vencer, vencido, descontento, pide sueldo, quiere salir) | contracts / requests | Club | `#/equipos/:id?tab=bandeja&msg=` | aviso (DM propio con botones) |
| Oferta de traspaso o trueque recibida | market | Contraparte | `#/transferencias?tab=ofertas&id=` | oferta |
| Contraoferta recibida | market | Quien ofreció | ídem | oferta |
| Oferta aceptada | market | Quien ofreció | ídem | fichaje |
| Oferta rechazada | market | Quien ofreció (si no la retiró él) | ídem | error |
| Sueldos y primas por gol al cerrar la temporada | finance | Cada club | `#/equipos/:id?tab=nomina` | caja |
| Resultado de los objetivos de la directiva | board | Cada club | `#/equipos/:id?tab=central` | confirmar |
| Prima por playoffs / por título pagada | finance | Club | `?tab=nomina` | caja |
| Concierto realizado (asistencia, ganancia o pérdida) | finance | Club | `#/equipos/:id?tab=eventos` | aviso |
| Ibai abre la búsqueda de estadio de La Velada / elige sede | league | Todos los clubes | `#/equipos/:id?tab=eventos` | aviso |
| Arranca un torneo (pasa a activo) | league | Clubes que lo juegan | `#/torneos?torneo=` | aviso |
| Termina un torneo (con el puesto si es liga) | league | Clubes que lo jugaron | `#/torneos?torneo=` | aviso |
| Partido dado por sanción (0-3) | matches | Club castigado (alta) y su rival | `#/partidos/:id` | error / confirmar |
| Compra o venta de estadio | finance (propio) · league baja (resto) | Club y todos los demás | `?tab=estadio` / `#/equipos/estadios` | caja / sin sonido |
| Seguimiento: cambió de club, quedó libre, a la venta, último torneo, valor ±10% | watchlist | Club que lo sigue | `#/jugadores/:id` | oferta (libre y a la venta) |
| Promesa "vendo a X" / "te traigo a X" pendiente con el mercado abierto (y último día) | market | Club que prometió | `#/transferencias?tab=ofertas` | error |

El seguimiento y las promesas los revisa el bot cada minuto (`core/notification-sweeps.js`); cada aviso sale una vez gracias a su clave. Los avisos de prioridad baja no suenan.

Entrega por Discord (`syncNotificationDMs`): DM agrupado (hasta 10 tarjetas + botón a la web), respeta categoría, silencio total y horario de no molestar; DM cerrado se anota y la web lo explica; los errores pasajeros se reintentan.

## 4b. Vida de club

Backend: `core/consent.js` (visto bueno del jugador en traspasos y trueques con contrato vigente, prima de fichaje y rol prometido; representantes en `negotiation/agents.js`), `core/rivalries.js` (clásico natural por historial o elegido, cara a cara), `core/fans.js` (hinchas, ánimo de la hinchada, taquilla al terminar cada partido de clubes y su reversión), `core/events.js` (conciertos, La Velada, derechos de TV: los canales grandes pagan más y solo llaman a clubes con hinchada grande). Chat de traspaso en `negotiation/transfer-chat.js`: el jugador pregunta por lo que más le preocupa, el presi responde con datos reales y la charla mueve hasta ±10 su visto bueno (sin promesas; 3 cambios por mercado). Se activa una vez con `POST /v1/admin/club-life/start` (Sala de control > Vida de club); antes de eso nada cobra.

Web: `features/teams/ClubLife.jsx` (Estadio y taquilla, Eventos, Derechos de TV), `features/public/market/TransferChat.jsx` (dentro del visto bueno: Hablar con él · Prima · Rol), `features/teams/RivalryTab.jsx`, `features/public/market/ConsentPanel.jsx` (dentro del formulario de ofertas), `features/public/MatchdayPanel.jsx` (centro del partido), `features/admin/ClubLifeAdmin.jsx`. Estilos en `styles/17-vida-club.css`.

## 5. Sistema de diseño

- Tokens en `src/styles/00-tokens.css`; el resto de los estilos en `src/styles/NN-*.css` (el orden de `index.css` es el de la cascada).
- Componentes compartidos en `src/ui` (ver su README): Button, Card, Chip, Stat, PlayerAvatar, EmptyState, Notice, Tabs, Modal, ConfirmStep, Toast, Icon (pixel-art).
- Audio unificado en `src/audio` (silencio total, efectos, volúmenes; efectos chiptune WebAudio).
- `HowItWorks` (`src/ui`): explicación plegada «¿Cómo funciona?» en minúscula normal. A la vista queda una frase corta; los párrafos largos van ahí.
- Breakpoints oficiales: 560 · 900 · 1180. Texto mínimo: 12 px (salvo cartas densas de cancha y cara a cara).
- Los botones antiguos (`.action-button`, `.mini-actions button`) comparten tokens con `ui-btn`.

## 6. Deuda conocida

- Todos los botones usan `<Button>` de `src/ui` (el viejo `.action-button` ya no existe; los enlaces con forma de botón usan las clases `ui-btn`).
- Quedan 2 `!important`, a propósito: el foco de una ficha en la cancha (su z-index viene en línea) y `prefers-reduced-motion`.
- No hay componente de tabla compartido.
- Los roles y el ánimo aparecen en Plantel y en la Bandeja (la Bandeja deja cambiar el rol del jugador que escribe).
- Mensajes públicos de Discord: tarjeta de oferta, "HERE WE GO" y noticia siguen publicándose por separado.
- Reglamento: secciones 4.2 y 6.3 aún hablan de cláusulas de salida y de liberación al 20%.
