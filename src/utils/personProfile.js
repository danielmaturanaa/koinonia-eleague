export function readPersonProfile(type, person) {
  return {
    age: person?.age ?? '',
    country: person?.country ?? person?.nationality ?? '',
  };
}

// Los perfiles se guardan exclusivamente mediante los PATCH de la API.
export function savePersonProfile() {}
