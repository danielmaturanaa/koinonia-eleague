import { useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { Button, Card, Chip, ConfirmStep, Notice, useToast } from '../../ui/index.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';
import { useApiMutation } from './useApiMutation.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');

/** Sala de control · vida de club: activarla, abrir y cerrar la postulación a La Velada, y el ranking de hinchadas. */
export function ClubLifeAdmin() {
  const toast = useToast();
  const status = useApiQuery(signal => endpoints.velada(signal), []);
  const ranking = useApiQuery(signal => endpoints.fanRanking(signal), []);
  const [confirm, setConfirm] = useState(null);
  const [hours, setHours] = useState(48);
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => { setConfirm(null); toast({ tone: 'success', title: 'LISTO' }); status.retry(); ranking.retry(); } });
  const data = status.data;
  const enabled = data?.clubLife?.enabled;
  const round = data?.round;
  return <div className="control-section">
    <Card title="VIDA DE CLUB" aside={<Chip tone={enabled ? 'green' : 'neutral'} icon={enabled ? 'check' : 'lock'}>{enabled ? 'ACTIVA' : 'APAGADA'}</Chip>}>
      <DataState query={status}/>
      <p className="control-note">CON LA VIDA DE CLUB ACTIVA, CADA PARTIDO DE CLUBES QUE TERMINE COBRA TAQUILLA AL LOCAL Y MUEVE HINCHAS Y ÁNIMO; LOS PRESIS PUEDEN HACER CONCIERTOS Y FIRMAR AUSPICIOS (SE COBRAN AL CERRAR CADA TORNEO DE LIGA). LOS PARTIDOS YA JUGADOS NO COBRAN NADA.</p>
      {data && !enabled && (confirm === 'start'
        ? <ConfirmStep message="¿ACTIVAR? DESDE AHORA CADA PARTIDO TERMINADO MUEVE PLATA E HINCHAS." confirmLabel="SÍ, ACTIVAR" busy={act.loading} onConfirm={() => act.execute(signal => endpoints.startClubLife(signal))} onCancel={() => setConfirm(null)}/>
        : <Button icon="stadium" onClick={() => setConfirm('start')}>ACTIVAR VIDA DE CLUB</Button>)}
      {enabled && data.clubLife.startedAt && <p className="control-note">ACTIVA DESDE EL {new Date(data.clubLife.startedAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' }).toUpperCase()}.</p>}
    </Card>
    {enabled && <Card title="LA VELADA DEL AÑO" aside={<Chip tone="navy" icon="mic">{round?.status === 'open' ? 'POSTULACIÓN ABIERTA' : round?.status === 'resolved' ? 'CON SEDE' : 'SIN POSTULACIÓN'}</Chip>}>
      <p className="control-note">UNA VEZ POR TEMPORADA. PIDE {people(data.requirements.minCapacity)} DE AFORO Y {people(data.requirements.minFollowers)} HINCHAS. SE RESUELVE SOLA AL CERRAR, O LA CIERRAS TÚ ANTES.</p>
      {round?.status === 'open' && <p className="control-note">CIERRA EL {new Date(round.closesAt).toLocaleString('es-CL', { timeZone: 'America/Santiago' }).toUpperCase()} · POSTULAN: {round.bidders.length ? round.bidders.map(bidder => upper(bidder.name)).join(', ') : 'NADIE TODAVÍA'}</p>}
      {round?.status === 'resolved' && <p className="control-note">IBAI: «{round.result?.line}»</p>}
      <div className="control-actions">
        {round?.status !== 'open' && <>
          <label className="control-picker">HORAS PARA POSTULAR<input type="number" min="1" max="336" value={hours} onChange={event => setHours(Number(event.target.value) || 48)}/></label>
          <Button icon="mic" disabled={act.loading} onClick={() => act.execute(signal => endpoints.openVelada({ closesAt: new Date(Date.now() + hours * 3600000).toISOString() }, signal))}>ABRIR POSTULACIÓN</Button>
        </>}
        {round?.status === 'open' && (confirm === 'resolve'
          ? <ConfirmStep message="¿CERRAR AHORA Y QUE IBAI ELIJA?" confirmLabel="SÍ, QUE ELIJA" busy={act.loading} onConfirm={() => act.execute(signal => endpoints.resolveVelada(signal))} onCancel={() => setConfirm(null)}/>
          : <><Button icon="gavel" onClick={() => setConfirm('resolve')}>CERRAR Y ELEGIR SEDE</Button><Button variant="ghost" onClick={() => act.execute(signal => endpoints.cancelVelada(signal))}>CANCELAR POSTULACIÓN</Button></>)}
      </div>
    </Card>}
    {act.error && <Notice tone="error">{act.error.message}</Notice>}
    {enabled && Array.isArray(ranking.data) && <Card title="RANKING DE HINCHADAS">
      <ol className="fan-ranking">{ranking.data.map(row => <li key={row.teamId}><b>{row.emoji ?? '⚽'} {upper(row.name)}</b><span>{people(row.followers)} HINCHAS</span><small>{upper(row.moodLabel)} · {row.mood}</small></li>)}</ol>
    </Card>}
  </div>;
}
