# src/ui · componentes compartidos

Todo valor visual sale de `src/styles/00-tokens.css`; los estilos de estos componentes viven en `src/styles/13-ui.css` (clases `ui-*`).
Importa siempre desde `../../ui/index.js`.

| Componente | Para qué | Notas |
|---|---|---|
| `Button` | Único botón del sitio | `variant`: primary · positive · danger · ghost · `size`: md · sm · `icon` opcional |
| `Card` | Panel de papel | `tone`: paper · navy · gold · alert · flat; `title`/`aside` opcionales |
| `Chip` | Etiqueta corta | `tone`: neutral · navy · red · green · yellow; `icon` opcional |
| `Stat` | Número grande + etiqueta | saldos, medias, precios |
| `PlayerAvatar` | Foto del jugador | `size`: xs 30 · sm 40 · md 56 · lg 72; nunca más overrides de `.player-photo` |
| `EmptyState`, `Notice` | Vacío con acción; aviso de resultado (aria-live) | |
| `Tabs` | Pestañas con teclado | `tabs=[{id,label,badge}]` |
| `Modal`, `ConfirmStep` | Ventana (foco atrapado, Escape) y confirmación en línea | para acciones que mueven plata |
| `ToastProvider`, `useToast` | Avisos efímeros | `toast({ tone: success|error|info|money, title, body, href })`; con `href` el aviso es un enlace |
| `Icon` | Pixel-art 8×8 con `currentColor` | catálogo en `icons.js` |

Breakpoints oficiales (las media queries no admiten variables): 560 · 900 · 1180.
Pantallas migradas hasta ahora: Seguimiento, Estadio y Notificaciones (campana, página y preferencias en `src/features/notifications`).

## Audio (`src/audio`)
Un solo sistema: `settings.js` (silencio total, efectos, volúmenes; se recuerda en el navegador), `synth.js` (efectos chiptune con WebAudio: clic, confirmar, error, aviso, oferta, fichaje, caja, gol, mensaje, silbato) y `AudioControls.jsx` (el panel, dentro de la radio y en Notificaciones > Preferencias).
Uso: `playSound('confirm')`. Los botones `Button` y las `Tabs` hacen clic; los toasts `success`/`error`/`money` suenan solos (`sound: false` lo evita); cada aviso nuevo suena según su tipo y las preferencias del servidor (`notificationSound.js`).
