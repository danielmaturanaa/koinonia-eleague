export function hashString(value) {
  const text = String(value ?? '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deterministicItem(items, seed, offset = 0) {
  if (!Array.isArray(items) || !items.length) return null;
  return items[hashString(`${String(seed)}:${offset}`) % items.length];
}
