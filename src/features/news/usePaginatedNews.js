import { useCallback, useEffect, useRef, useState } from 'react';
import { endpoints } from '../../api/endpoints.js';

const PAGE_SIZE = 20;

export function usePaginatedNews(refreshInterval = 600000) {
  const [news, setNews] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [moreError, setMoreError] = useState(null);
  const controllerRef = useRef(null);
  const pageRef = useRef(0);
  const inFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    inFlightRef.current = false;
    pageRef.current = 0;
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setMoreError(null);
    try {
      const response = await endpoints.news({ page: 1, pageSize: PAGE_SIZE }, controller.signal);
      if (controller.signal.aborted) return;
      const items = Array.isArray(response?.data) ? response.data : [];
      setNews(items);
      setPagination(response?.pagination ?? null);
      pageRef.current = response?.pagination?.page ?? 1;
    } catch (requestError) {
      if (!controller.signal.aborted) setError(requestError);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => controllerRef.current?.abort();
  }, [refresh]);

  useEffect(() => {
    if (!refreshInterval) return undefined;
    const timer = window.setInterval(refresh, refreshInterval);
    return () => window.clearInterval(timer);
  }, [refreshInterval, refresh]);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current || loading || loadingMore || error) return;
    const nextPage = pageRef.current + 1;
    if (pagination && nextPage > pagination.totalPages) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    inFlightRef.current = true;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const response = await endpoints.news({ page: nextPage, pageSize: PAGE_SIZE }, controller.signal);
      if (controller.signal.aborted) return;
      const items = Array.isArray(response?.data) ? response.data : [];
      setNews(current => {
        const seen = new Set(current.map(item => item.id));
        return [...current, ...items.filter(item => !seen.has(item.id))];
      });
      setPagination(response?.pagination ?? pagination);
      pageRef.current = response?.pagination?.page ?? nextPage;
    } catch (requestError) {
      if (!controller.signal.aborted) setMoreError(requestError);
    } finally {
      inFlightRef.current = false;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }, [error, loading, loadingMore, pagination]);

  return {
    news, loading, error, loadingMore, moreError,
    hasMore: pagination ? pageRef.current < pagination.totalPages : news.length === PAGE_SIZE,
    loadMore, retry: refresh,
  };
}
