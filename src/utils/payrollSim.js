// Simulación de la nómina de un club para los próximos torneos. Es pura (sin red ni estado): no cambia nada real.
// Cada jugador cobra su sueldo cada torneo mientras dura su contrato; al vencer, si se asume renovación, renueva por 2 torneos
// con el aumento elegido, siempre bajo el tope del 20% de su valor de mercado. Los premios salen de la tabla de la liga.
export const SALARY_STEP = 10_000;
export const MAX_SALARY_SHARE = 0.2;
export const HORIZON = 6;
export const LEAGUE_FIRST_PRIZE = 200_000_000;
export const LEAGUE_PRIZE_STEP = 20_000_000;
export const PLAYOFF_PRIZES = { none: 0, semifinal: 0, runnerUp: 20_000_000, champion: 40_000_000 };

export const roundStep = amount => Math.max(SALARY_STEP, Math.round(amount / SALARY_STEP) * SALARY_STEP);
export const maxSalaryFor = value => Math.max(SALARY_STEP, Math.floor(Number(value) * MAX_SALARY_SHARE / SALARY_STEP) * SALARY_STEP);
export const leaguePrize = position => Math.max(0, LEAGUE_FIRST_PRIZE - LEAGUE_PRIZE_STEP * (Math.max(1, position) - 1));

/**
 * `players`: [{ value, salary, years }]. `options`: { raise (%), renew (bool), position (1..), playoff (clave de PLAYOFF_PRIZES),
 * balance, cap (nómina máxima o null) }. Devuelve una fila por torneo con nómina, premios, neto, saldo y cuántos contratos vencen.
 */
export function simulate(players, { raise = 15, renew = true, position = 4, playoff = 'none', balance = 0, cap = null } = {}) {
  const state = players.map(player => ({ value: player.value, salary: player.salary, left: player.years, alive: true }));
  const prize = leaguePrize(position) + (PLAYOFF_PRIZES[playoff] ?? 0);
  const rows = [];
  let running = balance;
  for (let torneo = 1; torneo <= HORIZON; torneo += 1) {
    let payroll = 0; let expiring = 0; let renewed = 0; let leaving = 0;
    for (const item of state) {
      if (!item.alive) continue;
      payroll += item.salary;
      item.left -= 1;
      if (item.left <= 0) {
        expiring += 1;
        if (renew) { item.salary = Math.min(roundStep(item.salary * (1 + raise / 100)), maxSalaryFor(item.value)); item.left = 2; renewed += 1; }
        else { item.alive = false; leaving += 1; }
      }
    }
    running += prize - payroll;
    rows.push({ torneo, payroll, prize, net: prize - payroll, balance: running, expiring, renewed, leaving, overCap: cap !== null && payroll > cap });
  }
  return rows;
}
