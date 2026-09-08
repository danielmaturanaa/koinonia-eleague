import assert from 'node:assert/strict';
import { classifyMatch, generateMatchNews, generateSanctionNews, generateTransferNews } from '../src/utils/newsGenerator.js';

const baseMatch = {
  homeTeam: { name: 'Forestyle FC' },
  awayTeam: { name: 'Bombo FC' },
  tournament: { name: 'Liga 2026' },
  roundNumber: 4,
  status: 'finished',
  finishedAt: '2026-09-07T03:20:05.151Z',
};

const cases = [
  ['upcoming', { id: 'pending', status: 'pending', homeScore: null, awayScore: null }],
  ['narrowVictory', { id: 'narrow', homeScore: 2, awayScore: 1 }],
  ['victory', { id: 'victory', homeScore: 3, awayScore: 1 }],
  ['bigVictory', { id: 'big-victory', homeScore: 4, awayScore: 1 }],
  ['draw', { id: 'draw', homeScore: 2, awayScore: 2 }],
  ['crazyDraw', { id: 'crazy-draw', homeScore: 3, awayScore: 3 }],
  ['defeat', { id: 'defeat', homeScore: 1, awayScore: 3 }],
  ['bigDefeat', { id: 'big-defeat', homeScore: 1, awayScore: 5 }],
];

for (const [expected, values] of cases) {
  const match = { ...baseMatch, ...values };
  assert.equal(classifyMatch(match), expected);
  const first = generateMatchNews(match);
  const second = generateMatchNews(structuredClone(match));
  assert.deepEqual(
    { label: first.label, headline: first.headline, body: first.body },
    { label: second.label, headline: second.headline, body: second.body },
    `La noticia ${expected} debe ser determinista`,
  );
  assert.equal(first.id, `match-${match.id}`);
}

const transfer = generateTransferNews({ id: 'transfer-1', player: { name: 'Jugador Uno' }, fromTeam: { name: 'Club A' }, toTeam: { name: 'Club B' }, createdAt: '2026-09-08T10:00:00Z' });
assert.equal(transfer.id, 'transfer-transfer-1');
assert.match(transfer.body, /Jugador Uno/);
assert.match(transfer.body, /Club A/);
assert.match(transfer.body, /Club B/);

const sanction = generateSanctionNews({ id: 'sanction-1', player: { name: 'Jugador Dos' }, team: { name: 'Club C' }, suspensionMatches: 2, occurredAt: '2026-09-08T11:00:00Z' });
assert.equal(sanction.id, 'sanction-sanction-1');
assert.match(sanction.body, /Jugador Dos/);
assert.match(sanction.body, /Club C/);
assert.match(sanction.body, /2/);

assert.equal(generateTransferNews({ id: 'incomplete' }), null);
assert.equal(generateSanctionNews({ id: 'incomplete' }), null);

console.log(`Generador verificado: ${cases.length} tipos de partido, traspaso, sanción y determinismo.`);
