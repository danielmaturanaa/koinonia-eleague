import { useMemo, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, PageHeader, formatDate, gp } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';

const asList = value => Array.isArray(value) ? value : [];

function relatedName(item, side, type, index) {
  const camel = `${side}${type}`;
  const snake = `${side}_${type.toLowerCase()}`;
  const embedded = item[camel] ?? item[snake];
  const id = embedded?.id ?? item[`${camel}Id`] ?? item[`${snake}_id`];
  return embedded?.name ?? item[`${camel}Name`] ?? item[`${snake}_name`] ?? index.get(id)?.name;
}

async function loadAllPlayers(signal) {
  const first = await endpoints.players({ page: 1, pageSize: 100 }, signal);
  const pages = first.pagination?.totalPages ?? 1;
  const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => endpoints.players({ page: index + 2, pageSize: 100 }, signal))) : [];
  return { data: [...asList(first.data), ...rest.flatMap(page => asList(page.data))] };
}

function TeamOptions({ teams }) {
  return <><option value="">SELECCIONAR</option>{teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}</>;
}

function PlayerOptions({ players, teamId }) {
  const available = teamId ? players.filter(player => (player.team?.id ?? player.teamId) === teamId) : players;
  return <><option value="">SELECCIONAR</option>{available.map(player => <option key={player.id} value={player.id}>{player.name} · {player.team?.name ?? 'LIBRE'}</option>)}</>;
}

function TransferForm({ teams, players, onChanged }) {
  const [form, setForm] = useState({ playerId: '', fromTeamId: '', toTeamId: '', gpAmount: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createTransfer(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'fromTeamId' ? { playerId: '' } : {}) }));
  const submit = event => {
    event.preventDefault();
    if (window.confirm(`¿REGISTRAR ESTA TRANSFERENCIA POR ${Number(form.gpAmount).toLocaleString('es-CL')} GP?`)) mutation.execute({ ...form, gpAmount: Number(form.gpAmount) });
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO DE ORIGEN<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR<select name="playerId" required value={form.playerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO DE DESTINO<select name="toTeamId" required value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>MONTO GP<input name="gpAmount" required type="number" min="0" step="1" value={form.gpAmount} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.fromTeamId || !form.playerId || !form.toTeamId || form.gpAmount === ''}>REGISTRAR TRANSFERENCIA</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function TradeForm({ teams, players, onChanged }) {
  const [form, setForm] = useState({ fromTeamId: '', toTeamId: '', fromPlayerId: '', toPlayerId: '', gpFrom: '', gpTo: '' });
  const mutation = useApiMutation((body, signal) => endpoints.createTrade(body, signal), { onSuccess: onChanged });
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value, ...(event.target.name === 'fromTeamId' ? { fromPlayerId: '' } : {}), ...(event.target.name === 'toTeamId' ? { toPlayerId: '' } : {}) }));
  const submit = event => {
    event.preventDefault();
    const payload = { fromTeamId: form.fromTeamId, toTeamId: form.toTeamId, fromPlayerId: form.fromPlayerId, toPlayerId: form.toPlayerId, ...(form.gpFrom ? { gpFrom: Number(form.gpFrom) } : {}), ...(form.gpTo ? { gpTo: Number(form.gpTo) } : {}) };
    if (window.confirm('¿REGISTRAR ESTE TRUEQUE Y SUS MONTOS GP ADICIONALES?')) mutation.execute(payload);
  };
  return <form className="admin-form market-form" onSubmit={submit}>
    <label>EQUIPO A<select name="fromTeamId" value={form.fromTeamId} onChange={change}><TeamOptions teams={teams}/></select></label>
    <label>JUGADOR A<select name="fromPlayerId" required value={form.fromPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.fromTeamId}/></select></label>
    <label>EQUIPO B<select name="toTeamId" value={form.toTeamId} onChange={change}><TeamOptions teams={teams.filter(team => team.id !== form.fromTeamId)}/></select></label>
    <label>JUGADOR B<select name="toPlayerId" required value={form.toPlayerId} onChange={change}><PlayerOptions players={players} teamId={form.toTeamId}/></select></label>
    <label>GP ADICIONAL DE A<input name="gpFrom" type="number" min="0" step="1" value={form.gpFrom} onChange={change}/></label>
    <label>GP ADICIONAL DE B<input name="gpTo" type="number" min="0" step="1" value={form.gpTo} onChange={change}/></label>
    <button className="action-button" disabled={mutation.loading || !form.fromTeamId || !form.toTeamId || !form.fromPlayerId || !form.toPlayerId}>REGISTRAR TRUEQUE</button>
    <FormFeedback mutation={mutation}/>
  </form>;
}

