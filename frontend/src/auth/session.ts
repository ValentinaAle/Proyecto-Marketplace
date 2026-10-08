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

export function getToken(): string | null {
  return localStorage.getItem('fivox_token') || sessionStorage.getItem('fivox_token');
}

export function getSessionUser(): SessionUser | null {
  const raw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  ['fivox_token', 'fivox_user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function saveSession(data: AuthData, persistent = false): void {
  const target = persistent ? localStorage : sessionStorage;
  const other = persistent ? sessionStorage : localStorage;
  other.removeItem('fivox_token');
  other.removeItem('fivox_user');
  target.setItem('fivox_token', data.token);
  target.setItem('fivox_user', JSON.stringify(data.user));
}

export function replaceSession(data: AuthData): void {
  const persistent = Boolean(localStorage.getItem('fivox_token'));
  const current = getSessionUser();
  saveSession({ token: data.token, user: { ...current, ...data.user } as SessionUser }, persistent);
}

export function goToHome(): void {
  window.location.assign('/home');
}
