import { useEffect, useMemo } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { generateMatchNews, generateSanctionNews, generateTransferNews } from '../../utils/newsGenerator.js';
import { useApiQuery } from '../public/useApiQuery.js';

const list = value => Array.isArray(value) ? value : [];
const isSanction = item => /red|card|sanction|susp|expuls|tarjeta/i.test(`${item?.type ?? ''} ${item?.message ?? ''} ${item?.description ?? ''}`);

export function useAutomaticNews(refreshInterval = 60000) {
  const finishedMatches = useApiQuery(signal => endpoints.matches({ status: 'finished', page: 1, pageSize: 100 }, signal));
  const transfers = useApiQuery(signal => endpoints.transfers({ page: 1, pageSize: 100 }, signal));
  const activity = useApiQuery(signal => endpoints.activity({ page: 1, pageSize: 100 }, signal));
  const queries = [finishedMatches, transfers, activity];

  useEffect(() => {
    if (!refreshInterval) return undefined;
    const timer = window.setInterval(() => queries.forEach(query => query.retry()), refreshInterval);
    return () => window.clearInterval(timer);
  }, [refreshInterval, finishedMatches.retry, transfers.retry, activity.retry]);

  const news = useMemo(() => {
    const generated = [
      ...list(finishedMatches.data).map(generateMatchNews),
      ...list(transfers.data).map(generateTransferNews),
      ...list(activity.data).filter(isSanction).map(generateSanctionNews),
    ].filter(Boolean);
    const unique = [...new Map(generated.map(item => [item.id, item])).values()];
    return unique.sort((left, right) => {
      const dateDifference = (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0);
      return dateDifference || left.id.localeCompare(right.id);
    });
  }, [finishedMatches.data, transfers.data, activity.data]);

  return {
    news,
    loading: queries.some(query => query.loading),
    error: queries.find(query => query.error)?.error ?? null,
    retry: () => queries.forEach(query => query.retry()),
  };
}
