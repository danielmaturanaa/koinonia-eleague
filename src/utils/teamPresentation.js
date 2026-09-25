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

function numericValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
}

/* La API puede exponer los premios acumulados con distintos nombres según
   la versión del backend. Normalizamos todos los formatos para la ficha. */
export function teamPrizes(team) {
  const direct = [
    team?.prizes,
    team?.prizeMoney,
    team?.prize,
    team?.prizeGp,
    team?.prizeGP,
    team?.prizeTotal,
    team?.prizesGp,
    team?.prizesGP,
    team?.prizeBalance,
    team?.prizeAmount,
    team?.earnedPrizes,
    team?.awardedGp,
    team?.awardedGP,
    team?.earnings,
    team?.totalPrizes,
    team?.awards,
    team?.awardTotal,
    team?.totalAwards,
    team?.premios,
    team?.premiosTotal,
    team?.totalPremios,
    team?.financials?.prizes,
    team?.financials?.prizeTotal,
    team?.financialSummary?.prizes,
    team?.financialSummary?.prizeTotal,
    team?.finance?.prizes,
    team?.finance?.prizeTotal,
  ];
  const record = direct.find(value => Array.isArray(value) || (value && typeof value === 'object'));
  if (Array.isArray(record)) {
    const total = record.reduce((sum, item) => sum + (numericValue(item?.amount ?? item?.gp ?? item?.value ?? item?.prize ?? item?.prizeMoney) ?? 0), 0);
    return total || null;
  }
  if (record && typeof record === 'object') {
    const total = numericValue(record.total ?? record.amount ?? record.gp ?? record.value ?? record.prize ?? record.prizeMoney);
    if (total !== null) return total;
  }
  const value = direct.map(numericValue).find(candidate => candidate !== null);
  return value ?? null;
}
