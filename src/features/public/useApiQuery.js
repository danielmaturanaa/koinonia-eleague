import { useCallback, useEffect, useRef, useState } from 'react';

// silentRefresh: los reintentos (retry) con datos ya cargados no encienden `loading`, para refrescos periódicos sin parpadeo.
const depsKeyOf = dependencies => JSON.stringify(dependencies);

export function useApiQuery(loader, dependencies = [], { silentRefresh = false } = {}) {
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const [revision, setRevision] = useState(0);
  const depsKey = useRef(null);
  const [result, setResult] = useState({ data: null, pagination: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult(current => (silentRefresh && current.data != null && depsKey.current === depsKeyOf(dependencies)
      ? current
      : { ...current, loading: true, error: null }));
    depsKey.current = depsKeyOf(dependencies);
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
