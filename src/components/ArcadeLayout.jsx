import { useLayoutEffect, useState } from 'react';
import { ApiStatus } from './ApiStatus.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { Navigation } from './Navigation.jsx';
import { TeamMark } from './TeamMark.jsx';
import { leaguePlaylist } from '../app/playlist.js';

function HeaderEmblems({ teams, side, navigate }) {
  return <div className={`header-emblems header-emblems-${side}`} aria-label={`Emblemas de equipos, lado ${side === 'left' ? 'izquierdo' : 'derecho'}`}>{teams.map(team => <button className="header-team-button" type="button" key={team.id} title={team.name} aria-label={`Abrir equipo ${team.name}`} onClick={() => navigate(`/equipos/${encodeURIComponent(team.id)}`)}><TeamMark team={team}/></button>)}</div>;
}

export function ArcadeLayout({ route, navigate, children, sidebar, error, dismissError, headerTeams = [] }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const resize = () => {
      const widthScale = window.innerWidth / 1536;
      const heightScale = window.innerHeight / 1024;
      setScale(Math.min(widthScale, Math.max(heightScale, widthScale * 0.94), 1.25));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const visibleTeams = headerTeams.slice(0, 12);
  const splitAt = Math.ceil(visibleTeams.length / 2);

  return <div className="desktop-frame" style={{ width: 1536 * scale, height: 1024 * scale }}>
    <div className="football-world" style={{ transform: `scale(${scale})` }}>
      <header className="game-header">
        <HeaderEmblems teams={visibleTeams.slice(0, splitAt)} side="left" navigate={navigate}/>
        <button className="brand" onClick={() => navigate('/')} aria-label="Koinonia e-League eFootball Tournaments">
          <img className="brand-logo" src="/koinonia-eleague-logo.png" alt="Koinonia e-League"/>
        </button>
        <HeaderEmblems teams={visibleTeams.slice(splitAt)} side="right" navigate={navigate}/>
        <ApiStatus/>
      </header>
      <div className="home-composition"><div className="left-rail"><Navigation route={route} navigate={navigate}/><MusicPlayer tracks={leaguePlaylist}/></div>{children}{sidebar}</div>
      {error && <div className="preview-notice" role="status">{error}<button onClick={dismissError} aria-label="Cerrar aviso">×</button></div>}
    </div>
  </div>;
}
