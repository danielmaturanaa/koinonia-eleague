# Escenas pixel-art de noticias

El catálogo de `src/features/news/newsImageCatalog.js` define cada carpeta esperada bajo este directorio.

Cada escena admite:

- `scene-base.png` como imagen principal obligatoria.
- `mask-team1-shirt.png`, `mask-team1-shorts.png` y `mask-team1-socks.png` para el club protagonista.
- `mask-team2-shirt.png`, `mask-team2-shorts.png` y `mask-team2-socks.png` para el rival, cuando corresponda.

Las máscaras son opcionales, deben tener las mismas dimensiones que la escena base y usar el canal alfa para marcar los píxeles recoloreables. Si falta la escena o una máscara, el frontend mantiene un fallback seguro sin interrumpir la noticia.
