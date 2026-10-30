import { ThemeToggle } from '../components/ThemeToggle';

type FloatingActionsProps = {
  isAdmin: boolean;
  activeAction?: string;
  onAction: (label: string) => void;
  onLogout?: () => void;
  logoutArmed?: boolean;
};

export function FloatingActions({ isAdmin, activeAction, onAction, onLogout, logoutArmed = false }: FloatingActionsProps) {
  const actions = [
    { label: 'Mi perfil', icon: 'bi-person-fill' },
    ...(isAdmin ? [{ label: 'Reportes', icon: 'bi-file-earmark-bar-graph-fill' }] : []),
    ...(!isAdmin ? [{ label: 'Crear publicación', icon: 'bi-plus-lg' }] : []),
  ];

  return (
    <>
      <div className="floating-actions">
        <ThemeToggle className="floating-action" />
        {!isAdmin && <button className={`floating-action floating-action--publications mobile-dock-only${activeAction === 'Publicaciones' ? ' is-active' : ''}`} type="button" aria-label="Publicaciones" aria-current={activeAction === 'Publicaciones' ? 'page' : undefined} title="Publicaciones" onClick={() => onAction('Publicaciones')}><i className="bi bi-collection-fill" aria-hidden="true" /><span className="mobile-dock-label">Inicio</span></button>}
        {actions.map((action) => (
          <button key={action.label} className={`floating-action${action.label === 'Crear publicación' ? ' floating-action--primary' : action.label === 'Mi perfil' ? ' floating-action--profile' : ''}${activeAction === action.label ? ' is-active' : ''}`} type="button" aria-label={action.label} aria-current={activeAction === action.label ? 'page' : undefined} title={action.label} onClick={() => onAction(action.label)}>
            <i className={`bi ${action.icon}`} aria-hidden="true" />
            <span className="mobile-dock-label">{action.label === 'Crear publicación' ? 'Publicar' : action.label === 'Mi perfil' ? 'Perfil' : action.label}</span>
          </button>
        ))}
      </div>
      {onLogout && <div className="chatbot-actions admin-logout-actions">
        <button className={logoutArmed ? 'chatbot-logout is-armed' : 'chatbot-logout'} type="button" aria-label={logoutArmed ? 'Confirmar cierre de sesión' : 'Cerrar sesión'} title={logoutArmed ? 'Tocá de nuevo para salir' : 'Cerrar sesión'} onClick={onLogout}>
          <i className={logoutArmed ? 'bi bi-x-lg' : 'bi bi-box-arrow-right'} aria-hidden="true" />
          <span className="mobile-dock-label">Salir</span>
        </button>
        {logoutArmed && <span className="logout-confirm-hint" role="status">Tocá de nuevo para salir</span>}
      </div>}
    </>
  );
}
