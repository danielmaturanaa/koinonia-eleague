// Qué sonido le toca a cada aviso y si el usuario lo quiere (preferencias del servidor: categoría, silencio total y no molestar).
const SOUND_BY_KIND = {
  offer_received: 'offer', offer_countered: 'offer', offer_accepted: 'signed', offer_rejected: 'error',
  season_salaries: 'cash', bonus_playoffs: 'cash', bonus_title: 'cash', season_objectives: 'confirm',
  stadium_bought: 'cash', stadium_sold: 'cash', match_sanctioned: 'error', match_awarded: 'confirm',
  watch_for_sale: 'offer', watch_free: 'offer', promise_due: 'error', courting_started: 'chat', courting_finished: 'chat',
};

export const soundFor = item => SOUND_BY_KIND[item.kind] ?? 'notify';

const chileHour = date => Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' }).format(date));

/** ¿Suena este aviso? Sin preferencias cargadas, sí. El horario de silencio (hora de Chile) también apaga los sonidos. */
export function soundAllowed(prefs, category, at = new Date()) {
  if (!prefs) return true;
  if (prefs.muted || prefs.categories?.[category]?.sound === false) return false;
  if (prefs.quietFrom === null || prefs.quietFrom === undefined) return true;
  const hour = chileHour(at);
  const quiet = prefs.quietFrom <= prefs.quietTo ? hour >= prefs.quietFrom && hour < prefs.quietTo : hour >= prefs.quietFrom || hour < prefs.quietTo;
  return !quiet;
}
