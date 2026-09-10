export const productionSceneIds = new Set([
  'victory-normal-01', 'victory-narrow-01', 'victory-big-01',
  'defeat-normal-01', 'defeat-narrow-01', 'defeat-big-01',
  'draw-goalless-01', 'draw-normal-01', 'draw-crazy-01',
  'transfer-arrival-01', 'transfer-departure-01', 'transfer-move-01',
  'sanction-player-01',
]);

const scene = (id, name, src, colorTargets, focalPoint, tags) => {
  const production = productionSceneIds.has(id);
  return {
    id,
    scene: name,
    src: production ? `/assets/newspaper-scenes/${id}` : src,
    recolorable: colorTargets.length > 0,
    colorTargets,
    focalPoint,
    tags,
    ...(production ? { assetFormat: 'palette-v1' } : {}),
  };
};

export const newsImageCatalog = {
  victory: {
    normal: [
      scene('victory-normal-01', 'celebration-corner', '/news-scenes/victory/normal/celebration-corner', ['team', 'opponent'], 'center', ['celebration', 'crowd']),
      scene('victory-normal-02', 'team-huddle', '/news-scenes/victory/normal/team-huddle', ['team', 'opponent'], 'center', ['celebration', 'team']),
      scene('victory-normal-03', 'arms-up', '/news-scenes/victory/normal/arms-up', ['team', 'opponent'], 'center', ['celebration']),
      scene('victory-normal-04', 'running-to-fans', '/news-scenes/victory/normal/running-to-fans', ['team', 'opponent'], 'center', ['crowd', 'celebration']),
      scene('victory-normal-05', 'final-whistle', '/news-scenes/victory/normal/final-whistle', ['team', 'opponent'], 'center', ['final', 'celebration']),
    ],
    narrow: [
      scene('victory-narrow-01', 'goalkeeper-save', '/news-scenes/victory/narrow/goalkeeper-save', ['team', 'opponent'], 'right', ['goalkeeper', 'tension']),
      scene('victory-narrow-02', 'defensive-clearance', '/news-scenes/victory/narrow/defensive-clearance', ['team', 'opponent'], 'center', ['defence', 'tension']),
      scene('victory-narrow-03', 'relief-final-whistle', '/news-scenes/victory/narrow/relief-final-whistle', ['team', 'opponent'], 'center', ['relief']),
      scene('victory-narrow-04', 'tight-match', '/news-scenes/victory/narrow/tight-match', ['team', 'opponent'], 'center', ['duel']),
    ],
    big: [
      scene('victory-big-01', 'goal-festival', '/news-scenes/victory/big/goal-festival', ['team', 'opponent'], 'right', ['goal', 'goleada']),
      scene('victory-big-02', 'keeper-defeated', '/news-scenes/victory/big/keeper-defeated', ['team', 'opponent'], 'center', ['goal', 'goalkeeper']),
      scene('victory-big-03', 'back-to-center', '/news-scenes/victory/big/back-to-center', ['team', 'opponent'], 'center', ['goleada']),
      scene('victory-big-04', 'mass-celebration', '/news-scenes/victory/big/mass-celebration', ['team', 'opponent'], 'center', ['celebration', 'crowd']),
      scene('victory-big-05', 'attack-wave', '/news-scenes/victory/big/attack-wave', ['team', 'opponent'], 'center', ['attack']),
    ],
  },
  defeat: {
    normal: [
      scene('defeat-normal-01', 'head-down', '/news-scenes/defeat/normal/head-down', ['team', 'opponent'], 'center', ['defeat']),
      scene('defeat-normal-02', 'hands-on-hips', '/news-scenes/defeat/normal/hands-on-hips', ['team', 'opponent'], 'center', ['defeat']),
      scene('defeat-normal-03', 'rival-celebrates', '/news-scenes/defeat/normal/rival-celebrates', ['team', 'opponent'], 'center', ['rival', 'celebration']),
      scene('defeat-normal-04', 'walking-off', '/news-scenes/defeat/normal/walking-off', ['team', 'opponent'], 'center', ['final']),
    ],
    narrow: [
      scene('defeat-narrow-01', 'close-defeat', '/news-scenes/defeat/narrow/close-defeat', ['team', 'opponent'], 'center', ['close', 'defeat']),
      scene('defeat-narrow-02', 'late-pressure', '/news-scenes/defeat/narrow/late-pressure', ['team', 'opponent'], 'center', ['pressure']),
      scene('defeat-narrow-03', 'disappointed-player', '/news-scenes/defeat/narrow/disappointed-player', ['team', 'opponent'], 'center', ['defeat']),
    ],
    big: [
      scene('defeat-big-01', 'keeper-looking-net', '/news-scenes/defeat/big/keeper-looking-net', ['team', 'opponent'], 'right', ['goalkeeper', 'heavy-defeat']),
      scene('defeat-big-02', 'players-on-ground', '/news-scenes/defeat/big/players-on-ground', ['team', 'opponent'], 'center', ['heavy-defeat']),
      scene('defeat-big-03', 'rival-mass-celebration', '/news-scenes/defeat/big/rival-mass-celebration', ['team', 'opponent'], 'center', ['rival', 'goleada']),
      scene('defeat-big-04', 'tunnel-walk', '/news-scenes/defeat/big/tunnel-walk', ['team', 'opponent'], 'center', ['tunnel']),
    ],
  },
  draw: {
    goalless: [
      scene('draw-goalless-01', 'midfield-duel', '/news-scenes/draw/goalless/midfield-duel', ['team', 'opponent'], 'center', ['duel', '0-0']),
      scene('draw-goalless-02', 'final-whistle-zero', '/news-scenes/draw/goalless/final-whistle-zero', ['team', 'opponent'], 'center', ['final']),
      scene('draw-goalless-03', 'goalkeeper-ball', '/news-scenes/draw/goalless/goalkeeper-ball', ['team', 'opponent'], 'center', ['goalkeeper']),
    ],
    normal: [
      scene('draw-normal-01', 'handshake', '/news-scenes/draw/normal/handshake', ['team', 'opponent'], 'center', ['draw']),
      scene('draw-normal-02', 'ball-contest', '/news-scenes/draw/normal/ball-contest', ['team', 'opponent'], 'center', ['duel']),
      scene('draw-normal-03', 'teams-walking', '/news-scenes/draw/normal/teams-walking', ['team', 'opponent'], 'center', ['final']),
      scene('draw-normal-04', 'midfield-wide', '/news-scenes/draw/normal/midfield-wide', ['team', 'opponent'], 'center', ['match']),
    ],
    crazy: [
      scene('draw-crazy-01', 'goal-mouth-chaos', '/news-scenes/draw/crazy/goal-mouth-chaos', ['team', 'opponent'], 'center', ['chaos', 'goals']),
      scene('draw-crazy-02', 'counterattack', '/news-scenes/draw/crazy/counterattack', ['team', 'opponent'], 'center', ['attack', 'goals']),
      scene('draw-crazy-03', 'goal-line', '/news-scenes/draw/crazy/goal-line', ['team', 'opponent'], 'right', ['goal']),
      scene('draw-crazy-04', 'box-chaos', '/news-scenes/draw/crazy/box-chaos', ['team', 'opponent'], 'center', ['chaos']),
      scene('draw-crazy-05', 'keeper-flying', '/news-scenes/draw/crazy/keeper-flying', ['team', 'opponent'], 'right', ['goalkeeper']),
    ],
  },
  transfer: {
    arrival: [
      scene('transfer-arrival-01', 'player-presentation', '/news-scenes/transfer/arrival/player-presentation', ['team'], 'center', ['player', 'presentation']),
      scene('transfer-arrival-02', 'shirt-presentation', '/news-scenes/transfer/arrival/shirt-presentation', ['team'], 'center', ['shirt']),
      scene('transfer-arrival-03', 'player-stadium', '/news-scenes/transfer/arrival/player-stadium', ['team'], 'center', ['stadium']),
      scene('transfer-arrival-04', 'player-walks-in', '/news-scenes/transfer/arrival/player-walks-in', ['team'], 'center', ['arrival']),
    ],
    departure: [
      scene('transfer-departure-01', 'player-walking-away', '/news-scenes/transfer/departure/player-walking-away', ['team'], 'center', ['departure']),
      scene('transfer-departure-02', 'empty-locker', '/news-scenes/transfer/departure/empty-locker', [], 'center', ['locker']),
      scene('transfer-departure-03', 'farewell-stadium', '/news-scenes/transfer/departure/farewell-stadium', ['team'], 'center', ['farewell']),
    ],
    move: [
      scene('transfer-move-01', 'two-shirts', '/news-scenes/transfer/move/two-shirts', ['team', 'opponent'], 'center', ['transfer']),
      scene('transfer-move-02', 'player-between-colors', '/news-scenes/transfer/move/player-between-colors', ['team', 'opponent'], 'center', ['player', 'clubs']),
      scene('transfer-move-03', 'stadium-switch', '/news-scenes/transfer/move/stadium-switch', ['team', 'opponent'], 'center', ['transfer']),
    ],
  },
  sanction: {
    player: [
      scene('sanction-player-01', 'red-card', '/news-scenes/sanction/player/red-card', ['team'], 'center', ['red-card']),
      scene('sanction-player-02', 'player-bench', '/news-scenes/sanction/player/player-bench', ['team'], 'center', ['bench']),
      scene('sanction-player-03', 'player-outside-pitch', '/news-scenes/sanction/player/player-outside-pitch', ['team'], 'center', ['suspension']),
      scene('sanction-player-04', 'referee-card', '/news-scenes/sanction/player/referee-card', ['team'], 'center', ['referee']),
    ],
    club: [
      scene('sanction-club-01', 'empty-stadium', '/news-scenes/sanction/club/empty-stadium', [], 'center', ['club']),
      scene('sanction-club-02', 'club-office', '/news-scenes/sanction/club/club-office', ['team'], 'center', ['club']),
      scene('sanction-club-03', 'stadium-gates', '/news-scenes/sanction/club/stadium-gates', ['team'], 'center', ['stadium']),
    ],
  },
};
