import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Scoreboard } from '../../components/Scoreboard.jsx';
import { useApiQuery } from './useApiQuery.js';

export function MatchScoreboardPage({ matchId, onBack }) {
  const [mode, setMode] = useState('manage');
  const teams = useApiQuery(signal => endpoints.teams({ pageSize: 100 }, signal));
  return <main className="scoreboard-page">
    <div className="scoreboard-page-bar">
      <button className="scoreboard-back" onClick={onBack}>← PARTIDOS</button>
      <div className="scoreboard-mode-toggle">
        <button className={mode === 'view' ? 'active' : ''} onClick={() => setMode('view')}>VER</button>
        <button className={mode === 'manage' ? 'active' : ''} onClick={() => setMode('manage')}>GESTIONAR</button>
      </div>
    </div>
    <Scoreboard matchId={matchId} mode={mode} density="full" teams={Array.isArray(teams.data) ? teams.data : []}/>
  </main>;
}
