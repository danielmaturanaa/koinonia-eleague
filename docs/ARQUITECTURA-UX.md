# Arquitectura de la web: navegación, avisos y sistema de diseño

Resultado del rediseño por fases (1 a 8). Las reglas de negocio no cambiaron: solo dónde vive cada cosa y cómo se avisa.

## 1. Mapa de navegación

Menú principal (`src/app/navigation.js`): **Inicio · Partidos · Torneos · Jugadores · Mercado**, más **Mi club** (si tienes club) y **Admin** (si eres admin). `activeNavigationPath` decide qué ítem se ilumina en cada ruta.

| Área | Rutas | Notas |
|---|---|---|
| Inicio | `/`, `/noticias`, `/noticias/:id` | Las noticias viven en Inicio; "Noticias" también en el pie y en el menú de cuenta |
| Partidos | `/partidos[/jugados\|pendientes\|calendario]`, `/partidos/:id`, `/sanciones`, `/marcador/:id` | Sanciones es un botón del Centro de partidos |
| Torneos | `/torneos`, `/calculadora`, `/equipos`, `/equipos/rankings\|plantillas\|presupuestos\|presidentes\|directores-tecnicos\|emblemas\|selecciones`, fichas de clubes ajenos | La barra `LeagueSectionTabs` enlaza todas estas vistas |
| Jugadores | `/equipos/jugadores[/importar]`, `/jugadores/:id`, `/efootball/:id` | |
| Mercado | `/transferencias?tab=subastas\|encuestas\|ofertas\|venta\|historial&id=` | `tab` e `id` los respeta el enlace de los avisos |
| Mi club | `/equipos/:miClubId?tab=` | Central y seis secciones (ver §2) |
| Admin | `/admin?tab=personas\|torneos\|mercado\|equipos\|jugadores\|partidos\|noticias[&id=]`, alias `/personas` | Sala de control |
| Cuenta | `/notificaciones?tab=avisos\|preferencias`, `/reglas` | Menú de cuenta y pie |

## 2. Mi club frente a la ficha pública

`TeamDetailPage` muestra una u otra según quién mira (`ownerMode`):

- **Presidente de ese club → Mi club**: CENTRAL · PLANTEL · FINANZAS (Contratos y nómina | Simulador con dos modos) · MERCADO (Seguimiento | Fichajes) · BANDEJA · CLUB (Resumen | Partidos | Tabla | Historia | Estadio).
- **Cualquier otra persona → ficha pública**: Resumen · Plantel · Partidos · Tabla · Historia (con los fichajes) · Nómina (solo lectura) · Estadio.
- **Admin en un club ajeno** entra como visitante; con "Actuar como presi" ve las herramientas del club (banner visible y todo queda registrado a su nombre). Un enlace a una herramienta privada le ofrece activarlo.

El id de la pestaña en la URL es siempre la "hoja" (`central`, `nomina`, `finanzas`, `seguimiento`, `fichajes`, `bandeja`, `resumen`, `partidos`, `tabla`, `historia`, `estadio`, `plantel`); la sección se deduce de ella, así los enlaces viejos siguen funcionando.

## 3. Qué vivía dónde → dónde vive ahora

| Antes | Ahora |
|---|---|
| Calculadora en el menú | Torneos > Calculadora |
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

Pendientes de conectar (no notifican todavía): alertas del seguimiento, compra de estadio, sanciones al presi, torneo creado o cerrado, promesas por vencer.

Entrega por Discord (`syncNotificationDMs`): DM agrupado (hasta 10 tarjetas + botón a la web), respeta categoría, silencio total y horario de no molestar; DM cerrado se anota y la web lo explica; los errores pasajeros se reintentan.

## 5. Sistema de diseño

- Tokens en `src/styles/00-tokens.css`; el resto de los estilos en `src/styles/NN-*.css` (el orden de `index.css` es el de la cascada).
- Componentes compartidos en `src/ui` (ver su README): Button, Card, Chip, Stat, PlayerAvatar, EmptyState, Notice, Tabs, Modal, ConfirmStep, Toast, Icon (pixel-art).
- Audio unificado en `src/audio` (silencio total, efectos, volúmenes; efectos chiptune WebAudio).
- Breakpoints oficiales: 560 · 900 · 1180. Texto mínimo: 12 px (salvo cartas densas de cancha y cara a cara).
- Los botones antiguos (`.action-button`, `.mini-actions button`) comparten tokens con `ui-btn`.

## 6. Deuda conocida

- Las pantallas antiguas siguen con sus clases propias (`.action-button`, tablas propias…): solo las nuevas usan `src/ui`.
- Quedan 11 `!important` heredados.
- No hay componente de tabla compartido.
- Los roles y el ánimo aparecen en Plantel y en la Bandeja (la Bandeja deja cambiar el rol del jugador que escribe).
- Mensajes públicos de Discord: tarjeta de oferta, "HERE WE GO" y noticia siguen publicándose por separado.
- Reglamento: secciones 4.2 y 6.3 aún hablan de cláusulas de salida y de liberación al 20%.
