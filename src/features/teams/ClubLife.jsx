import { useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useAuth } from '../../app/AuthGate.jsx';
import { GpInput } from '../../components/GpInput.jsx';
import { EntityLink } from '../../components/EntityLink.jsx';
import { Button, Card, Chip, ConfirmStep, EmptyState, HowItWorks, Icon, Notice, Stat, useToast } from '../../ui/index.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { DataState, gp } from '../public/DataStates.jsx';
import { useApiQuery } from '../public/useApiQuery.js';

const upper = text => String(text ?? '').toUpperCase();
const people = value => Number(value ?? 0).toLocaleString('es-CL');
const compact = value => {
  const number = Number(value ?? 0);
  if (number >= 1_000_000) return `${(number / 1_000_000).toLocaleString('es-CL', { maximumFractionDigits: 2 })} M`;
  if (number >= 10_000) return `${Math.round(number / 1000).toLocaleString('es-CL')} MIL`;
  return people(number);
};
const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${people(Math.abs(value))}`;
const MOOD_TONE = value => (value >= 65 ? 'good' : value < 35 ? 'bad' : 'default');
const when = value => {
  const date = new Date(`${String(value).replace(' ', 'T')}${/Z|\+/.test(String(value)) ? '' : 'Z'}`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', timeZone: 'America/Santiago' }).toUpperCase();
};

function OffNotice() {
  return <EmptyState icon="stadium" title="LA VIDA DE CLUB AÚN NO PARTE">CUANDO LA ADMINISTRACIÓN LA ACTIVE, CADA PARTIDO DE LOCAL COBRARÁ ENTRADAS SEGÚN TU HINCHADA Y PODRÁS HACER CONCIERTOS, VENDER TUS DERECHOS DE TV Y POSTULAR A LA VELADA.</EmptyState>;
}

/** Gradas pixel: se llenan según la ocupación (0–100). */
function Stands({ occupancy = 0, label }) {
  const rows = 6;
  const seats = 28;
  const filled = Math.round(Math.max(0, Math.min(100, occupancy)) / 100 * rows * seats);
  return <div className="venue-stands" role="img" aria-label={label ?? `Ocupación ${occupancy}%`}>
    {Array.from({ length: rows }, (_, row) => <div key={row} className="venue-row">{Array.from({ length: seats }, (_, seat) => {
      // Se llena desde abajo (filas cercanas a la cancha) hacia arriba, de forma pareja.
      const index = (rows - 1 - row) * seats + seat;
      // Camisetas de colores salpicadas (estable por asiento): rojo del club, blanco y amarillo.
      const shirt = ((seat * 7 + row * 13) * 2654435761 >>> 0) % 9;
      return <i key={seat} className={index < filled ? `on ${shirt === 0 ? 'alt' : shirt === 1 ? 'gold' : ''}` : ''}/>;
    })}</div>)}
    <div className="venue-pitch" aria-hidden="true"/>
  </div>;
}

function TierPicker({ fans, canEdit, onChanged }) {
  const toast = useToast();
  const save = useApiMutation((tier, signal) => endpoints.setTicketTier(fans.teamId, tier, signal), { onSuccess: () => { toast({ tone: 'success', title: 'PRECIO DE LA ENTRADA ACTUALIZADO' }); onChanged?.(); } });
  const effect = { popular: 'MÁS GENTE, MENOS PLATA POR CABEZA. LA HINCHADA LO AGRADECE.', normal: 'EL PRECIO DE SIEMPRE.', premium: 'MÁS PLATA POR CABEZA, MENOS GENTE. LA HINCHADA REFUNFUÑA.' };
  return <Card title="PRECIO DE LA ENTRADA" aside={<Chip icon="ticket">RIGE PARA TUS PARTIDOS DE LOCAL</Chip>}>
    <div className="tier-picker" role="radiogroup" aria-label="Precio de la entrada">
      {fans.tiers.map(tier => <button type="button" role="radio" key={tier.key} aria-checked={fans.ticketTier === tier.key} className={fans.ticketTier === tier.key ? 'on' : ''}
        disabled={!canEdit || save.loading} onClick={() => fans.ticketTier !== tier.key && save.execute(tier.key)}>
        <b>{upper(tier.label)}</b><strong>{tier.price} €</strong><small>{effect[tier.key]}</small>
      </button>)}
    </div>
    {save.error && <Notice tone="error">{save.error.message}</Notice>}
  </Card>;
}

function GateRow({ gate }) {
  return <li className="gate-row">
    <EntityLink to="match" id={gate.matchId} className="gate-match"><b>{upper(gate.homeName)} {gate.homeScore}-{gate.awayScore} {upper(gate.awayName)}</b><small>{when(gate.createdAt)}</small></EntityLink>
    <span className="gate-bar" aria-label={`${gate.occupancy}% del aforo`}><span style={{ width: `${gate.occupancy}%` }}/><em>{people(gate.attendance)}</em></span>
    <span className="gate-tags">{gate.closedDoors && <Chip tone="red" icon="lock">PUERTAS CERRADAS</Chip>}{gate.derby && <Chip tone="red" icon="fire">CLÁSICO</Chip>}{gate.neutral && <Chip tone="navy">FINAL · MITAD</Chip>}{gate.occupancy >= 100 && <Chip tone="green" icon="check">LLENO</Chip>}</span>
    <strong>{gp(gate.revenue)}</strong>
  </li>;
}

/** Estadio, hinchada y taquilla: lo ve cualquiera; el presi además elige el precio de la entrada. */
export function VenueTab({ team, onTab: _onTab }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const query = useApiQuery(signal => endpoints.teamFans(team.id, signal), [team.id]);
  const fans = query.data;
  if (!fans) return <DataState query={query}/>;
  const average = fans.gates.length ? Math.round(fans.gates.reduce((sum, gate) => sum + gate.occupancy, 0) / fans.gates.length) : 0;
  const full = fans.gates.filter(gate => gate.occupancy >= 100).length;
  return <section className="club-life venue-tab">
    <Card tone="navy" className={`venue-hero ${fans.venue.imageUrl ? 'has-photo' : ''}`} style={fans.venue.imageUrl ? { '--venue-photo': `url("${fans.venue.imageUrl}")` } : undefined}>
      <div className="venue-hero-copy">
        <small>{fans.venue.owned ? `ESTADIO · CATEGORÍA ${fans.venue.category}` : 'CANCHA PROPIA'}</small>
        <h2>{upper(fans.venue.name)}</h2>
        <p>{people(fans.venue.capacity)} ESPECTADORES</p>
        <a className="ui-btn ui-btn--primary ui-btn--sm" href="#/equipos/estadios"><Icon name="stadium" size={14}/>{canEdit ? (fans.venue.owned ? 'CAMBIAR DE ESTADIO' : 'COMPRAR ESTADIO') : 'VER TODOS LOS ESTADIOS'}</a>
      </div>
      <Stands occupancy={average} label={`Ocupación promedio ${average}%`}/>
    </Card>
    {!fans.enabled ? <OffNotice/> : <>
      <div className="club-life-stats">
        <Card><Stat label="HINCHAS EN CHILE" value={compact(fans.followers)} hint={fans.rank ? `${fans.rank}.º DE ${fans.clubs} EN LA LIGA` : undefined}/></Card>
        <Card><Stat label="LA HINCHADA ESTÁ" value={upper(fans.moodLabel)} hint={`ÁNIMO ${fans.mood} / 100`} tone={MOOD_TONE(fans.mood)}/><span className="mood-bar" aria-hidden="true"><span style={{ width: `${100 - fans.mood}%` }}/></span></Card>
        <Card><Stat label="TAQUILLA RECIENTE" value={gp(fans.seasonRevenue)} hint={`${fans.gates.length} PARTIDO${fans.gates.length === 1 ? '' : 'S'} DE LOCAL`}/></Card>
        <Card><Stat label="OCUPACIÓN" value={`${average}%`} hint={full ? `${full} ${full === 1 ? 'VEZ' : 'VECES'} CON ESTADIO LLENO` : 'SIN LLENOS TODAVÍA'} tone={average >= 90 ? 'good' : 'default'}/></Card>
      </div>
      <TierPicker fans={fans} canEdit={canEdit} onChanged={query.retry}/>
      <Card title="PARTIDOS DE LOCAL" aside={<Chip icon="people">ASISTENCIA Y RECAUDACIÓN</Chip>}>
        {fans.gates.length ? <ul className="gate-list">{fans.gates.map(gate => <GateRow key={gate.matchId} gate={gate}/>)}</ul>
          : <EmptyState icon="ticket" title="SIN PARTIDOS DE LOCAL AÚN">CUANDO JUEGUES DE LOCAL VERÁS AQUÍ CUÁNTA GENTE FUE Y CUÁNTO RECAUDASTE.</EmptyState>}
        <HowItWorks title="¿De qué depende la asistencia?"><p>De tus hinchas, el rival, si es clásico o playoffs, el ánimo de la hinchada y el precio de la entrada. El aforo es el techo. El marcador no cambia: esto solo mueve plata, hinchas y ánimo.</p></HowItWorks>
      </Card>
      <FanOrigin fans={fans}/>
      {fans.log.length > 0 && <Card title="LO QUE MOVIÓ A LA HINCHADA">
        <ul className="fan-log">{fans.log.slice(0, 5).map((row, index) => <FanLogRow key={index} row={row}/>)}</ul>
        {fans.log.length > 5 && <details className="fan-log-more"><summary>VER {fans.log.length - 5} MÁS</summary><ul className="fan-log">{fans.log.slice(5).map((row, index) => <FanLogRow key={index} row={row}/>)}</ul></details>}
      </Card>}
    </>}
  </section>;
}

function FanLogRow({ row }) {
  return <li>
          <span>{upper(row.reason)}</span>
          <b className={row.followers >= 0 ? 'up' : 'down'}>{signed(row.followers)} HINCHAS</b>
          <small className={row.mood >= 0 ? 'up' : 'down'}>{row.mood > 0 ? '▲' : row.mood < 0 ? '▼' : '·'} ÁNIMO {signed(row.mood)}</small>
        </li>;
}

/** De dónde salen los hinchas: el punto de partida (base + historial + plantel) y lo que se ganó o perdió jugando. */
function FanOrigin({ fans }) {
  const origin = fans.origin;
  if (!origin) return null;
  const { formula } = origin;
  return <Card title="¿DE DÓNDE SALEN TUS HINCHAS?" className="fan-origin">
    <div className="fan-origin-sum">
      <span><small>PARTISTE CON</small><b>{compact(origin.start)}</b></span>
      <i aria-hidden="true">{origin.change >= 0 ? '+' : '−'}</i>
      <span><small>{origin.change >= 0 ? 'GANADOS JUGANDO' : 'PERDIDOS JUGANDO'}</small><b className={origin.change >= 0 ? 'up' : 'down'}>{compact(Math.abs(origin.change))}</b></span>
      <i aria-hidden="true">=</i>
      <span><small>HOY</small><b>{compact(fans.followers)}</b></span>
    </div>
    <HowItWorks title="¿Cómo se calculó el punto de partida?">
      <p>Son personas en Chile que se declaran hinchas del club (no seguidores de redes). Todos parten con una base y suman por historia y por plantel:</p>
      <ul>
        <li><b>{compact(formula.base)}</b> de base, igual para todos.</li>
        <li><b>{compact(formula.honors)}</b> por historial: {formula.honorPoints} puntos de títulos, finales y playoffs (120 mil por punto).</li>
        <li><b>{compact(formula.squad)}</b> por plantel: hasta 250 mil para el más caro de la liga, proporcional para el resto.</li>
      </ul>
      <p>Después se mueven con cada partido de local, los clásicos, los títulos, la posición final y los conciertos. El 6% de tus hinchas, más o menos, quiere ir a cada partido; el aforo pone el techo.</p>
    </HowItWorks>
  </Card>;
}

function useBusiness(team) {
  const query = useApiQuery(signal => endpoints.teamBusiness(team.id, signal), [team.id]);
  return query;
}

const SCENES = [['todos', 'TODOS'], ['cristiana', 'MÚSICA CRISTIANA'], ['general', 'POP, URBANO Y ROCK']];

function ArtistCard({ artist, team, busy, onBook }) {
  const blocked = !artist.fits || artist.bookedBy;
  return <Card as="article" className={`artist-card ${blocked ? 'is-locked' : ''}`}>
    <header><span className={`artist-badge ${artist.scene === 'cristiana' ? 'is-christian' : ''}`} aria-hidden="true"><Icon name={artist.scene === 'cristiana' ? 'mic' : 'music'} size={18}/></span><div><b>{upper(artist.name)}</b><small>{upper(artist.genre)} · MUEVE ~{people(artist.draw)} PERSONAS</small></div></header>
    <dl>
      <div><dt>COBRA POR TOCAR</dt><dd>{gp(artist.fee)}</dd></div>
      <div><dt>TE QUEDARÍA</dt><dd className={artist.expectedProfit >= 0 ? 'up' : 'down'}>{artist.expectedProfit >= 0 ? '+' : ''}{gp(artist.expectedProfit)}</dd></div>
    </dl>
    {artist.bookedBy ? <Chip icon="lock">DE GIRA CON {upper(artist.bookedBy)}</Chip>
      : !artist.fits ? <Chip icon="lock">PIDE {people(artist.minCapacity)} DE AFORO</Chip>
        : onBook && <Button size="sm" icon="ticket" disabled={busy} onClick={() => onBook(artist)}>CONTRATAR</Button>}
  </Card>;
}

function VeladaCard({ team, velada, canEdit, onChanged }) {
  const toast = useToast();
  const [amount, setAmount] = useState(velada.myBid ?? '');
  const bid = useApiMutation((value, signal) => endpoints.bidVelada(team.id, value, signal), { onSuccess: () => { toast({ tone: 'success', title: 'POSTULACIÓN ENVIADA', body: 'IBAI LA VE EN SOBRE CERRADO.' }); onChanged(); } });
  const withdraw = useApiMutation((_, signal) => endpoints.withdrawVelada(team.id, signal), { onSuccess: onChanged });
  const round = velada.round;
  const eligible = velada.eligibility?.eligible;
  const closes = round?.closesAt ? new Date(round.closesAt).toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) : null;
  return <Card tone="gold" className="velada-card" title="LA VELADA DEL AÑO" aside={<Chip tone="navy" icon="mic">IBAI ELIGE ESTADIO</Chip>}>
    {!round && <p className="club-life-hint">CUANDO IBAI ABRA LA BÚSQUEDA DE ESTADIO, TE LLEGARÁ UN AVISO. SE PIDE UN ESTADIO DE {people(velada.requirements.minCapacity)} PERSONAS Y {compact(velada.requirements.minFollowers)} HINCHAS.</p>}
    {round?.status === 'resolved' && <div className="velada-result">
      <blockquote>«{round.result?.line}»<cite>— IBAI</cite></blockquote>
      {round.winnerTeamId === team.id && <p className="velada-win">GANASTE {gp(round.result.profit)} NETOS Y TU HINCHADA CRECIÓ 5%.</p>}
      {round.result?.ranking?.length > 0 && <ol className="velada-ranking">{round.result.ranking.map(row => <li key={row.teamId}><b>{upper(row.name)}</b><span>{gp(row.amount)}</span><small>{row.score} PTS</small></li>)}</ol>}
    </div>}
    {round?.status === 'open' && <>
      <p className="club-life-hint">POSTULACIÓN ABIERTA HASTA EL <b>{upper(closes)}</b>.</p>
      <HowItWorks><p>Ofertas en sobre cerrado. Ibai mira la oferta (50%), el aforo (30%) y la hinchada (20%). El ganador paga su oferta y se queda con las entradas a estadio lleno y la transmisión.</p></HowItWorks>
      {round.bidders.length > 0 && <p className="velada-bidders"><Icon name="people" size={14}/> POSTULAN: {round.bidders.map(bidder => upper(bidder.name)).join(' · ')}</p>}
      {!eligible ? <Notice tone="error">NO CUMPLES LOS REQUISITOS: {upper(velada.eligibility?.reasons?.join(' '))}</Notice>
        : canEdit && <div className="velada-bid">
          <label>TU OFERTA A LA ORGANIZACIÓN<GpInput value={amount} onChange={event => setAmount(event.target.value)} placeholder="0" aria-label="Oferta para La Velada"/></label>
          <Button icon="gavel" disabled={bid.loading || amount === ''} onClick={() => bid.execute(Number(amount))}>{velada.myBid !== null ? 'CAMBIAR OFERTA' : 'POSTULAR'}</Button>
          {velada.myBid !== null && <Button variant="ghost" size="sm" disabled={withdraw.loading} onClick={() => withdraw.execute()}>RETIRARME</Button>}
        </div>}
      {velada.myBid !== null && <p className="club-life-hint">TU OFERTA ACTUAL: <b>{gp(velada.myBid)}</b>. NADIE MÁS LA VE.</p>}
      {(bid.error || withdraw.error) && <Notice tone="error">{(bid.error ?? withdraw.error).message}</Notice>}
    </>}
  </Card>;
}

/** Conciertos y La Velada: lo privado del negocio del club. */
export function EventsTab({ team, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useBusiness(team);
  const [confirm, setConfirm] = useState(null);
  const [scene, setScene] = useState('todos');
  const label = useRef('');
  const act = useApiMutation((operation, signal) => operation(signal), { onSuccess: () => { setConfirm(null); toast({ tone: 'money', title: label.current }); query.retry(); onChanged?.(); } });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  if (!data.enabled) return <section className="club-life"><OffNotice/></section>;
  const scheduled = data.events.find(event => event.status === 'scheduled');
  const past = data.events.filter(event => event.status !== 'scheduled');
  const catalog = data.concerts;
  return <section className="club-life events-tab">
    <VeladaCard team={team} velada={data.velada} canEdit={canEdit} onChanged={query.retry}/>
    {scheduled && <Card tone="navy" className="event-scheduled" title={`PRÓXIMO SHOW: ${upper(scheduled.artist?.name)}`} aside={<Chip tone="yellow" icon="clock">EN TU PRÓXIMA FECHA DE LOCAL</Chip>}>
      <p>YA LE PAGASTE AL ARTISTA ({gp(scheduled.cost)}). SE HACE AL TERMINAR TU PRÓXIMO PARTIDO DE LOCAL.</p>
      {canEdit && (confirm === scheduled.id
        ? <ConfirmStep message={`¿CANCELAR? TE DEVUELVEN ${gp(Math.floor(scheduled.cost / 2))} (LA MITAD DE LO QUE LE PAGASTE).`} confirmLabel="SÍ, CANCELAR" danger busy={act.loading} onConfirm={() => { label.current = 'CONCIERTO CANCELADO'; act.execute(signal => endpoints.cancelConcert(team.id, scheduled.id, signal)); }} onCancel={() => setConfirm(null)}/>
        : <Button variant="ghost" size="sm" onClick={() => setConfirm(scheduled.id)}>CANCELAR SHOW</Button>)}
    </Card>}
    <Card title="CARTELERA DE CONCIERTOS" aside={<Chip icon="music">{catalog.used} / {catalog.limit} ESTA TEMPORADA</Chip>}>
      <nav className="scene-filter" role="tablist" aria-label="Escena">{SCENES.map(([key, text]) => <button key={key} type="button" role="tab" aria-selected={scene === key} className={scene === key ? 'on' : ''} onClick={() => setScene(key)}>{text}</button>)}</nav>
      <HowItWorks><p>Contratas al artista y le pagas por adelantado lo que cobra por tocar. El show se hace en tu próxima fecha de local y de cada entrada te quedan {catalog.sharePerHead} €. Si va mucha gente ganas plata e hinchas; si va poca, lo que recaudas puede no alcanzar a cubrir lo que le pagaste. «Te quedaría» es lo que ganarías con un show normal. Máximo {catalog.limit} por temporada.</p><p>La escena cristiana cobra menos y cabe en canchas chicas: es la forma de que un club sin estadio grande también haga eventos.</p></HowItWorks>
      {confirm && confirm !== scheduled?.id && <ConfirmStep message={`¿CONTRATAR A ${upper(confirm.name)} POR ${gp(confirm.fee)}? SE DESCUENTA AHORA.`} confirmLabel="SÍ, CONTRATAR" busy={act.loading}
        onConfirm={() => { label.current = `${upper(confirm.name)} TOCARÁ EN TU ESTADIO`; act.execute(signal => endpoints.bookConcert(team.id, confirm.key, signal)); }} onCancel={() => setConfirm(null)}/>}
      {act.error && <Notice tone="error">{act.error.message}</Notice>}
      <div className="artist-grid">{catalog.artists.filter(artist => scene === 'todos' || artist.scene === scene).sort((left, right) => Number(right.fits && !right.bookedBy) - Number(left.fits && !left.bookedBy) || right.draw - left.draw).map(artist => <ArtistCard key={artist.key} artist={artist} team={team} busy={act.loading || Boolean(scheduled) || catalog.used >= catalog.limit} onBook={canEdit ? setConfirm : null}/>)}</div>
    </Card>
    {past.length > 0 && <Card title="EVENTOS REALIZADOS">
      <ul className="event-history">{past.map(event => <li key={event.id}>
        <Icon name={event.kind === 'velada' ? 'mic' : 'music'} size={16}/>
        <b>{event.kind === 'velada' ? 'LA VELADA DEL AÑO' : upper(event.artist?.name)}</b>
        <small>{event.status === 'cancelled' ? 'CANCELADO' : `${people(event.attendance)} PERSONAS · ${when(event.resolvedAt)}`}</small>
        {event.status === 'done' && <strong className={(event.revenue - event.cost) >= 0 ? 'up' : 'down'}>{(event.revenue - event.cost) >= 0 ? '+' : ''}{gp(event.revenue - event.cost)}</strong>}
      </li>)}</ul>
    </Card>}
  </section>;
}

/** Tele pixel con el canal en pantalla. */
function TvSet({ channel, small = false }) {
  return <div className={`tv-set ${small ? 'small' : ''}`} aria-hidden="true"><i className="tv-antenna"/><div className="tv-screen"><span>{upper(channel)}</span><em>EN VIVO</em></div></div>;
}

/** Derechos de TV: tres canales ofrecen transmitir los partidos del club cada temporada; se cobra al cerrar el torneo de liga. */
export function TvRightsTab({ team, onChanged }) {
  const { canEditTeam } = useAuth();
  const canEdit = canEditTeam(team.id);
  const toast = useToast();
  const query = useBusiness(team);
  const [confirm, setConfirm] = useState(null);
  const sign = useApiMutation((key, signal) => endpoints.signSponsor(team.id, key, signal), { onSuccess: () => { setConfirm(null); toast({ tone: 'money', title: 'CONTRATO DE TV FIRMADO' }); query.retry(); onChanged?.(); } });
  const data = query.data;
  if (!data) return <DataState query={query}/>;
  if (!data.enabled) return <section className="club-life"><OffNotice/></section>;
  const sponsor = data.sponsor;
  return <section className="club-life sponsor-tab tv-tab">
    {sponsor ? <Card tone="navy" className="sponsor-current">
      <TvSet channel={sponsor.brand}/>
      <div>
        <small>TRANSMITE TUS PARTIDOS{sponsor.reach ? ` · ${upper(sponsor.reach)}` : ''} · CONTRATO {upper(sponsor.styleLabel)}</small>
        <h2>{upper(sponsor.brand)}</h2>
        <p>TEMPORADA {Math.min(sponsor.seasonsPaid + 1, sponsor.seasons)} DE {sponsor.seasons} · YA PAGÓ {gp(sponsor.paid)}</p>
        <dl className="sponsor-terms"><div><dt>FIJO POR TORNEO</dt><dd>{gp(sponsor.fixed)}</dd></div>{sponsor.playoffBonus > 0 && <div><dt>SI LLEGAS A PLAYOFFS</dt><dd>+{gp(sponsor.playoffBonus)}</dd></div>}{sponsor.titleBonus > 0 && <div><dt>SI SALES CAMPEÓN</dt><dd>+{gp(sponsor.titleBonus)}</dd></div>}</dl>
      </div>
    </Card> : <Card title="DERECHOS DE TV" aside={<Chip icon="handshake">3 CANALES TE QUIEREN TRANSMITIR</Chip>}>
      <p className="club-life-hint">ELIGE UN CANAL: PAGA AL CERRAR CADA TORNEO DE LIGA. LOS MÁS GRANDES PAGAN MÁS.</p>
      <HowItWorks><p>Cada canal paga según su tamaño y tus hinchas. Los gigantes globales (Prime Video, DAZN, ESPN) pagan más, pero solo llaman a clubes con mucha hinchada; la TV abierta paga menos y le transmite a cualquiera. La oferta <b>fija</b> es plata segura; la <b>arriesgada</b> paga poco fijo pero mucho si llegas a playoffs o sales campeón; la <b>mixta</b> va al medio.</p><p>No va en la camiseta: en el juego usan camisetas reales con su propia marca.</p></HowItWorks>
      <div className="sponsor-offers">{data.sponsorOffers.map(offer => <article key={offer.key} className={`sponsor-offer style-${offer.style}`}>
        <TvSet channel={offer.brand} small/>
        <b>{upper(offer.brand)}</b>
        {offer.reach && <small className="tv-reach">{upper(offer.reach)}</small>}
        <Chip tone={offer.style === 'arriesgada' ? 'red' : offer.style === 'mixta' ? 'yellow' : 'green'}>{upper(offer.styleLabel)} · {offer.seasons} TORNEO{offer.seasons === 1 ? '' : 'S'}</Chip>
        <dl><div><dt>FIJO POR TORNEO</dt><dd>{gp(offer.fixed)}</dd></div><div><dt>SI LLEGAS A PLAYOFFS</dt><dd>{offer.playoffBonus ? `+${gp(offer.playoffBonus)}` : '—'}</dd></div><div><dt>SI SALES CAMPEÓN</dt><dd>{offer.titleBonus ? `+${gp(offer.titleBonus)}` : '—'}</dd></div></dl>
        {canEdit && (confirm === offer.key
          ? <ConfirmStep message={`¿FIRMAR CON ${upper(offer.brand)} POR ${offer.seasons} TORNEO${offer.seasons === 1 ? '' : 'S'}? NO SE PUEDE CAMBIAR HASTA QUE TERMINE.`} confirmLabel="SÍ, FIRMAR" busy={sign.loading} onConfirm={() => sign.execute(offer.key)} onCancel={() => setConfirm(null)}/>
          : <Button size="sm" icon="contract" onClick={() => setConfirm(offer.key)}>FIRMAR</Button>)}
      </article>)}</div>
      {data.tvNext && <p className="tv-next"><Icon name="people" size={14}/> CON {compact(data.tvNext.minFollowers)} HINCHAS TE LLAMARÍA <b>{upper(data.tvNext.name)}</b> ({upper(data.tvNext.reach)}): TE FALTAN {compact(data.tvNext.missing)}.</p>}
      {sign.error && <Notice tone="error">{sign.error.message}</Notice>}
    </Card>}
  </section>;
}
