import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'fivox-theme';
const THEME_EVENT = 'fivox-theme-change';

function preferredTheme(): Theme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111816' : '#e2e9e6');
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => preferredTheme());
  const dark = theme === 'dark';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = () => setTheme(preferredTheme());
    window.addEventListener(THEME_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_EVENT, syncTheme);
  }, []);

  function toggleTheme() {
    const nextTheme: Theme = dark ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      type="button"
      aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      aria-pressed={dark}
      title={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
      onClick={toggleTheme}
    >
      <span className="theme-toggle-icons" aria-hidden="true">
        <i className="bi bi-lightbulb-fill theme-icon theme-icon--light" />
        <i className="bi bi-lightbulb theme-icon theme-icon--dark" />
      </span>
      <span className="mobile-dock-label">Tema</span>
    </button>
  );
}
