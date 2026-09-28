import { useAuth } from '../app/AuthGate.jsx';

const ROLE_LABELS = { admin: 'ADMIN', president: 'PRESI' };

export function AccountMenu() {
  const { user, role, logout } = useAuth();
  if (!user) return null;
  return <div className="account-menu">
    {user.avatarUrl && <img src={user.avatarUrl} alt="" width="28" height="28" referrerPolicy="no-referrer"/>}
    <b title={user.username}>{user.username}</b>
    {ROLE_LABELS[role] && <small>{ROLE_LABELS[role]}</small>}
    <button type="button" onClick={logout}>SALIR</button>
  </div>;
}
