import assert from 'node:assert/strict';
import { newsTemplates } from '../src/features/news/newsTemplates.js';
import { classifyMatchResult, generateNews } from '../src/features/news/newsEngine.js';
import { generateMatchNews, generateSanctionNews, generateTransferNews } from '../src/utils/newsGenerator.js';

const expectedStructure = {
  victory: ['narrow', 'normal', 'big'],
  defeat: ['narrow', 'normal', 'big'],
  draw: ['goalless', 'normal', 'crazy'],
  transfer: ['arrival', 'departure', 'move'],
  sanction: ['player', 'club'],
};

let templateCount = 0;
for (const [type, subtypes] of Object.entries(expectedStructure)) {
  assert.deepEqual(Object.keys(newsTemplates[type]), subtypes, `Subcategorías incorrectas en ${type}`);
  for (const subtype of subtypes) {
    const group = newsTemplates[type][subtype];
    for (const field of ['labels', 'headlines', 'bodies']) {
      assert.equal(group[field].length, 10, `${type}.${subtype}.${field} debe contener exactamente 10 plantillas`);
      templateCount += group[field].length;
    }
  }
}
assert.equal(templateCount, 420);

const matchCases = [
  [{ golesEquipo: 4, golesRival: 2 }, { type: 'victory', subtype: 'normal' }],
  [{ golesEquipo: 2, golesRival: 1 }, { type: 'victory', subtype: 'narrow' }],
  [{ golesEquipo: 5, golesRival: 1 }, { type: 'victory', subtype: 'big' }],
  [{ golesEquipo: 1, golesRival: 3 }, { type: 'defeat', subtype: 'normal' }],
  [{ golesEquipo: 1, golesRival: 2 }, { type: 'defeat', subtype: 'narrow' }],
  [{ golesEquipo: 0, golesRival: 4 }, { type: 'defeat', subtype: 'big' }],
  [{ golesEquipo: 0, golesRival: 0 }, { type: 'draw', subtype: 'goalless' }],
  [{ golesEquipo: 2, golesRival: 2 }, { type: 'draw', subtype: 'normal' }],
  [{ golesEquipo: 4, golesRival: 4 }, { type: 'draw', subtype: 'crazy' }],
];

for (const [scores, expected] of matchCases) {
  assert.deepEqual(classifyMatchResult(scores), expected);
  const event = {
    id: `match-${scores.golesEquipo}-${scores.golesRival}`,
    kind: 'match',
    equipo: 'Forestyle FC',
    rival: 'Bombo FC',
    resultado: `${scores.golesEquipo}-${scores.golesRival}`,
    jornada: 'la Jornada 4',
    competicion: 'Liga 2026',
    ...scores,
  };
  const first = generateNews(event);
  const second = generateNews(structuredClone(event));
  assert.deepEqual(first, second, `${expected.type}.${expected.subtype} debe ser determinista`);
  assert.equal(first.type, expected.type);
  assert.equal(first.subtype, expected.subtype);
  assert.deepEqual(Object.keys(first), ['id', 'type', 'subtype', 'label', 'headline', 'body']);
}

const transferBase = {
  id: 184,
  type: 'transfer',
  jugador: 'Juan Pérez',
  equipoOrigen: 'Bombo FC',
  equipoDestino: 'Forestyle FC',
  competicion: 'Koinonia e-League',
};
for (const subtype of ['arrival', 'departure', 'move']) {
  const news = generateNews({ ...transferBase, subtype });
  assert.equal(news.type, 'transfer');
  assert.equal(news.subtype, subtype);
  assert.match(`${news.headline} ${news.body}`, /Juan Pérez/);
}

const playerSanction = generateNews({
  id: 'player-sanction', type: 'sanction', subtype: 'player', jugador: 'Jugador Uno', equipo: 'Club A',
  partidosSancion: 2, tipoSancion: 'suspensión', competicion: 'Liga 2026',
});
assert.equal(playerSanction.subtype, 'player');
assert.match(`${playerSanction.headline} ${playerSanction.body}`, /Jugador Uno/);

const clubSanction = generateNews({
  id: 'club-sanction', type: 'sanction', subtype: 'club', equipo: 'Club B', tipoSancion: 'amonestación',
});
assert.equal(clubSanction.subtype, 'club');
assert.match(`${clubSanction.headline} ${clubSanction.body}`, /Club B/);

const sanctionWithoutMatches = generateNews({
  id: 'without-match-count', type: 'sanction', subtype: 'player', jugador: 'Jugador Dos', equipo: 'Club C',
});
assert.ok(sanctionWithoutMatches);
assert.doesNotMatch(JSON.stringify(sanctionWithoutMatches), /undefined|\{\w+\}/);

const stringIdEvent = {
  id: 'uuid-37ba206b-16ad-44ea', kind: 'match', equipo: 'Club A', rival: 'Club B', resultado: '2-1',
  golesEquipo: 2, golesRival: 1,
};
assert.deepEqual(generateNews(stringIdEvent), generateNews(structuredClone(stringIdEvent)));

const apiMatch = generateMatchNews({
  id: 'api-match', homeTeam: { name: 'Club A' }, awayTeam: { name: 'Club B' }, homeScore: 4, awayScore: 2,
  tournament: { name: 'Liga 2026' }, roundNumber: 3, finishedAt: '2026-09-08T10:00:00Z',
});
assert.equal(apiMatch.id, 'match-api-match');
assert.equal(apiMatch.type, 'victory');
assert.equal(apiMatch.subtype, 'normal');
assert.equal(apiMatch.sourceType, 'match');

for (const subtype of ['arrival', 'departure', 'move']) {
  const transfer = generateTransferNews({
    id: `transfer-${subtype}`, player: { name: 'Jugador Tres' }, fromTeam: { name: 'Club A' },
    toTeam: { name: 'Club B' }, createdAt: '2026-09-08T10:00:00Z',
  }, subtype);
  assert.equal(transfer.subtype, subtype);
}

const adaptedPlayerSanction = generateSanctionNews({
  id: 'sanction-player', player: { name: 'Jugador Cuatro' }, team: { name: 'Club C' }, suspensionMatches: 2,
});
assert.equal(adaptedPlayerSanction.subtype, 'player');

const adaptedClubSanction = generateSanctionNews({ id: 'sanction-club', team: { name: 'Club D' }, type: 'club_warning' });
assert.equal(adaptedClubSanction.subtype, 'club');

assert.equal(generateMatchNews({ id: 'pending', homeTeam: { name: 'A' }, awayTeam: { name: 'B' } }), null);
assert.equal(generateTransferNews({ id: 'incomplete' }), null);
assert.equal(generateSanctionNews({ id: 'incomplete' }), null);

console.log(`Generador verificado: 14 subcategorías, ${templateCount} plantillas y selección determinista.`);
