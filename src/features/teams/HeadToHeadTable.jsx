import { endpoints } from '../../api/endpoints.js';
import { EntityLink } from '../../components/EntityLink.jsx';
import { TeamMark } from '../../components/TeamMark.jsx';
import { Card } from '../../ui/index.js';
import { DataState } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const gameTitle = game => `${game.goalsFor}-${game.goalsAgainst} · ${game.tournament ?? ''}`;

/** Cara a cara histórico del club contra cada rival que enfrentó, en todos los torneos. */
export function HeadToHeadTable({ team, teams = [] }) {
  const query = useApiQuery(signal => endpoints.teamHeadToHead(team.id, signal), [team.id]);
  const data = query.data;
  if (!data) return <Card title="CARA A CARA HISTÓRICO"><DataState query={query}/></Card>;
  if (!data.rivals.length) return <Card title="CARA A CARA HISTÓRICO"><p className="empty-copy">Todavía no jugó partidos oficiales.</p></Card>;
  const byId = new Map(teams.map(item => [item.id, item]));
  const { totals } = data;
  const sanctions = data.rivals.reduce((sum, row) => sum + row.sanctions, 0);
  return <Card title="CARA A CARA HISTÓRICO" className="h2h-league" aside={<small>{totals.played} partidos · {totals.wins}G {totals.draws}E {totals.losses}P</small>}>
    <div className="h2h-league-scroll">
      <table className="h2h-league-table">
        <thead><tr><th className="rival">Rival</th><th title="Partidos jugados">PJ</th><th title="Ganados">G</th><th title="Empatados">E</th><th title="Perdidos">P</th><th title="Goles a favor y en contra">Goles</th><th className="last">Últimos</th><th className="share" aria-label="Reparto"/></tr></thead>
        <tbody>{data.rivals.map(row => {
          const rival = { ...row.rival, ...(byId.get(row.rival.id) ?? {}) };
          const name = <><TeamMark team={rival} className="h2h-league-crest"/><span>{rival.name}</span></>;
          return <tr key={row.rival.id}>
            <td className="rival">{row.rival.hidden ? <span className="h2h-league-name is-gone">{name}</span> : <EntityLink to="team" id={row.rival.id} className="h2h-league-name">{name}</EntityLink>}
              {row.sanctions > 0 && <small className="h2h-league-note">{row.sanctions} por castigo</small>}</td>
            <td>{row.played}</td><td className="win">{row.wins}</td><td className="draw">{row.draws}</td><td className="loss">{row.losses}</td>
            <td className="goals">{row.goalsFor}-{row.goalsAgainst}</td>
            <td className="last"><span className="h2h-league-last">{row.last.map(game => <EntityLink key={game.matchId} to="match" id={game.matchId} className={`club-form-pill form-${game.result}`} title={gameTitle(game)}>{game.result}</EntityLink>)}</span></td>
            <td className="share"><span className="h2h-bar" aria-label={`${row.wins} ganados, ${row.draws} empates, ${row.losses} perdidos`}>
              <span className="win" style={{ flex: row.wins }}/><span className="draw" style={{ flex: row.draws }}/><span className="loss" style={{ flex: row.losses }}/>
            </span></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    {sanctions > 0 && <p className="club-life-hint">Los partidos castigados cuentan con su resultado oficial.</p>}
  </Card>;
}
