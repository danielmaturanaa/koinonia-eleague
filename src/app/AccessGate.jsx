import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../api/client.js';

export function AccessGate({ children }) {
  const [status, setStatus] = useState('checking');
  const [challenge, setChallenge] = useState(null);
  const [message, setMessage] = useState('');

  const loadChallenge = useCallback(async () => {
    setStatus('loading'); setMessage('');
    try {
      const response = await apiClient.post('/access/challenge', {});
      setChallenge(response.data); setStatus('challenge');
    } catch (error) {
      setStatus('error'); setMessage(error.message);
    }
  }, []);

  useEffect(() => {
    apiClient.get('/access/session').then(response => {
      if (response.data?.authenticated) setStatus('granted');
      else loadChallenge();
    }).catch(() => loadChallenge());
  }, [loadChallenge]);

  const answer = async teamId => {
    if (!challenge || status === 'answering') return;
    setStatus('answering'); setMessage('');
    try {
      await apiClient.post(`/access/challenge/${encodeURIComponent(challenge.challengeId)}/verify`, { teamId });
      setStatus('granted');
    } catch (error) {
      setMessage(error.message);
      loadChallenge();
    }
  };

  if (status === 'granted') return children;
  return <main className="access-gate">
    <section>
      <p className="access-gate-kicker">KOINONIA E-LEAGUE</p>
      <h1>¿RECONOCES ESTE EQUIPO?</h1>
      <p className="access-gate-copy">Elige la alternativa correcta para entrar. Tu acceso durará 7 días.</p>
      {challenge && <img className="access-gate-image" src={challenge.imageUrl} alt="Escudo o imagen de un equipo de la liga"/>}
      {(status === 'checking' || status === 'loading' || status === 'answering') && <p className="access-gate-status">CARGANDO DESAFÍO…</p>}
      {challenge && status !== 'answering' && <div className="access-gate-choices">
        {challenge.choices.map(choice => <button key={choice.id} type="button" onClick={() => answer(choice.id)}>{choice.name}</button>)}
      </div>}
      {message && <p className="access-gate-error">{message}</p>}
      {status === 'error' && <button className="access-gate-retry" type="button" onClick={loadChallenge}>REINTENTAR</button>}
    </section>
  </main>;
}
