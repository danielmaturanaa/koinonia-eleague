import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Button, Card, Chip, ConfirmStep, HowItWorks, Icon, Notice, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');

/** En qué gastar la plata sin comprarse partidos: obras del estadio, gira de pretemporada y centro de entrenamiento. */
export function ClubInvestments({ team, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useApiQuery(signal => endpoints.teamInvestments(team.id, signal), [team.id]);
  const [confirm, setConfirm] = useState(null);
  const invest = useApiMutation(({ kind, body }, signal) => endpoints.invest(team.id, kind, body, signal), {
    onSuccess: () => { setConfirm(null); toast({ tone: 'money', title: 'INVERSIÓN HECHA' }); query.retry(); onChanged?.(); },
  });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  const ask = (key, message, kind, body) => (confirm === key
    ? <ConfirmStep message={message} confirmLabel="SÍ, INVERTIR" busy={invest.loading} onConfirm={() => invest.execute({ kind, body })} onCancel={() => setConfirm(null)}/>
    : null);
  const { expansion, training, tour } = data;
  return <Card title="INVERSIONES DEL CLUB" className="club-investments" aside={<Chip icon="coin">EN CAJA {gp(data.balance)}</Chip>}>
    <div className="investment-grid">
      <article className="investment">
        <header><Icon name="stadium" size={18}/><b>AMPLIAR EL ESTADIO</b></header>
        {expansion ? <>
          <p>{upper(expansion.stadiumName)} · {people(expansion.capacity)} ASIENTOS · OBRAS {expansion.steps} DE {expansion.maxSteps}</p>
          {expansion.available
            ? <><p className="investment-gain">+{people(expansion.seats)} asientos por {gp(expansion.cost)}</p>
              {canEdit && (ask('stadium', `¿Ampliar el estadio en ${people(expansion.seats)} asientos por ${gp(expansion.cost)}? Las obras quedan en el estadio aunque lo vendas.`, 'stadium')
                ?? <Button size="sm" icon="stadium" disabled={invest.loading || data.balance < expansion.cost} onClick={() => setConfirm('stadium')}>AMPLIAR</Button>)}</>
            : <p className="investment-gain">Ya no se puede ampliar más.</p>}
        </> : <p>Necesitas un estadio propio para ampliarlo. Cómpralo en la pestaña Estadio.</p>}
      </article>
      <article className="investment">
        <header><Icon name="people" size={18}/><b>GIRA DE PRETEMPORADA</b></header>
        {tour.done
          ? <p className="investment-gain">Esta temporada ya hiciste la {tour.done.label.toLowerCase()}: +{people(tour.done.followersGained)} hinchas.</p>
          : <ul className="tour-options">{tour.options.map(option => <li key={option.key}>
            <div><b>{upper(option.label)}</b><small>+{people(option.followers)} HINCHAS · ÁNIMO +{option.mood} DEL PLANTEL · {gp(option.cost)}</small></div>
            {canEdit && (ask(`tour:${option.key}`, `¿Hacer la ${option.label.toLowerCase()} por ${gp(option.cost)}? Solo hay una gira por temporada.`, 'tour', { destination: option.key })
              ?? <Button size="sm" variant="ghost" disabled={invest.loading || data.balance < option.cost} onClick={() => setConfirm(`tour:${option.key}`)}>IR</Button>)}
          </li>)}</ul>}
      </article>
      <article className="investment">
        <header><Icon name="ball" size={18}/><b>CENTRO DE ENTRENAMIENTO</b></header>
        <p>{training.level ? `${upper(training.label)} (NIVEL ${training.level}) · ÁNIMO +${training.mood} · MANTENCIÓN ${gp(training.upkeep)} POR TORNEO` : 'TODAVÍA NO TIENES CENTRO DE ENTRENAMIENTO'}</p>
        {training.next
          ? <><p className="investment-gain">{training.next.label}: ánimo +{training.next.mood} para todo el plantel por {gp(training.next.cost)} (mantención {gp(training.next.upkeep)} por torneo)</p>
            {canEdit && (ask('training', `¿Construir ${training.next.label.toLowerCase()} por ${gp(training.next.cost)}? Después paga ${gp(training.next.upkeep)} de mantención cada torneo.`, 'training')
              ?? <Button size="sm" icon="ball" disabled={invest.loading || data.balance < training.next.cost} onClick={() => setConfirm('training')}>{training.level ? 'MEJORAR' : 'CONSTRUIR'}</Button>)}</>
          : <p className="investment-gain">Ya tienes la mejor ciudad deportiva.</p>}
      </article>
    </div>
    {invest.error && <Notice tone="error">{invest.error.message}</Notice>}
    <HowItWorks><p>Esto no compra partidos: les sirve a tus hinchas y a tus jugadores. Ampliar el estadio suma asientos (más taquilla si se te llena y un poco más de TV). La gira trae hinchas nuevos y el plantel vuelve motivado para el torneo que viene. El centro de entrenamiento sube el ánimo de todo el plantel mientras lo tengas, pero cuesta mantención cada torneo.</p></HowItWorks>
  </Card>;
}
