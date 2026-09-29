import type { PropsWithChildren } from 'react';

type AuthLayoutProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <main className="auth-shell">
      <section className="auth-brand" aria-label="Presentación de FIVOX">
        <a className="brand" href="/" aria-label="FIVOX, inicio">FIVOX</a>
        <div className="brand-copy">
          <h1>Encontrá servicios de forma simple.</h1>
          <p>Conectate con profesionales, técnicos, docentes y freelancers cerca tuyo. Todo en un solo lugar.</p>
        </div>
        <span className="brand-note">Servicios confiables, en un solo lugar</span>
        <span className="orb orb--small" aria-hidden="true" />
        <span className="orb orb--large" aria-hidden="true" />
      </section>

      <section className="auth-panel">
        <div className="auth-form">
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
