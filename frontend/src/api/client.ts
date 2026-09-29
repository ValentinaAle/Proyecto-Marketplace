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
  const response = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const payload = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !payload.ok) {
    throw new ApiError(payload.message ?? 'No pudimos completar la operación.', response.status);
  }
  return payload;
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
