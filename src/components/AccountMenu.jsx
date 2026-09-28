import { useEffect, useId, useRef, useState } from 'react';
import { useAuth } from '../app/AuthGate.jsx';

export function AccountMenu({ navigate, teams = [] }) {
  const { user, role, isAdmin, isOwner, teamId, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;
  const roleLabel = isOwner ? 'DUEÑO' : isAdmin ? 'ADMIN' : role === 'president' ? 'PRESIDENTE' : 'MIEMBRO';
  const team = teams.find(item => item.id === teamId);
  const go = path => { setOpen(false); navigate(path); };
  const avatar = className => user.avatarUrl
    ? <img className={className} src={user.avatarUrl} alt="" referrerPolicy="no-referrer"/>
    : <span className={`${className} account-avatar-empty`} aria-hidden="true">{user.username.charAt(0).toUpperCase()}</span>;

  return <div className="account-menu" ref={rootRef}>
    <button className="account-trigger" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} aria-label={`Cuenta de ${user.username}`} onClick={() => setOpen(value => !value)}>
      {avatar('account-avatar')}
    </button>
    {open && <div className="account-dropdown" id={menuId} role="menu">
      <div className="account-identity">
        {avatar('account-avatar account-avatar-large')}
        <div><b title={user.username}>{user.username}</b><small className={`account-role account-role-${isOwner ? 'owner' : role}`}>{roleLabel}</small></div>
      </div>
      {teamId && <button type="button" role="menuitem" onClick={() => go(`/equipos/${encodeURIComponent(teamId)}`)}>MI EQUIPO{team ? ` · ${team.name}` : ''}</button>}
      {isAdmin && <button type="button" role="menuitem" onClick={() => go('/personas')}>PERSONAS Y PERMISOS</button>}
      <button type="button" role="menuitem" className="account-logout" onClick={() => { setOpen(false); logout(); }}>SALIR</button>
    </div>}
  </div>;
}
