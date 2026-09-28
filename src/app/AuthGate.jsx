import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiClient, apiUrl } from '../api/client.js';

const ANONYMOUS = { user: null, role: 'member', isAdmin: false, isOwner: false, canOperateMatches: false, teamId: null, canEditTeam: () => false, logout: () => {} };
const AuthContext = createContext(ANONYMOUS);

export const useAuth = () => useContext(AuthContext);

const AUTH_ERRORS = {
  not_member: 'Tu cuenta de Discord no está en el servidor de la liga.',
  denied: 'Cancelaste el acceso con Discord.',
  invalid_state: 'El inicio de sesión expiró. Intenta de nuevo.',
  discord_unavailable: 'Discord no respondió. Intenta de nuevo en un momento.',
};

// El callback de Discord vuelve a /?auth_error=...; se lee una vez y se limpia de la URL.
function takeAuthError() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('auth_error');
  if (!code) return '';
  params.delete('auth_error');
  const query = params.toString();
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`);
  return AUTH_ERRORS[code] ?? 'No se pudo iniciar sesión con Discord.';
}

export function AuthGate({ children }) {
  const [status, setStatus] = useState('checking');
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(takeAuthError);

  const load = useCallback(async () => {
    setStatus('checking');
    try {
      const response = await apiClient.get('/auth/me');
      setUser(response.data?.authenticated ? response.data.user : null);
      setStatus(response.data?.authenticated ? 'ready' : 'anonymous');
    } catch (error) {
      setMessage(error.message);
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  // Una sesión vencida a mitad de uso devuelve 401: volvemos a la pantalla de entrada.
  useEffect(() => {
    const expired = () => { setUser(null); setStatus('anonymous'); };
    window.addEventListener('koinonia:auth-required', expired);
    return () => window.removeEventListener('koinonia:auth-required', expired);
  }, []);

  const logout = useCallback(async () => {
    try { await apiClient.post('/auth/logout', {}); } finally { setUser(null); setStatus('anonymous'); }
  }, []);

  const value = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    return {
      user, role: user?.role ?? 'member', isAdmin, isOwner: Boolean(user?.isOwner), canOperateMatches: Boolean(user?.canOperateMatches), teamId: user?.teamId ?? null, logout,
      // Solo comodidad de interfaz: la API vuelve a comprobar cada escritura.
      canEditTeam: teamId => isAdmin || Boolean(teamId && user?.teamIds?.includes(teamId)),
    };
  }, [user, logout]);

  if (status === 'ready') return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  return <main className="access-gate">
    <section>
      <p className="access-gate-kicker">KOINONIA E-LEAGUE</p>
      <h1>ENTRA A LA LIGA</h1>
      <p className="access-gate-copy">Inicia sesión con Discord. Solo pueden entrar los miembros del servidor.</p>
      {status === 'checking' && <p className="access-gate-status">COMPROBANDO SESIÓN…</p>}
      {status === 'anonymous' && <a className="access-gate-login" href={apiUrl('/auth/discord/login')}>ENTRAR CON DISCORD</a>}
      {status === 'error' && <button className="access-gate-retry" type="button" onClick={load}>REINTENTAR</button>}
      {message && <p className="access-gate-error" role="alert">{message}</p>}
    </section>
  </main>;
}
