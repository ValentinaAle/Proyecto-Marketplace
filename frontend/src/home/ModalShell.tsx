import { useEffect, type PropsWithChildren, type ReactNode } from 'react';

type ModalShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  onClose: () => void;
  footer?: ReactNode;
  headerContent?: ReactNode;
  contentClassName?: string;
  className?: string;
  size?: 'medium' | 'large';
}>;

export function ModalShell({ title, subtitle, onClose, footer, headerContent, contentClassName = '', className = '', size = 'medium', children }: ModalShellProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`form-modal form-modal--${size} ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="form-modal-title">
        <header className="form-modal-header"><div className="form-modal-header-main"><div><h2 id="form-modal-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="modal-close modal-close--inline" type="button" aria-label="Cerrar" onClick={onClose}><i className="bi bi-x-lg" /></button></div>{headerContent}</header>
        <div className={`form-modal-content ${contentClassName}`.trim()}>{children}</div>
        {footer && <footer className="form-modal-footer">{footer}</footer>}
      </section>
    </div>
  );
}
