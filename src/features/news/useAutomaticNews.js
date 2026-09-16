import { useEffect, useMemo } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { generateLiveMatchNews, generateMatchNews, generateSanctionNews, generateTransferNews } from '../../utils/newsGenerator.js';
import { useApiQuery } from '../public/useApiQuery.js';

const list = value => Array.isArray(value) ? value : [];
const isSanction = item => /red|card|sanction|susp|expuls|tarjeta/i.test(`${item?.type ?? ''} ${item?.message ?? ''} ${item?.description ?? ''}`);

const loadMatchDetails = async (status, signal) => {
  const response = await endpoints.matches({ status, page: 1, pageSize: 100 }, signal);
  const summaries = list(response?.data);
  const details = await Promise.all(summaries.map(match => endpoints.match(match.id, signal)));
  return { data: details.map(detail => detail?.data ?? detail).filter(Boolean) };
};

export function useAutomaticNews(refreshInterval = 600000) {
  const liveMatches = useApiQuery(signal => loadMatchDetails('live', signal));
  const finishedMatches = useApiQuery(signal => loadMatchDetails('finished', signal));
  const transfers = useApiQuery(signal => endpoints.transfers({ page: 1, pageSize: 100 }, signal));
  const activity = useApiQuery(signal => endpoints.activity({ page: 1, pageSize: 100 }, signal));
  const queries = [liveMatches, finishedMatches, transfers, activity];

  useEffect(() => {
    if (!refreshInterval) return undefined;
    const timer = window.setInterval(() => queries.forEach(query => query.retry()), refreshInterval);
    return () => window.clearInterval(timer);
  }, [refreshInterval, liveMatches.retry, finishedMatches.retry, transfers.retry, activity.retry]);

  const news = useMemo(() => {
    const generated = [
      ...list(liveMatches.data).map(generateLiveMatchNews),
      ...list(finishedMatches.data).map(match => generateMatchNews(match, { matches: list(finishedMatches.data) })),
      ...list(transfers.data).map(generateTransferNews),
      ...list(activity.data).filter(isSanction).map(generateSanctionNews),
    ].filter(Boolean);
    const unique = [...new Map(generated.map(item => [item.id, item])).values()];
    return unique.sort((left, right) => {
      if (Boolean(left.live) !== Boolean(right.live)) return left.live ? -1 : 1;
      const dateDifference = (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0);
      return dateDifference || left.id.localeCompare(right.id);
    });
  }, [liveMatches.data, finishedMatches.data, transfers.data, activity.data]);

  return {
    news,
    loading: queries.some(query => query.loading),
    error: queries.find(query => query.error)?.error ?? null,
    retry: () => queries.forEach(query => query.retry()),
  };
}
