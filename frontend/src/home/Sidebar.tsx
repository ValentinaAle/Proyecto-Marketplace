import type { SessionUser } from '../auth/session';

type SidebarProps = {
  user: SessionUser;
  activeItem: string;
  reviewCount?: number;
  onLegacyAction: (label: string) => void;
  onLogout: () => void;
};

type Item = { label: string; icon: string; adminOnly?: boolean; userOnly?: boolean };

const items: Item[] = [
  { label: 'Publicaciones', icon: 'bi-collection-fill' },
  { label: 'Mis Servicios', icon: 'bi-briefcase-fill', userOnly: true },
  { label: 'Calificar servicios', icon: 'bi-star-fill', userOnly: true },
  { label: 'Términos y Condiciones', icon: 'bi-file-earmark-text-fill' },
  { label: 'Usuarios', icon: 'bi-people-fill', adminOnly: true },
  { label: 'Soporte', icon: 'bi-chat-dots-fill', adminOnly: true },
  { label: 'Administrar Servicios', icon: 'bi-grid-fill', adminOnly: true },
];

export function Sidebar({ user, activeItem, reviewCount = 0, onLegacyAction, onLogout }: SidebarProps) {
  const isAdmin = user.role === 'ADMIN';
  const visibleItems = items.filter((item) => (!item.adminOnly || isAdmin) && (!item.userOnly || !isAdmin));

  return (
    <aside className="home-sidebar" aria-label="Navegación principal">
      <a className="home-logo" href="/home" aria-label="FIVOX, inicio">FIVOX</a>
      <nav className="home-nav">
        {visibleItems.map((item) => (
          <button key={item.label} className={activeItem === item.label ? 'is-active' : undefined} type="button" aria-current={activeItem === item.label ? 'page' : undefined} onClick={() => onLegacyAction(item.label)}>
            <i className={`bi ${item.icon}`} aria-hidden="true" />
            <span>{item.label}</span>
            {item.label === 'Calificar servicios' && reviewCount > 0 && <span className="nav-badge" aria-label={`${reviewCount} servicio${reviewCount === 1 ? '' : 's'} para calificar`}>{reviewCount}</span>}
          </button>
        ))}
        <button className="logout-action" type="button" onClick={onLogout}>
          <i className="bi bi-box-arrow-right" aria-hidden="true" />
          <span>Cerrar sesión</span>
        </button>
      </nav>
    </aside>
  );
}
