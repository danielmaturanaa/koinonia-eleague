const storageKey = (type, id) => `koinonia:${type}:${id}:profile`;

export function readPersonProfile(type, person) {
  const direct = {
    age: person?.age ?? '',
    country: person?.country ?? person?.nationality ?? '',
  };
  if (!person?.id || typeof window === 'undefined') return direct;
  try {
    return { ...direct, ...JSON.parse(window.localStorage.getItem(storageKey(type, person.id)) || '{}') };
  } catch {
    return direct;
  }
}

export function savePersonProfile(type, id, profile) {
  if (!id || typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(type, id), JSON.stringify({
    age: profile.age === '' ? '' : Number(profile.age),
    country: profile.country.trim(),
  }));
}
