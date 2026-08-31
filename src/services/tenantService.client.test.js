import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fetchUserTenants,
  updateTenantSettings,
  inviteTenantMember,
  removeTenantMember,
  getTenantScopedDbName,
} from './tenantService';

/**
 * Cover for #1049.
 *
 * The point of these is less the individual assertions than the import at the
 * top: `./tenantService` has to resolve to a module that exports both halves.
 * While `tenantService.js` shadowed `tenantService.ts` exactly one of the two
 * groups was reachable at a time, and which one depended on the resolver.
 */

/** @param {any} body @param {{ok?: boolean, status?: number}} [init] */
function jsonResponse(body, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

describe('tenantService — one module, both halves (#1049)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('exposes the scoping helpers and the REST client from the same specifier', async () => {
    expect(typeof getTenantScopedDbName).toBe('function');
    expect(typeof fetchUserTenants).toBe('function');
    expect(typeof updateTenantSettings).toBe('function');
    expect(typeof inviteTenantMember).toBe('function');
    expect(typeof removeTenantMember).toBe('function');
  });

  describe('fetchUserTenants', () => {
    it('returns the parsed workspace list', async () => {
      fetch.mockResolvedValue(jsonResponse([{ id: 'a', name: 'A' }]));

      await expect(fetchUserTenants()).resolves.toEqual([{ id: 'a', name: 'A' }]);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/tenants'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('omits the Authorization header entirely when no token is stored', async () => {
      fetch.mockResolvedValue(jsonResponse([]));

      await fetchUserTenants();

      const { headers } = fetch.mock.calls[0][1];
      // Not `Bearer null`: an absent token has to read as an anonymous request,
      // not as a request presenting the string "null" as a credential.
      expect(headers).not.toHaveProperty('Authorization');
    });

    it('sends the stored token when there is one', async () => {
      localStorage.setItem('token', 'abc123');
      fetch.mockResolvedValue(jsonResponse([]));

      await fetchUserTenants();

      expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer abc123');
    });

    it('does not throw when localStorage is unreadable', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      });
      fetch.mockResolvedValue(jsonResponse([]));

      await expect(fetchUserTenants()).resolves.toEqual([]);
    });

    it('surfaces the server message on a failed response', async () => {
      fetch.mockResolvedValue(
        jsonResponse({ message: 'Workspace access revoked' }, { ok: false, status: 403 })
      );

      await expect(fetchUserTenants()).rejects.toThrow('Workspace access revoked');
    });

    it('falls back to the status when the error body is not JSON', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON');
        },
      });

      await expect(fetchUserTenants()).rejects.toThrow('HTTP 502');
    });
  });

  describe('updateTenantSettings', () => {
    it('PATCHes the settings under a `settings` key', async () => {
      fetch.mockResolvedValue(jsonResponse({ id: 't1', settings: { theme: 'dark' } }));

      await updateTenantSettings('t1', { theme: 'dark' });

      const [url, init] = fetch.mock.calls[0];
      expect(url).toContain('/tenants/t1/settings');
      expect(init.method).toBe('PATCH');
      expect(JSON.parse(init.body)).toEqual({ settings: { theme: 'dark' } });
    });

    it('encodes the tenant id into the path', async () => {
      fetch.mockResolvedValue(jsonResponse({}));

      await updateTenantSettings('a/b', {});

      expect(fetch.mock.calls[0][0]).toContain('/tenants/a%2Fb/settings');
    });
  });

  describe('inviteTenantMember', () => {
    it('POSTs the email and role', async () => {
      fetch.mockResolvedValue(jsonResponse({ id: 'm1' }));

      await inviteTenantMember('t1', 'someone@example.com', 'MEMBER');

      const [, init] = fetch.mock.calls[0];
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({
        email: 'someone@example.com',
        role: 'MEMBER',
      });
    });
  });

  describe('removeTenantMember', () => {
    it('DELETEs the membership and resolves with nothing', async () => {
      fetch.mockResolvedValue({ ok: true, status: 204, json: async () => undefined });

      await expect(removeTenantMember('t1', 'm1')).resolves.toBeUndefined();
      expect(fetch.mock.calls[0][0]).toContain('/tenants/t1/members/m1');
      expect(fetch.mock.calls[0][1].method).toBe('DELETE');
    });

    it('rejects with the server message when the removal is refused', async () => {
      fetch.mockResolvedValue(
        jsonResponse({ message: 'Cannot remove the last admin' }, { ok: false, status: 409 })
      );

      await expect(removeTenantMember('t1', 'm1')).rejects.toThrow(
        'Cannot remove the last admin'
      );
    });
  });
});
