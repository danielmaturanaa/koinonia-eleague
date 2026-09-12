const coachesByClub = {
  'bombo fc': 'Marcelo Bielsa',
  'deportivo la poruna': 'Marcelo Bielsa',
  'lalo cura fc': 'Luis Enrique',
  'forestyle fc': 'Mikel Arteta',
  'real potente cf': 'Frank Lampard',
  'real potente fc': 'Frank Lampard',
  'porlacheetah fc': 'Hansi Flick',
};

const coachPhotosByClub = {
  'porlacheetah fc': 'https://res.cloudinary.com/edu-devjs/image/upload/v1789186607/cheeto/k9ovgyjr9nlcvfrh2neb.jpg',
};

const normalizeClubName = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();

export function teamCoachName(team) {
  return team?.coach?.name
    ?? team?.manager?.name
    ?? team?.coachName
    ?? team?.managerName
    ?? coachesByClub[normalizeClubName(team?.name)]
    ?? 'No informado';
}

export function teamCoachPhoto(team) {
  return team?.coach?.imageUrl
    ?? team?.coach?.photoUrl
    ?? team?.coach?.avatarUrl
    ?? team?.manager?.imageUrl
    ?? team?.coachImageUrl
    ?? team?.managerImageUrl
    ?? coachPhotosByClub[normalizeClubName(team?.name)]
    ?? '';
}

export function teamBalance(team) {
  const value = [team?.balance, team?.budget, team?.budgetValue, team?.currentBalance]
    .find(candidate => candidate !== null && candidate !== undefined && candidate !== '' && Number.isFinite(Number(candidate)));
  return value === undefined ? null : Number(value);
}
