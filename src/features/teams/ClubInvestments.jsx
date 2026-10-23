import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { Button, Card, Chip, ConfirmStep, HowItWorks, Icon, Notice, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();

/** Centro de entrenamiento: en qué gastar la plata sin comprarse partidos. Sube el ánimo de todo el plantel. */
export function ClubInvestments({ team, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useApiQuery(signal => endpoints.teamInvestments(team.id, signal), [team.id]);
  const [confirm, setConfirm] = useState(false);
  const build = useApiMutation(signal => endpoints.invest(team.id, 'training', {}, signal), {
    onSuccess: () => { setConfirm(false); toast({ tone: 'money', title: 'CENTRO DE ENTRENAMIENTO LISTO' }); query.retry(); onChanged?.(); },
  });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  const { training } = data;
  return <Card title="CENTRO DE ENTRENAMIENTO" className="club-investments" aside={<Chip icon="coin">EN CAJA {gp(data.balance)}</Chip>}>
    <article className="investment">
      <header><Icon name="ball" size={18}/><b>{training.level ? `${upper(training.label)} · NIVEL ${training.level}` : 'TODAVÍA NO TIENES CENTRO DE ENTRENAMIENTO'}</b></header>
      {training.level > 0 && <p>ÁNIMO +{training.mood} PARA TODO EL PLANTEL · MANTENCIÓN {gp(training.upkeep)} POR TORNEO</p>}
      {training.next
        ? <><p className="investment-gain">{training.next.label}: ánimo +{training.next.mood} para todo el plantel por {gp(training.next.cost)} (mantención {gp(training.next.upkeep)} por torneo)</p>
          {canEdit && (confirm
            ? <ConfirmStep message={`¿Construir ${training.next.label.toLowerCase()} por ${gp(training.next.cost)}? Después paga ${gp(training.next.upkeep)} de mantención cada torneo.`} confirmLabel="SÍ, CONSTRUIR" busy={build.loading} onConfirm={() => build.execute()} onCancel={() => setConfirm(false)}/>
            : <Button size="sm" icon="ball" disabled={build.loading || data.balance < training.next.cost} onClick={() => setConfirm(true)}>{training.level ? 'MEJORAR' : 'CONSTRUIR'}</Button>)}</>
        : <p className="investment-gain">Ya tienes la mejor ciudad deportiva.</p>}
    </article>
    {build.error && <Notice tone="error">{build.error.message}</Notice>}
    <HowItWorks><p>No compra partidos: les sirve a tus jugadores. Mientras lo tengas, todo el plantel anda de mejor ánimo (renuevan más barato y piden menos), pero cuesta mantención cada torneo de liga. Para la pretemporada, organiza un torneo en la página de Torneos.</p></HowItWorks>
  </Card>;
}
