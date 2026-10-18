import type { PageMeta } from '@/types/api';

/**
 * API base URL, e.g. "https://api.example.com.np/api/v1".
 * Defaults to "/api/v1": same-origin in development (Vite proxy) or via a Netlify proxy rule.
 */
export const API_BASE = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api/v1').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Server asleep, deploying or database waking up: worth retrying. */
  get isTransient() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

// The CSRF token lives only in memory (never localStorage) and is re-fetched from /auth/me on page load.
let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

// Called when an authenticated request comes back 401 (expired/invalidated session), so the dashboard can
// drop back to the login screen instead of showing confusing errors.
let unauthorizedHandler: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  unauthorizedHandler = fn;
};

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  query?: Query;
  signal?: AbortSignal;
}

export interface Paged<T, M extends object = Record<string, unknown>> {
  data: T;
  meta: PageMeta & M;
}

function buildUrl(path: string, query?: Query) {
  const url = `${API_BASE}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

async function raw(path: string, { method = 'GET', body, form, query, signal }: RequestOptions = {}) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;
  let payload: BodyInit | undefined;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), { method, headers, body: payload, credentials: 'include', signal });
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Please check your connection and try again.');
  }

  if (response.status === 204) return { json: null as unknown, status: 204 };

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    /* non-JSON body (e.g. a gateway error page) */
  }
  if (!response.ok || json?.success === false) {
    const err = json?.error;
    if (response.status === 401 && !path.startsWith('/auth/login') && path !== '/auth/me') unauthorizedHandler?.();
    throw new ApiError(
      response.status,
      err?.code ?? 'HTTP_ERROR',
      err?.message ?? (response.status >= 500 ? 'The server had a problem. Please try again shortly.' : 'The request failed.'),
      err?.details,
    );
  }
  return { json, status: response.status };
}

/** Returns `data` from the success envelope. */
export async function api<T>(path: string, options?: RequestOptions): Promise<T> {
  const { json } = await raw(path, options);
  return (json?.data ?? null) as T;
}

/** For paginated endpoints: returns both `data` and `meta`. */
export async function apiPaged<T, M extends object = Record<string, unknown>>(path: string, options?: RequestOptions): Promise<Paged<T, M>> {
  const { json } = await raw(path, options);
  return { data: json.data as T, meta: json.meta };
}

export const apiForm = <T>(path: string, form: FormData, method: 'POST' | 'PUT' = 'POST') => api<T>(path, { method, form });
