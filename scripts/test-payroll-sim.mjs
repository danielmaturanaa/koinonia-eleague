import assert from 'node:assert/strict';
import { HORIZON, leaguePrize, maxSalaryFor, roundStep, simulate } from '../src/utils/payrollSim.js';

assert.equal(maxSalaryFor(200_000_000), 40_000_000);
assert.equal(maxSalaryFor(5_000), 10_000, 'nunca menos de un paso');
assert.equal(roundStep(12_345_678), 12_350_000);
assert.equal(leaguePrize(1), 200_000_000);
assert.equal(leaguePrize(8), 60_000_000);
assert.equal(leaguePrize(15), 0, 'el premio no baja de cero');

const base = [{ value: 200_000_000, salary: 20_000_000, years: 2 }, { value: 100_000_000, salary: 10_000_000, years: 3 }];

// Sin renovar: cada jugador paga solo mientras dura su contrato.
const without = simulate(base, { renew: false, position: 1, balance: 0 });
assert.equal(without.length, HORIZON);
assert.deepEqual(without.map(row => row.payroll), [30_000_000, 30_000_000, 10_000_000, 0, 0, 0]);
assert.deepEqual(without.map(row => row.leaving), [0, 1, 1, 0, 0, 0]);

// Renovando con +15%: al vencer sube el sueldo y renueva por 2 torneos.
const renewed = simulate(base, { raise: 15, renew: true, position: 4, balance: 100_000_000 });
assert.deepEqual(renewed.slice(0, 3).map(row => row.payroll), [30_000_000, 30_000_000, 33_000_000]);
assert.equal(renewed[0].balance, 100_000_000 + 140_000_000 - 30_000_000);

// El tope del 20%: un aumento enorme no pasa del 20% del valor.
const capped = simulate([{ value: 100_000_000, salary: 18_000_000, years: 1 }], { raise: 100, renew: true });
assert.equal(capped[1].payroll, 20_000_000, 'tope de 20 M para un jugador de 100 M');

// Por jugador: su aumento y su renovación mandan sobre los globales; vender lo saca desde el T1.
const perPlayer = simulate([
  { value: 200_000_000, salary: 20_000_000, years: 1, raise: 50 },
  { value: 200_000_000, salary: 20_000_000, years: 1 },
  { value: 100_000_000, salary: 10_000_000, years: 1, renew: false },
  { value: 100_000_000, salary: 10_000_000, years: 1, sold: true },
], { raise: 10, renew: true });
assert.equal(perPlayer[0].payroll, 50_000_000, 'el vendido (10 M) no cuenta');
assert.equal(perPlayer[1].payroll, 30_000_000 + 22_000_000, 'uno renueva +50% y otro +10%; el tercero se va');
assert.equal(perPlayer[0].renewed, 2);
assert.equal(perPlayer[0].leaving, 1);

// Tope de nómina: se marca el torneo que lo pasa.
const flagged = simulate(base, { renew: false, cap: 25_000_000 });
assert.deepEqual(flagged.map(row => row.overCap), [true, true, false, false, false, false]);

console.log('simulación de nómina: ok');
