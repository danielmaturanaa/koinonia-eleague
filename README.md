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

Solo la página Inicio, con datos de muestra tomados del boceto. El menú conserva Inicio seleccionado y explica que las demás pantallas corresponden a una etapa posterior. No se realizan peticiones a la API ni se incluyen credenciales.

La composición se diseña sobre un lienzo desktop de 1536 × 1024 y se escala proporcionalmente al ancho de la ventana. No es todavía un diseño responsive para móvil.

## Recursos

`public/reference-art.png` es una copia del boceto proporcionado por el usuario. Se reutilizan sus gráficos como atlas: fotografía, retratos, escudos, estadio y césped. Encima se construyen menú, artículos, tablas, marca y controles con React y CSS. Los textos de muestra no corresponden a datos deportivos actuales. Las fuentes Anton, Oswald y Roboto Condensed se cargan desde Google Fonts.

No se requiere backend. Dependencias: React, React DOM y Vite.
