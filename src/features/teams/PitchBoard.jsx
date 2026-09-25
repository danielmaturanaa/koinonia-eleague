import { useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { PlayerFace } from '../../components/PlayerFace.jsx';
import { defaultFormationPositions, pitchPositionFor } from '../../utils/formationPositions.js';
import { shortPlayerName } from '../../utils/playerNames.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';

const openPlayer = player => { window.location.hash = `/jugadores/${encodeURIComponent(player.id)}`; };

// Carta al estilo eFootballDB: media y posición a la izquierda, foto a la derecha
// sobre los colores del club y el nombre en una franja inferior.
function PitchCard({ player, selected, swappable, editing, style, onPointerDown, onPointerMove, onPointerUp, onClick, bench }) {
  return <button type="button" className={`pitch-card ${bench ? 'bench' : ''} ${selected ? 'selected' : ''} ${swappable ? 'swappable' : ''} ${editing ? 'editing' : ''}`} style={style} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onClick={onClick} aria-pressed={editing ? selected : undefined} aria-label={`${player.name}${editing ? (selected ? ', seleccionado' : '') : ', ver ficha'}`}>
    <span className="pitch-card-stats"><b>{player.overall ?? '—'}</b><small>{player.position ?? '—'}</small></span>
    <span className="pitch-card-photo"><PlayerFace src={player.faceUrl} name={player.name} className="pitch-card-face"/></span>
    <span className="pitch-card-name"><i>{player.jerseyNumber ?? '–'}</i>{shortPlayerName(player)}</span>
  </button>;
}

// Cancha estilo FIFA: en modo edición se toca un titular y luego un suplente (cambio)
// u otro titular (intercambian posiciones); también se puede arrastrar para ubicarlo.
export function PitchBoard({ team, starters, substitutes, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [localPositions, setLocalPositions] = useState({});
  const pitchRef = useRef(null);
  const drag = useRef(null);
  const signature = starters.map(player => `${player.id}:${player.pitchX}:${player.pitchY}`).join('|');
  useEffect(() => setLocalPositions({}), [signature]);
  const defaults = defaultFormationPositions(starters);
  const positionOf = player => localPositions[player.id] ?? pitchPositionFor(player, defaults);
  const done = () => { setSelectedId(null); onChanged?.(); };
  const swap = useApiMutation((substituteId, signal) => endpoints.swapSquadMembers(team.id, selectedId, substituteId, signal), { onSuccess: done });
  const move = useApiMutation((updates, signal) => Promise.all(updates.map(({ id, x, y }) => endpoints.updateSquadMember(team.id, id, { pitchX: x, pitchY: y }, signal))), { onSuccess: done });
  const busy = swap.loading || move.loading;
  const selected = starters.find(player => player.id === selectedId);

  const pointFor = event => {
    const rect = pitchRef.current.getBoundingClientRect();
    return {
      x: Math.min(95, Math.max(5, ((event.clientX - rect.left) / rect.width) * 100)),
      y: Math.min(94, Math.max(6, ((event.clientY - rect.top) / rect.height) * 100)),
    };
  };
  const onPointerDown = player => event => {
    if (!editing || busy) return;
    drag.current = { id: player.id, startX: event.clientX, startY: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = player => event => {
    const current = drag.current;
    if (!current || current.id !== player.id) return;
    if (!current.moved && Math.hypot(event.clientX - current.startX, event.clientY - current.startY) < 6) return;
    current.moved = true;
    setLocalPositions(positions => ({ ...positions, [player.id]: pointFor(event) }));
  };
  const onPointerUp = player => event => {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) return;
    const { x, y } = pointFor(event);
    move.execute([{ id: player.id, x, y }]);
  };
  const onStarterClick = player => () => {
    if (!editing) { openPlayer(player); return; }
    if (busy) return;
    if (!selectedId) { setSelectedId(player.id); return; }
    if (selectedId === player.id) { setSelectedId(null); return; }
    // Dos titulares: intercambian su lugar en la cancha.
    const first = positionOf(selected);
    const second = positionOf(player);
    setLocalPositions(positions => ({ ...positions, [selected.id]: second, [player.id]: first }));
    move.execute([{ id: selected.id, ...second }, { id: player.id, ...first }]);
  };
  const onBenchClick = player => () => {
    if (!editing) { openPlayer(player); return; }
    if (selectedId && !busy) swap.execute(player.id);
  };
  const hint = !editing ? 'Toca un jugador para ver su ficha.'
    : selected ? `${shortPlayerName(selected)} seleccionado: toca un suplente para hacer el cambio u otro titular para intercambiar posiciones.`
      : 'Toca un titular para cambiarlo, o arrástralo para moverlo en la cancha.';

  const colors = team?.colors ?? {};
  const cardColors = { '--card-primary': colors.primary ?? '#062764', '--card-secondary': colors.secondary ?? '#a90020' };
  return <section className={`club-card pitch-board ${editing ? 'is-editing' : ''}`} style={cardColors}>
    <header><h3>ALINEACIÓN <small>{starters.length} TITULARES · {substitutes.length} SUPLENTES</small></h3><button type="button" className={`pitch-board-toggle ${editing ? 'active' : ''}`} onClick={() => { setEditing(value => !value); setSelectedId(null); }}>{editing ? '✓ LISTO' : '✎ EDITAR ALINEACIÓN'}</button></header>
    <p className="pitch-board-hint" role="status">{busy ? 'GUARDANDO…' : hint}</p>
    {starters.length ? <div className="pitch-board-field" ref={pitchRef}>
      <span className="pitch-line pitch-halfway" aria-hidden="true"/><span className="pitch-line pitch-circle" aria-hidden="true"/><span className="pitch-line pitch-box top" aria-hidden="true"/><span className="pitch-line pitch-box bottom" aria-hidden="true"/>
      {starters.map(player => { const { x, y } = positionOf(player); return <PitchCard key={player.id} player={player} editing={editing} selected={selectedId === player.id} style={{ left: `${x}%`, top: `${y}%` }} onPointerDown={onPointerDown(player)} onPointerMove={onPointerMove(player)} onPointerUp={onPointerUp(player)} onClick={onStarterClick(player)}/>; })}
    </div> : <p className="empty-copy">NO HAY TITULARES DEFINIDOS.</p>}
    <div className="pitch-board-bench"><h4>BANCA</h4>{substitutes.length ? <div>{substitutes.map(player => <PitchCard key={player.id} bench player={player} editing={editing} swappable={Boolean(selectedId)} onClick={onBenchClick(player)}/>)}</div> : <p className="empty-copy">SIN SUPLENTES.</p>}</div>
    <FormFeedback mutation={swap}/><FormFeedback mutation={move}/>
  </section>;
}
