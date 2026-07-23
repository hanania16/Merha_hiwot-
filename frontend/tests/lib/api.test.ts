import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('api', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('can mock a fetch call', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: 'test' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const res = await fetch('/api/test');
    const body = await res.json();

    expect(body.data).toBe('test');
    expect(mockFetch).toHaveBeenCalledWith('/api/test');
  });
});
