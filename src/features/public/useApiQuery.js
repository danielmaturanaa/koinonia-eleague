import { useCallback, useEffect, useRef, useState } from 'react';

export function useApiQuery(loader, dependencies = []) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ data: null, pagination: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(current => ({ ...current, loading: true, error: null }));
    loaderRef.current(controller.signal).then(response => {
      if (active) setResult({ data: response?.data ?? null, pagination: response?.pagination ?? null, loading: false, error: null });
    }).catch(error => {
      if (active && error?.code !== 'REQUEST_ABORTED') setResult(current => ({ ...current, loading: false, error }));
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [...dependencies, revision]);

  const retry = useCallback(() => setRevision(value => value + 1), []);
  return { ...result, retry };
}