function MarketAdmin({ teams, players, onChanged }) {
  const [tab, setTab] = useState('transfer');
  return <section className="market-admin"><nav><button className={tab === 'transfer' ? 'active' : ''} onClick={() => setTab('transfer')}>NUEVA TRANSFERENCIA</button><button className={tab === 'trade' ? 'active' : ''} onClick={() => setTab('trade')}>NUEVO TRUEQUE</button></nav>{tab === 'transfer' ? <TransferForm teams={teams} players={players} onChanged={onChanged}/> : <TradeForm teams={teams} players={players} onChanged={onChanged}/>}</section>;
}

function TransferActions({ item, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Transfer`](item.id, signal), { onSuccess: onChanged });
  const status = String(item.status ?? 'pending').toLowerCase();
  const act = operation => {
    if (window.confirm(`¿${operation === 'approve' ? 'APROBAR' : operation === 'reject' ? 'RECHAZAR' : 'REVERSAR'} ESTA TRANSFERENCIA?`)) mutation.execute(operation);
  };
  return <><div className="mini-actions">{status === 'pending' && <><button onClick={() => act('approve')}>APROBAR</button><button className="danger" onClick={() => act('reject')}>RECHAZAR</button></>}{['approved','completed'].includes(status) && <button className="danger" onClick={() => act('reverse')}>REVERSAR</button>}</div><FormFeedback mutation={mutation}/></>;
}

function TradeActions({ item, onChanged }) {
  const mutation = useApiMutation((operation, signal) => endpoints[`${operation}Trade`](item.id, signal), { onSuccess: onChanged });
  const status = String(item.status ?? 'pending').toLowerCase();
  if (status !== 'pending') return null;
  const act = operation => {
    if (window.confirm(`¿${operation === 'approve' ? 'APROBAR' : 'RECHAZAR'} ESTE TRUEQUE?`)) mutation.execute(operation);
  };
  return <><div className="mini-actions"><button onClick={() => act('approve')}>APROBAR</button><button className="danger" onClick={() => act('reject')}>RECHAZAR</button></div><FormFeedback mutation={mutation}/></>;
}

function MarketPanel({ title, query, render }) {
  const rows = asList(query.data);
  return <section className="market-panel"><h2>{title}</h2><DataState query={query}/>{!query.loading && !query.error && rows.map(render)}</section>;
}

export function MarketPage({ teams }) {
  const [showAdmin, setShowAdmin] = useState(false);
  const transfers = useApiQuery(signal => endpoints.transfers({ page: 1, pageSize: 100 }, signal));
  const trades = useApiQuery(signal => endpoints.trades({ page: 1, pageSize: 100 }, signal));
  const freeAgents = useApiQuery(signal => endpoints.freeAgents({ page: 1, pageSize: 100 }, signal));
  const players = useApiQuery(loadAllPlayers);
  const refresh = () => { transfers.retry(); trades.retry(); freeAgents.retry(); players.retry(); };
  const playerRows = asList(players.data);
  const playersById = useMemo(() => new Map(playerRows.map(player => [player.id, player])), [playerRows]);
  const teamsById = useMemo(() => new Map(teams.map(team => [team.id, team])), [teams]);
  return <main className="newspaper data-page"><section className="data-paper"><PageHeader kicker="OPERACIONES OFICIALES" title="MERCADO DE FICHAJES"><button className="page-action" onClick={() => setShowAdmin(value => !value)}>{showAdmin ? 'CERRAR GESTIÓN' : '⚙ GESTIONAR MERCADO'}</button></PageHeader>
    {showAdmin && <MarketAdmin teams={teams} players={playerRows} onChanged={refresh}/>} 
    <div className={`market-grid ${showAdmin ? 'with-admin' : ''}`}>
      <MarketPanel title="TRANSFERENCIAS" query={transfers} render={item => <article className="market-item" key={item.id}><b>{item.player?.name ?? item.playerName ?? 'Jugador'}</b><span>{item.fromTeam?.name ?? 'Origen'} → {item.toTeam?.name ?? 'Destino'}</span><small>{gp(item.gpAmount)} · {item.status ?? 'pendiente'} · {formatDate(item.createdAt)}</small><TransferActions item={item} onChanged={refresh}/></article>}/>
      <MarketPanel title="TRUEQUES" query={trades} render={item => <article className="market-item" key={item.id}><b>{relatedName(item, 'from', 'Player', playersById) ?? 'Jugador'} ⇄ {relatedName(item, 'to', 'Player', playersById) ?? 'Jugador'}</b><span>{relatedName(item, 'from', 'Team', teamsById) ?? 'Origen'} / {relatedName(item, 'to', 'Team', teamsById) ?? 'Destino'}</span><small>{item.status ?? 'pendiente'}</small><TradeActions item={item} onChanged={refresh}/></article>}/>
      <MarketPanel title="AGENTES LIBRES" query={freeAgents} render={item => <article className="market-item" key={item.id}><b>{item.name}</b><span>{item.position ?? 'SIN POSICIÓN'}</span><small>{gp(item.gpValue)}</small></article>}/>
    </div>
  </section></main>;
}
