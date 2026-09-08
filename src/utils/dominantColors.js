const colorDistance = (a, b) => Math.sqrt(
  (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
);

const rgbToHex = ([r, g, b]) => `#${[r, g, b]
  .map(value => Math.round(value).toString(16).padStart(2, '0'))
  .join('')}`.toUpperCase();

const colorCache = new Map();

async function extractDominantColors(src, maxColors) {
  const blob = typeof File !== 'undefined' && src instanceof File
    ? src
    : await fetch(src).then(response => {
      if (!response.ok) throw new Error('Could not load image');
      return response.blob();
    });
  const bitmap = await createImageBitmap(blob);
  const maxSize = 150;
  const scale = Math.min(maxSize / bitmap.width, maxSize / bitmap.height, 1);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    return [];
  }
  context.drawImage(bitmap, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);
  const pixels = [];
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] < 180) continue;
    pixels.push([data[index], data[index + 1], data[index + 2]]);
  }
  bitmap.close();
  if (!pixels.length) return [];

  const k = Math.min(maxColors, pixels.length);
  let centroids = [pixels[Math.floor(Math.random() * pixels.length)]];
  while (centroids.length < k) {
    let farthestPixel = pixels[0];
    let farthestDistance = -1;
    for (const pixel of pixels) {
      const nearestDistance = Math.min(...centroids.map(centroid => colorDistance(pixel, centroid)));
      if (nearestDistance > farthestDistance) {
        farthestDistance = nearestDistance;
        farthestPixel = pixel;
      }
    }
    centroids.push([...farthestPixel]);
  }

  let assignments = new Array(pixels.length).fill(0);
  for (let iteration = 0; iteration < 15; iteration += 1) {
    assignments = pixels.map(pixel => {
      let bestIndex = 0;
      let bestDistance = Infinity;
      centroids.forEach((centroid, index) => {
        const distance = colorDistance(pixel, centroid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = index;
        }
      });
      return bestIndex;
    });
    centroids = centroids.map((oldCentroid, index) => {
      const members = pixels.filter((_, pixelIndex) => assignments[pixelIndex] === index);
      if (!members.length) return oldCentroid;
      const sum = members.reduce((accumulator, [r, g, b]) => [
        accumulator[0] + r, accumulator[1] + g, accumulator[2] + b,
      ], [0, 0, 0]);
      return sum.map(value => Math.round(value / members.length));
    });
  }

  const populations = centroids.map((_, index) => assignments.filter(cluster => cluster === index).length);
  const sorted = centroids.map((color, index) => ({ color, population: populations[index] }))
    .sort((a, b) => b.population - a.population);
  const result = [];
  for (const { color } of sorted) {
    if (!result.some(existing => colorDistance(existing, color) < 45)) result.push(color);
    if (result.length === maxColors) break;
  }
  return result.map(rgbToHex);
}

export function getDominantColors(src, maxColors = 3) {
  if (typeof src !== 'string') return extractDominantColors(src, maxColors);
  const key = `${src}::${maxColors}`;
  if (!colorCache.has(key)) {
    const request = extractDominantColors(src, maxColors).catch(error => {
      colorCache.delete(key);
      throw error;
    });
    colorCache.set(key, request);
  }
  return colorCache.get(key);
}
