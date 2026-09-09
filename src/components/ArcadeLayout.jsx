import { useLayoutEffect, useState } from 'react';
import { ApiStatus } from './ApiStatus.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { Navigation } from './Navigation.jsx';
import { TeamMark } from './TeamMark.jsx';
import { TransparentLogo } from './TransparentLogo.jsx';
import { leaguePlaylist } from '../app/playlist.js';

const DESIGN_HEIGHT = 1024;
const DESIGN_WIDTH = Math.round(DESIGN_HEIGHT * 4 / 3);

function HeaderEmblems({ teams, side, navigate }) {
  return <div className={`header-emblems header-emblems-${side}`} aria-label={`Emblemas de equipos, lado ${side === 'left' ? 'izquierdo' : 'derecho'}`}>{teams.map(team => <button className="header-team-button" type="button" key={team.id} title={team.name} aria-label={`Abrir equipo ${team.name}`} onClick={() => navigate(`/equipos/${encodeURIComponent(team.id)}`)}><TeamMark team={team}/></button>)}</div>;
}

export function ArcadeLayout({ route, navigate, children, sidebar, error, dismissError, headerTeams = [] }) {
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const resize = () => {
      const widthScale = window.innerWidth / DESIGN_WIDTH;
      const heightScale = window.innerHeight / DESIGN_HEIGHT;
      setScale(Math.min(widthScale, heightScale, 1.25));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const visibleTeams = headerTeams.slice(0, 12);
  const splitAt = Math.ceil(visibleTeams.length / 2);

  return <div className="desktop-frame" style={{ width: DESIGN_WIDTH * scale, height: DESIGN_HEIGHT * scale }}>
    <div className="football-world" style={{ transform: `scale(${scale})` }}>
      <header className="game-header">
        <HeaderEmblems teams={visibleTeams.slice(0, splitAt)} side="left" navigate={navigate}/>
        <button className="brand" onClick={() => navigate('/')} aria-label="Koinonia e-League eFootball Tournaments">
          <TransparentLogo className="brand-logo" src="/koinonia-eleague-logo.png" label="Koinonia e-League"/>
        </button>
        <HeaderEmblems teams={visibleTeams.slice(splitAt)} side="right" navigate={navigate}/>
        <ApiStatus/>
      </header>
      <div className="home-composition"><div className="left-rail"><Navigation route={route} navigate={navigate}/><MusicPlayer tracks={leaguePlaylist}/></div>{children}{sidebar}</div>
      {error && <div className="preview-notice" role="status">{error}<button onClick={dismissError} aria-label="Cerrar aviso">×</button></div>}
    </div>
  </div>;
}
