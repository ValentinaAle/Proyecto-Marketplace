import { useEffect, useId, useRef, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: 'default' | 'danger';
  busy?: boolean;
  error?: string | null;
};

export function ReasonDialog({ title, description, label, placeholder, confirmLabel, value, onChange, onConfirm, onCancel, tone = 'default', busy = false, error }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    textareaRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onCancel(); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); previousFocus?.focus(); };
  }, [busy, onCancel]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (value.trim() && !busy) onConfirm();
  }

  return createPortal(
    <div className="confirmation-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div className={`confirmation-dialog reason-dialog confirmation-dialog--${tone}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="confirmation-icon" aria-hidden="true"><i className={tone === 'danger' ? 'bi bi-eye-slash' : 'bi bi-pencil-square'} /></div>
        <div className="confirmation-copy"><h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p></div>
        <form onSubmit={submit}>
          <label>{label}<textarea ref={textareaRef} rows={4} maxLength={255} placeholder={placeholder} value={value} disabled={busy} onChange={(event) => onChange(event.target.value)} /><span>{value.length}/255</span></label>
          {error && <p className="reason-dialog-error" role="alert">{error}</p>}
          <div className="confirmation-actions">
            <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Cancelar</button>
            <button className={tone === 'danger' ? 'confirmation-danger-button' : 'primary-button'} type="submit" disabled={busy || !value.trim()}>{busy ? 'Procesando…' : confirmLabel}</button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
