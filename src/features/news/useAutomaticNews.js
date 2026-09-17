import { useEffect } from 'react';
import { endpoints } from '../../api/endpoints.js';
import { useApiQuery } from '../public/useApiQuery.js';

export function useAutomaticNews(refreshInterval = 600000) {
  const feed = useApiQuery(signal => endpoints.news(signal));

  useEffect(() => {
    if (!refreshInterval) return undefined;
    const timer = window.setInterval(feed.retry, refreshInterval);
    return () => window.clearInterval(timer);
  }, [refreshInterval, feed.retry]);

  return {
    news: Array.isArray(feed.data) ? feed.data : [], loading: feed.loading, error: feed.error, retry: feed.retry,
  };
}
