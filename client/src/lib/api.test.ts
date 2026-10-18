import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiPaged, ApiError, setCsrfToken, setUnauthorizedHandler } from './api';

const fetchMock = vi.fn();

function reply(status: number, body?: unknown) {
  fetchMock.mockResolvedValueOnce({
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new Error('no body');
      return body;
    },
  });
}

/** Resolves with the ApiError a call rejects with (and fails the test if it does not reject). */
async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected the call to reject');
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  setCsrfToken(null);
  setUnauthorizedHandler(null);
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('api client', () => {
  it('unwraps the success envelope and always sends credentials', async () => {
    reply(200, { success: true, data: { hello: 'world' } });
    await expect(api('/site')).resolves.toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/site');
    expect(init.credentials).toBe('include');
  });

  it('returns data and meta for paginated endpoints', async () => {
    reply(200, { success: true, data: [1, 2], meta: { page: 1, pageSize: 2, total: 5, totalPages: 3 } });
    const res = await apiPaged('/projects', { query: { page: 1, q: 'react', empty: '', nothing: undefined } });
    expect(res.data).toEqual([1, 2]);
    expect(res.meta.totalPages).toBe(3);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/v1/projects?page=1&q=react'); // empty values are dropped
  });

  it('turns error envelopes into ApiError with code, status and field details', async () => {
    reply(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Some fields are invalid.', details: [{ path: 'title', message: 'Required' }] } });
    const err = await failure(api('/admin/projects', { method: 'POST', body: {} }));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 422, code: 'VALIDATION_ERROR', message: 'Some fields are invalid.' });
    expect(err.details?.[0]).toEqual({ path: 'title', message: 'Required' });
    expect(err.isTransient).toBe(false);
  });

  it('reports network failures as a transient status-0 error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const err = await failure(api('/site'));
    expect(err).toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
    expect(err.isTransient).toBe(true);
  });

  it.each([502, 503, 504])('treats HTTP %i (sleeping or starting server) as transient so it is retried', async (status) => {
    reply(status);
    const err = await failure(api('/site'));
    expect(err.isTransient).toBe(true);
    expect(err.message).not.toMatch(/undefined|<html/i);
  });

  it('sends the CSRF token on state-changing requests only, and only once it is known', async () => {
    reply(200, { success: true, data: null });
    await api('/admin/projects/1/publish', { method: 'PATCH', body: { isPublished: true } });
    expect(fetchMock.mock.calls[0]![1].headers['X-CSRF-Token']).toBeUndefined();

    setCsrfToken('token-123');
    reply(200, { success: true, data: null });
    await api('/admin/projects/1/publish', { method: 'PATCH', body: { isPublished: true } });
    expect(fetchMock.mock.calls[1]![1].headers['X-CSRF-Token']).toBe('token-123');

    reply(200, { success: true, data: null });
    await api('/admin/projects');
    expect(fetchMock.mock.calls[2]![1].headers['X-CSRF-Token']).toBeUndefined(); // GET never needs it
  });

  it('handles 204 No Content', async () => {
    reply(204);
    await expect(api('/admin/projects/1', { method: 'DELETE' })).resolves.toBeNull();
  });

  it('calls the unauthorized handler on a 401 from a protected call, but not for login or /auth/me', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    reply(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'Expired' } });
    await api('/admin/projects').catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);

    reply(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'Nope' } });
    await api('/auth/login', { method: 'POST', body: {} }).catch(() => undefined);
    reply(401, { success: false, error: { code: 'UNAUTHENTICATED', message: 'Nope' } });
    await api('/auth/me').catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('never stores the CSRF token in web storage', async () => {
    setCsrfToken('secret-token');
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('secret-token');
  });
});
