type FloatingActionsProps = {
  isAdmin: boolean;
  onAction: (label: string) => void;
};

export function FloatingActions({ isAdmin, onAction }: FloatingActionsProps) {
  const actions = [
    { label: 'Mi perfil', icon: 'bi-person-fill' },
    ...(isAdmin ? [{ label: 'Reportes', icon: 'bi-file-earmark-bar-graph-fill' }] : []),
    ...(!isAdmin ? [{ label: 'Crear publicación', icon: 'bi-plus-lg', primary: true }] : []),
    ...(!isAdmin ? [{ label: 'Soporte', icon: 'bi-chat-dots-fill' }] : []),
  ];

  return (
    <div className="floating-actions">
      {actions.map((action) => (
        <button key={action.label} className={action.primary ? 'floating-action floating-action--primary' : 'floating-action'} type="button" aria-label={action.label} title={action.label} onClick={() => onAction(action.label)}>
          <i className={`bi ${action.icon}`} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
