import { useEffect, useRef } from 'react';

const isBackgroundBlack = (data, offset) => data[offset] <= 6 && data[offset + 1] <= 6 && data[offset + 2] <= 6;

export function TransparentLogo({ src, className = '', label }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const image = new Image();
    let active = true;
    image.decoding = 'async';
    image.onload = () => {
      if (!active || !canvas) return;
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, width, height);
      const visited = new Uint8Array(width * height);
      const queue = new Int32Array(width * height);
      let head = 0;
      let tail = 0;
      const enqueue = index => {
        if (visited[index] || !isBackgroundBlack(pixels.data, index * 4)) return;
        visited[index] = 1;
        queue[tail] = index;
        tail += 1;
      };
      for (let x = 0; x < width; x += 1) {
        enqueue(x);
        enqueue((height - 1) * width + x);
      }
      for (let y = 1; y < height - 1; y += 1) {
        enqueue(y * width);
        enqueue(y * width + width - 1);
      }
      while (head < tail) {
        const index = queue[head];
        head += 1;
        const x = index % width;
        const y = Math.floor(index / width);
        if (x > 0) enqueue(index - 1);
        if (x + 1 < width) enqueue(index + 1);
        if (y > 0) enqueue(index - width);
        if (y + 1 < height) enqueue(index + width);
      }
      for (let index = 0; index < visited.length; index += 1) {
        if (visited[index]) pixels.data[index * 4 + 3] = 0;
      }
      context.clearRect(0, 0, width, height);
      context.putImageData(pixels, 0, 0);
    };
    image.src = src;
    return () => { active = false; };
  }, [src]);

  return <canvas ref={canvasRef} className={className} role="img" aria-label={label}/>;
}
