import { ApiStatus } from './ApiStatus.jsx';
import { MusicPlayer } from './MusicPlayer.jsx';
import { Navigation } from './Navigation.jsx';
import { TransparentLogo } from './TransparentLogo.jsx';

export function SiteLayout({ route, navigate, children, sidebar, error, dismissError, playlist = [] }) {
  return <div className="site">
    <header className="site-header">
      <div className="site-header-inner">
        <button className="brand" onClick={() => navigate('/')} aria-label="Koinonia e-League, ir al inicio">
          <TransparentLogo className="brand-logo" src="/koinonia-eleague-logo.png" label="Koinonia e-League"/>
        </button>
        <Navigation route={route} navigate={navigate}/>
        <MusicPlayer tracks={playlist}/>
      </div>
    </header>
    <div className={`site-body ${sidebar ? 'with-sidebar' : ''}`}>
      <div className="site-content">{children}</div>
      {sidebar}
    </div>
    <footer className="site-footer"><span>KOINONIA e-LEAGUE · FÚTBOL VIRTUAL. PASIÓN REAL.</span><ApiStatus/></footer>
    {error && <div className="preview-notice" role="status">{error}<button onClick={dismissError} aria-label="Cerrar aviso">×</button></div>}
  </div>;
}
