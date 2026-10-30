import type { PropsWithChildren } from 'react';
import { ThemeToggle } from './ThemeToggle';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
  className?: string;
}>;

export function AuthLayout({ title, subtitle, className = '', children }: AuthLayoutProps) {
  return (
    <main className={`auth-shell${className ? ` ${className}` : ''}`}>
      <section className="auth-brand" aria-label="Presentación de FIVOX">
        <a className="brand" href="/" aria-label="FIVOX, inicio"><img src="/fivox-logo.png" alt="FIVOX" /></a>
        <div className="brand-copy">
          <h1>Encontrá servicios de forma simple.</h1>
          <p>Conectate con profesionales, técnicos, docentes y freelancers cerca tuyo. Todo en un solo lugar.</p>
        </div>
        <span className="orb orb--small" aria-hidden="true" />
        <span className="orb orb--large" aria-hidden="true" />
      </section>

      <section className="auth-panel">
        <ThemeToggle className="auth-theme-toggle" />
        <div className="auth-form">
          <a className="auth-mobile-brand" href="/" aria-label="FIVOX, inicio"><img src="/fivox-logo.png" alt="FIVOX" /></a>
          <header className="auth-heading">
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
