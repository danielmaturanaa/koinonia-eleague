const DEFAULT_API_PREFIX = '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'REQUEST_ERROR', details = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const apiPrefix = (import.meta.env.VITE_API_PROXY_URL || DEFAULT_API_PREFIX).replace(/\/$/, '');

/** URL pública de una ruta de la API; sirve también para navegar (login), no solo para fetch. */
export function apiUrl(path) {
  return `${apiPrefix}${path}`;
}

function buildUrl(path, query) {
  if (!path.startsWith('/')) throw new TypeError(`La ruta de API debe comenzar con "/": ${path}`);

  const url = new URL(`${apiPrefix}${path}`, window.location.origin);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return apiPrefix.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') ?? '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) return response.json();

  const text = await response.text();
  return text ? { data: text } : null;
}

export async function apiRequest(path, {
  method = 'GET', query, body, signal, timeoutMs = 15000,
} = {}) {
  const normalizedMethod = method.toUpperCase();
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort('timeout'), timeoutMs);
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });

  // El actor de la auditoría lo pone la API desde la sesión; el cuerpo ya no lo lleva.
  const payload = body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  try {
    const response = await fetch(buildUrl(path, query), {
      method: normalizedMethod,
      headers: payload === undefined || isFormData ? { Accept: 'application/json' } : {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: payload === undefined ? undefined : isFormData ? payload : JSON.stringify(payload),
      credentials: 'include',
      cache: normalizedMethod === 'GET' ? 'no-store' : 'default',
      signal: controller.signal,
    });
    const result = await parseResponse(response);

    if (!response.ok) {
      const error = result?.error ?? {};
      if (response.status === 401 && error.code === 'AUTH_REQUIRED') window.dispatchEvent(new Event('koinonia:auth-required'));
      throw new ApiError(error.message || `La API respondió con HTTP ${response.status}.`, {
        status: response.status,
        code: error.code || 'HTTP_ERROR',
        details: error.details ?? result,
      });
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('La solicitud tardó demasiado o fue cancelada.', { code: 'REQUEST_ABORTED' });
    }
    throw new ApiError('No fue posible contactar la API.', { code: 'NETWORK_ERROR', details: error });
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

export const apiClient = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, body, options) => apiRequest(path, { ...options, method: 'DELETE', body }),
};

export async function getData(path, options) {
  return (await apiClient.get(path, options))?.data;
}

export async function getCollection(path, options) {
  const response = await apiClient.get(path, options);
  return {
    data: Array.isArray(response?.data) ? response.data : [],
    pagination: response?.pagination ?? null,
  };
}
