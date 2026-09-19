import { useEffect, useId, useRef, useState } from 'react';
import { endpoints } from '../api/endpoints.js';
import { PlayerFace } from './PlayerFace.jsx';

const MIN_QUERY = 2;
const gp = value => typeof value === 'number' ? `${value.toLocaleString('es-CL')} GP` : '—';

// Une la plantilla de la liga con el catálogo de eFootballDB y responde, para cada
// jugador, quién lo tiene: un equipo, nadie (agente libre) o solo existe en el juego.
function mergeResults(leaguePlayers, catalogCards) {
  const results = leaguePlayers.map(player => ({
    key: `league-${player.id}`,
    kind: player.team ? 'owned' : 'free',
    id: player.id,
    name: player.name,
    faceUrl: player.faceUrl,
    detail: [player.position, player.nationality].filter(Boolean).join(' · '),
    value: player.gpValue,
    team: player.team,
  }));
  const known = new Set(results.map(result => result.id));
  for (const card of catalogCards) {
    if (card.league?.id && known.has(card.league.id)) continue;
    if (card.league?.id) {
      known.add(card.league.id);
      results.push({ key: `league-${card.league.id}`, kind: card.league.teamId ? 'owned' : 'free', id: card.league.id, name: card.league.name ?? card.name, faceUrl: card.faceUrl, detail: [card.position, card.nationality].filter(Boolean).join(' · '), value: null, team: card.league.teamId ? { id: card.league.teamId, name: card.league.teamName } : null });
      continue;
    }
    results.push({ key: `game-${card.pesId}-${card.variation}`, kind: 'game', name: card.name, faceUrl: card.faceUrl, detail: [card.position, card.nationality, card.clubName].filter(Boolean).join(' · '), value: card.gpPrice });
  }
  const order = { owned: 0, free: 1, game: 2 };
  return results.sort((left, right) => order[left.kind] - order[right.kind]);
}

function statusLabel(result, teamsById) {
  if (result.kind === 'owned') {
    const team = teamsById.get(result.team?.id) ?? result.team;
    return <span className="search-status owned">{team?.imageUrl && <img src={team.imageUrl} alt=""/>}LO TIENE {team?.name ?? 'UN EQUIPO'}</span>;
  }
  if (result.kind === 'free') return <span className="search-status free">AGENTE LIBRE EN LA LIGA</span>;
  return <span className="search-status game">SOLO EN eFOOTBALL</span>;
}

export function GlobalSearch({ navigate, teams = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ loading: false, error: null, results: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listId = useId();
  const teamsById = new Map(teams.map(team => [team.id, team]));
  const term = query.trim();

  useEffect(() => {
    const openWithSlash = event => {
      if (event.key !== '/' || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      setOpen(true);
    };
    document.addEventListener('keydown', openWithSlash);
    return () => document.removeEventListener('keydown', openWithSlash);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  useEffect(() => {
    if (term.length < MIN_QUERY) {
      setState({ loading: false, error: null, results: [] });
      return undefined;
    }
    const controller = new AbortController();
    setState(current => ({ ...current, loading: true, error: null }));
    const timer = window.setTimeout(() => {
      Promise.all([
        endpoints.players({ q: term, pageSize: 10 }, controller.signal),
        endpoints.efootballPlayers({ q: term }, controller.signal),
      ]).then(([league, catalog]) => {
        setActive(0);
        setState({ loading: false, error: null, results: mergeResults(league?.data ?? [], catalog?.data ?? []) });
      }).catch(error => {
        if (error?.code !== 'REQUEST_ABORTED') setState({ loading: false, error, results: [] });
      });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [term]);

  const choose = result => {
    if (!result) return;
    setOpen(false);
    setQuery('');
    if (result.kind === 'game') navigate(`/equipos/jugadores/importar?q=${encodeURIComponent(result.name)}`);
    else navigate(`/jugadores/${encodeURIComponent(result.id)}`);
  };

  const onKeyDown = event => {
    if (event.key === 'Escape') setOpen(false);
    else if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, state.results.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); choose(state.results[active]); }
  };

  return <div className="global-search" ref={rootRef}>
    <button type="button" className="global-search-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)} title="Buscar jugador (tecla /)"><span aria-hidden="true">⌕</span><b>BUSCAR</b></button>
    {open && <div className="global-search-panel" role="dialog" aria-label="Buscar jugador">
      <input ref={inputRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={onKeyDown} placeholder="¿QUIÉN TIENE A…? ESCRIBE UN JUGADOR" aria-label="Buscar jugador" aria-controls={listId} autoComplete="off"/>
      <div className="global-search-results" id={listId} role="listbox">
        {term.length < MIN_QUERY ? <p className="global-search-hint">Busca en la liga y en eFootballDB al mismo tiempo. Te dice si el jugador tiene dueño, está libre o solo existe en el juego.</p>
          : state.loading && !state.results.length ? <p className="global-search-hint">BUSCANDO…</p>
          : state.error ? <p className="global-search-hint">NO SE PUDO BUSCAR: {state.error.message}</p>
          : !state.results.length ? <p className="global-search-hint">NINGÚN JUGADOR COINCIDE CON “{term}”.</p>
          : state.results.map((result, index) => <button type="button" role="option" aria-selected={index === active} className={`global-search-result ${index === active ? 'active' : ''}`} key={result.key} onMouseEnter={() => setActive(index)} onClick={() => choose(result)}>
            <PlayerFace src={result.faceUrl} name={result.name}/>
            <span className="global-search-name"><b>{result.name}</b><small>{result.detail || 'SIN DATOS'}{result.value != null ? ` · ${gp(result.value)}` : ''}</small></span>
            {statusLabel(result, teamsById)}
          </button>)}
      </div>
      {term.length >= MIN_QUERY && <button type="button" className="global-search-all" onClick={() => { setOpen(false); navigate('/equipos/jugadores'); }}>VER TODOS LOS JUGADORES DE LA LIGA →</button>}
    </div>}
  </div>;
}
