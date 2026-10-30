import { useEffect, useRef, useState } from 'react';
import type { SessionUser } from '../auth/session';

type SidebarProps = {
  user: SessionUser;
  activeItem: string;
  reviewCount?: number;
  onLegacyAction: (label: string) => void;
};

type Item = { label: string; icon: string; adminOnly?: boolean; userOnly?: boolean };

const items: Item[] = [
  { label: 'Publicaciones', icon: 'bi-collection-fill' },
  { label: 'Mis Servicios', icon: 'bi-briefcase-fill', userOnly: true },
  { label: 'Calificar servicios', icon: 'bi-star-fill', userOnly: true },
  { label: 'Soporte', icon: 'bi-chat-dots-fill' },
  { label: 'Términos y Condiciones', icon: 'bi-file-earmark-text-fill' },
  { label: 'Usuarios', icon: 'bi-people-fill', adminOnly: true },
  { label: 'Administrar Servicios', icon: 'bi-grid-fill', adminOnly: true },
];

export function Sidebar({ user, activeItem, reviewCount = 0, onLegacyAction }: SidebarProps) {
  const isAdmin = user.role === 'ADMIN';
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const visibleItems = items.filter((item) => (!item.adminOnly || isAdmin) && (!item.userOnly || !isAdmin));

  useEffect(() => {
    if (!menuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (event.target instanceof Node && !sidebarRef.current?.contains(event.target)) setMenuOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeMenu);
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <aside ref={sidebarRef} className="home-sidebar" aria-label="Navegación principal">
      <a className="home-logo" href="/home" aria-label="FIVOX, inicio"><img src="/fivox-logo.png" alt="FIVOX" /></a>
      <button className="home-menu-toggle" type="button" aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menuOpen} aria-controls="home-navigation" onClick={() => setMenuOpen((current) => !current)}><i className={menuOpen ? 'bi bi-x-lg' : 'bi bi-list'} aria-hidden="true" /></button>
      <nav className={menuOpen ? 'home-nav is-open' : 'home-nav'} id="home-navigation">
        {visibleItems.map((item) => (
          <button key={item.label} className={`${activeItem === item.label ? 'is-active ' : ''}${item.label === 'Publicaciones' ? 'is-mobile-docked' : ''}`.trim() || undefined} type="button" aria-current={activeItem === item.label ? 'page' : undefined} onClick={() => { onLegacyAction(item.label); setMenuOpen(false); }}>
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
            {item.label === 'Calificar servicios' && reviewCount > 0 && <span className="nav-badge" aria-label={`${reviewCount} servicio${reviewCount === 1 ? '' : 's'} para calificar`}>{reviewCount}</span>}
          </button>
        ))}
      </nav>
      <footer className="sidebar-terminal" aria-label="Información de FIVOX">
        <p className="terminal-command" aria-hidden="true">&gt; fivox --about</p>
        <div className="terminal-output">
          <section><span>Plataforma</span><strong>Servicios centralizados a tu alcance</strong></section>
          <section><span>Creadoras</span><a href="https://www.linkedin.com/in/valentina-ale/" target="_blank" rel="noopener noreferrer">↳ Ale Valentina <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a><a href="https://www.linkedin.com/in/ludmila-miguenz-alvarez/" target="_blank" rel="noopener noreferrer">↳ Miguenz Alvarez Ludmila <i className="bi bi-box-arrow-up-right" aria-hidden="true" /></a></section>
          <small>© 2026 FIVOX · Todos los derechos reservados</small>
        </div>
      </footer>
    </aside>
  );
}
