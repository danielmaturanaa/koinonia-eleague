import { useCallback, useEffect, useRef, useState } from 'react';

export function useApiMutation(action, { onSuccess } = {}) {
  const [state, setState] = useState({ loading: false, error: null, success: '' });
  const mountedRef = useRef(true);
  const runningRef = useRef(null);

  useEffect(() => () => {
    mountedRef.current = false;
    runningRef.current?.abort();
  }, []);

  const execute = useCallback(async (...args) => {
    if (runningRef.current) return null;
    const controller = new AbortController();
    runningRef.current = controller;
    setState({ loading: true, error: null, success: '' });
    try {
      const result = await action(...args, controller.signal);
      if (mountedRef.current) {
        setState({ loading: false, error: null, success: 'CAMBIO GUARDADO CORRECTAMENTE.' });
        onSuccess?.(result);
      }
      return result;
    } catch (error) {
      if (mountedRef.current && error?.code !== 'REQUEST_ABORTED') setState({ loading: false, error, success: '' });
      return null;
    } finally {
      if (runningRef.current === controller) runningRef.current = null;
    }
  }, [action, onSuccess]);

  const clear = useCallback(() => setState({ loading: false, error: null, success: '' }), []);
  return { ...state, execute, clear };
}
