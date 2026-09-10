import { useEffect, useRef } from 'react';
import { applyAvailableMasks, fallbackSceneSrc, getSceneBaseSrc, getSceneColorLayers } from '../features/news/newsSceneRenderer.js';

const loadOptionalImage = src => new Promise(resolve => {
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

async function loadSceneBase(scene) {
  const sceneSrc = getSceneBaseSrc(scene);
  const requested = sceneSrc ? await loadOptionalImage(sceneSrc) : null;
  if (requested) return { image: requested, fallback: false };
  return { image: await loadOptionalImage(fallbackSceneSrc), fallback: true };
}

export function RecolorableNewsScene({ scene, team, opponent, alt = '', className = '' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    let active = true;
    const render = async () => {
      const canvas = canvasRef.current;
      const { image: base, fallback } = await loadSceneBase(scene);
      if (!active || !canvas || !base) return;

      canvas.width = base.naturalWidth || base.width;
      canvas.height = base.naturalHeight || base.height;
      canvas.dataset.fallback = String(fallback);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.imageSmoothingEnabled = false;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(base, 0, 0, canvas.width, canvas.height);

      if (fallback || !scene?.recolorable) return;
      const layers = getSceneColorLayers(scene, team, opponent);
      let basePixels;
      try {
        basePixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      } catch {
        return;
      }

      const availableMasks = [];
      for (const layer of layers) {
        const mask = await loadOptionalImage(layer.src);
        if (!active || !mask) continue;
        if ((mask.naturalWidth || mask.width) !== canvas.width || (mask.naturalHeight || mask.height) !== canvas.height) continue;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
        if (!maskContext) continue;
        maskContext.imageSmoothingEnabled = false;
        maskContext.drawImage(mask, 0, 0);
        const maskPixels = maskContext.getImageData(0, 0, canvas.width, canvas.height).data;
        availableMasks.push({ pixels: maskPixels, color: layer.color });
      }

      if (!active) return;
      const workingPixels = applyAvailableMasks(basePixels, availableMasks);
      context.putImageData(new ImageData(workingPixels, canvas.width, canvas.height), 0, 0);
    };

    render().catch(() => {});
    return () => { active = false; };
  }, [scene, team, opponent]);

  const objectPosition = scene?.focalPoint === 'left' ? 'left center'
    : scene?.focalPoint === 'right' ? 'right center' : 'center';
  return <canvas
    ref={canvasRef}
    className={`recolorable-news-scene ${className}`}
    style={{ objectPosition }}
    role={alt ? 'img' : undefined}
    aria-label={alt || undefined}
    aria-hidden={alt ? undefined : true}
  />;
}
