const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : '/api/backend';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('mh_token');
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractErrorMessage(body: Record<string, unknown>, fallback: string): string {
  if (typeof body.message === 'string') return body.message;
  if (Array.isArray(body.message)) return body.message.join(', ');
  if (body.message && typeof body.message === 'object') {
    const m = body.message as Record<string, unknown>;
    if (typeof m.message === 'string') return m.message;
    if (Array.isArray(m.message)) return m.message.join(', ');
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = extractErrorMessage(body, res.statusText);
    throw new ApiError(msg, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export function downloadUrl(path: string) {
  return `${API_BASE}${path}`;
}
