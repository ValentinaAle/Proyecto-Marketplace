import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'default' | 'danger';
  busy?: boolean;
};

export function ConfirmationDialog({ title, message, confirmLabel, onConfirm, onCancel, tone = 'default', busy = false }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!busy) onCancel();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      previousFocus?.focus();
    };
  }, [busy, onCancel]);

  return createPortal(
    <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className={`confirmation-dialog confirmation-dialog--${tone}`} ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="confirmation-icon" aria-hidden="true"><i className={tone === 'danger' ? 'bi bi-exclamation-triangle' : 'bi bi-question-lg'} /></div>
        <div className="confirmation-copy"><h2 id={titleId}>{title}</h2><p id={descriptionId}>{message}</p></div>
        <div className="confirmation-actions">
          <button className="secondary-button" ref={cancelRef} type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
          <button className={tone === 'danger' ? 'confirmation-danger-button' : 'primary-button'} type="button" disabled={busy} onClick={onConfirm}>{busy ? 'Procesando…' : confirmLabel}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
