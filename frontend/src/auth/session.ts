export interface SessionUser {
  id_user?: number;
  id?: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | string;
}

export interface AuthData {
  token: string;
  user: SessionUser;
}

export function hasSession(): boolean {
  return Boolean(localStorage.getItem('fivox_token') || sessionStorage.getItem('fivox_token'));
}

export function saveSession(data: AuthData, persistent = false): void {
  const target = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  other.removeItem('fivox_token');
  other.removeItem('fivox_user');
  target.setItem('fivox_token', data.token);
  target.setItem('fivox_user', JSON.stringify(data.user));
}

export function goToLegacyHome(): void {
  const target = import.meta.env.VITE_LEGACY_HOME_URL
    ?? (import.meta.env.DEV ? 'http://localhost:3000/home' : '/home');
  window.location.assign(target);
}
