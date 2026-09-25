import { useEffect, useRef, useState } from 'react';
import { usePaginatedNews } from '../news/usePaginatedNews.js';
import { NewsArtwork } from '../../components/NewsArtwork.jsx';
import { DataState, PageHeader, formatDate } from './DataStates.jsx';
import { useApiQuery } from './useApiQuery.js';
import { endpoints } from '../../api/endpoints.js';
import { useApiMutation } from '../admin/useApiMutation.js';
import { FormFeedback } from '../admin/FormFeedback.jsx';
import { newsPath, rememberNews } from '../news/newsCache.js';

function headlineScaleClass(headline = '') {
  const length = headline.length;
  if (length > 92) return ' news-headline-xs';
  if (length > 68) return ' news-headline-compact';
  if (length > 48) return ' news-headline-medium';
  return '';
}

function GenericNewsImagesModal({ onClose }) {
  const images = useApiQuery(signal => endpoints.newsImages(signal));
  const upload = useApiMutation(async ({ context, file }, signal) => {
    const asset = await endpoints.uploadImage(file, {}, signal);
    return endpoints.updateNewsImage(context, { imageUrl: asset?.data?.secureUrl ?? asset?.secureUrl, assetId: asset?.data?.id ?? asset?.id }, signal);
  }, { onSuccess: images.retry });
  const configured = new Map((images.data ?? []).map(item => [item.context, item]));
  const rows = [['draw', 'EMPATE'], ['red_card', 'TARJETA ROJA'], ['transfer', 'TRASPASO'], ['goal_milestone', 'HITO GOLEADOR']];
  return <div className="person-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><section className="person-modal news-images-modal" role="dialog" aria-modal="true" aria-label="Imágenes genéricas de noticias"><header><h2>IMÁGENES GENÉRICAS</h2><button type="button" onClick={onClose} aria-label="Cerrar">×</button></header><p>Se usan en empates, tarjetas rojas, traspasos e hitos goleadores. Las noticias ya publicadas conservan su imagen.</p><div>{rows.map(([context, label]) => { const image = configured.get(context); return <label key={context}><b>{label}</b><span className="news-generic-preview">{image?.imageUrl ? <img src={image.imageUrl} alt={`Imagen genérica de ${label}`}/> : <i>SIN IMAGEN<br/>4:3</i>}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={upload.loading} onChange={event => { const file = event.target.files?.[0]; if (file) upload.execute({ context, file }); }}/></label>; })}</div><FormFeedback mutation={upload}/></section></div>;
}

export function NewsPage({ teams = [] }) {
  const { news, loading, error, loadingMore, moreError, hasMore, loadMore, retry } = usePaginatedNews();
  const sentinelRef = useRef(null);
  const tokenQuery = useApiQuery(signal => endpoints.newsTokens(signal));
  const [showHowTo, setShowHowTo] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const state = { loading, error, data: news, retry };
  useEffect(() => { rememberNews(news); }, [news]);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    // El feed crece con la página: se observa contra la ventana, no contra el contenedor.
    if (!sentinel || !hasMore || loading || loadingMore || moreError || error) return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: '500px 0px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, loadMore, loading, loadingMore, moreError]);
  const tokens = Array.isArray(tokenQuery.data) ? tokenQuery.data : [];
  const llmPrompt = `Escribe plantillas breves para noticias de una liga de eFootball. Devuelve solo propuestas para etiqueta, titular y cuerpo. Usa exclusivamente los tokens entre llaves que correspondan; no inventes datos ni cambies el nombre de los tokens. Una variante que use un token sin dato disponible no será publicada.\n\nTOKENS DISPONIBLES:\n${tokens.map(item => `${item.token}: ${item.description}`).join('\n')}`;

  return <main className="newspaper data-page"><section className="data-paper news-paper"><PageHeader kicker="PERIÓDICO AUTOMÁTICO DE LA LIGA" title="NOTICIAS"><div className="news-header-actions"><button className="page-action" onClick={() => setShowImages(true)}>▣ IMÁGENES</button><button className="page-action" onClick={() => setShowHowTo(true)}>¿CÓMO USAR?</button></div></PageHeader>{showImages && <GenericNewsImagesModal onClose={() => setShowImages(false)}/>} {showHowTo && <div className="person-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setShowHowTo(false); }}><section className="person-modal news-help-modal" role="dialog" aria-modal="true" aria-label="Cómo usar plantillas"><header><h2>¿CÓMO USAR PLANTILLAS?</h2><button type="button" onClick={() => setShowHowTo(false)} aria-label="Cerrar">×</button></header><p>Inserta tokens exactamente como aparecen. Copia el bloque para pedir variantes a cualquier LLM.</p>{tokenQuery.loading ? <p>CARGANDO TOKENS…</p> : <><ul>{tokens.map(item => <li key={item.token}><code>{item.token}</code> — {item.description}</li>)}</ul><textarea readOnly value={llmPrompt} aria-label="Instrucción para generar plantillas con IA"/></>}</section></div>}<DataState query={state}/>{!state.loading && !state.error && <div className="news-feed">{news.length ? news.map(item => <article className={`news-card news-${item.type}-${item.subtype}`} data-image={item.imageUrl ?? ''} key={item.id}><NewsArtwork item={item} teams={teams}/><div><time>{item.publishedAt ? formatDate(item.publishedAt) : 'FECHA NO PUBLICADA'}</time><b>{item.label}</b><h2 className={headlineScaleClass(item.headline)}><a href={`#${newsPath(item)}`}>{item.headline}</a></h2>{item.subtitle && <h3>{item.subtitle}</h3>}<a className="news-read-more" href={`#${newsPath(item)}`}>VER NOTICIA COMPLETA</a></div></article>) : <p className="empty-copy">NO HAY EVENTOS CON DATOS SUFICIENTES PARA GENERAR NOTICIAS.</p>}{news.length > 0 && <div className="news-feed-sentinel" ref={sentinelRef} aria-hidden="true"/>}{loadingMore && <p className="news-feed-status" role="status">CARGANDO MÁS NOTICIAS…</p>}{moreError && <p className="news-feed-status" role="alert">NO SE PUDIERON CARGAR MÁS NOTICIAS. <button type="button" onClick={loadMore}>REINTENTAR</button></p>}</div>}</section></main>;
}
