import { hashString } from './deterministic.js';
import { newsImageCatalog } from './newsImageCatalog.js';

export function deterministicImage(images, eventId) {
  if (!Array.isArray(images) || images.length === 0) return null;
  return images[hashString(eventId) % images.length];
}

export function getNewsImage({ id, type, subtype } = {}) {
  const images = newsImageCatalog[type]?.[subtype];
  if (!Array.isArray(images)) return null;
  return deterministicImage(images, id);
}
