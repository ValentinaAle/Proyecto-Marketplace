export interface ApiEnvelope<T> {
  ok: boolean;
  message?: string;
  data: T;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
  });

  const payload = await response.json().catch(() => ({ ok: false, message: 'El servidor devolvió una respuesta inválida.' })) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.message ?? 'No pudimos completar la operación.', response.status);
  }
  return payload;
}

export function uploadImage<T>(path: string, token: string, field: string, file: File) {
  const body = new FormData();
  body.append(field, file);
  return authorizedRequest<T>(path, token, { method: 'POST', body });
}

export function authorizedRequest<T>(path: string, token: string, init?: RequestInit) {
  return apiRequest<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
}
