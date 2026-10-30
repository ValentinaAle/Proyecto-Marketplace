import { Fragment, useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import type { SessionUser } from '../auth/session';
import { Alert } from '../components/Alert';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ModalShell } from './ModalShell';

type Terms = { content: string; updated_at?: string };
type TermItem = { id: string; title: string; body: string };
type PendingTermAction = { type: 'remove'; id: string; position: number; title: string };
type Props = { token: string; user: SessionUser };
type ModalProps = { token: string; onClose: () => void };

function parseItems(content: string): TermItem[] {
  return content.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).map((block, index) => {
    const [heading, ...body] = block.split('\n');
    return { id: `${Date.now()}-${index}`, title: heading.replace(/^\d+\.\s*/, '').trim(), body: body.join('\n').trim() };
  });
}

function emptyTermItem(): TermItem {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: '', body: '' };
}

export function TermsModal({ token, onClose }: ModalProps) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authorizedRequest<Terms>('/terms', token)
      .then((response) => setTerms(response.data))
      .catch((cause: Error) => setError(cause.message));
  }, [token]);

  const items = terms ? parseItems(terms.content) : [];
  return <ModalShell title="Términos y Condiciones" subtitle={terms?.updated_at ? `Última actualización: ${new Date(terms.updated_at).toLocaleDateString('es-AR')}` : 'Condiciones de uso de FIVOX'} onClose={onClose} className="form-modal--terms" size="large">
    {error && <Alert tone="danger">{error}</Alert>}
    {!terms && !error ? <div className="modal-loading">Cargando términos…</div> : <div className="terms-content">{items.map((item, index) => <section key={item.id}><h3>{index + 1}. {item.title}</h3><p>{item.body}</p></section>)}</div>}
  </ModalShell>;
}

export function TermsView({ token, user }: Props) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [items, setItems] = useState<TermItem[]>([]);
  const [savedItems, setSavedItems] = useState<TermItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingTermAction | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragInsertIndex, setDragInsertIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);
  const admin = user.role === 'ADMIN';
  const content = useMemo(() => items.map((item, index) => `${index + 1}. ${item.title.trim()}\n${item.body.trim()}`).join('\n\n'), [items]);
  const hasChanges = useMemo(() => items.length !== savedItems.length || items.some((item, index) => {
    const saved = savedItems[index];
    return !saved || item.id !== saved.id || item.title !== saved.title || item.body !== saved.body;
  }), [items, savedItems]);

  useEffect(() => {
    authorizedRequest<Terms>('/terms', token).then((response) => {
      const parsed = parseItems(response.data?.content || '');
      setTerms(response.data); setItems(parsed); setSavedItems(parsed.map((item) => ({ ...item })));
    }).catch((cause: Error) => setAlert({ tone: 'danger', message: cause.message }));
  }, [token]);

  function update(id: string, field: 'title' | 'body', value: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  function insertAt(index: number) {
    setItems((current) => [...current.slice(0, index), emptyTermItem(), ...current.slice(index)]);
  }

  function moveTo(index: number, nextIndex: number) {
    if (nextIndex === index || nextIndex < 0 || nextIndex >= items.length) return;
    setItems((current) => { const next = [...current]; const [moved] = next.splice(index, 1); next.splice(nextIndex, 0, moved); return next; });
  }

  function dropAt(insertIndex: number) {
    if (!draggedId) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = from < insertIndex ? insertIndex - 1 : insertIndex;
    if (from >= 0 && to !== from) moveTo(from, to);
    setDraggedId(null); setDragInsertIndex(null);
  }

  function isCurrentPosition(insertIndex: number) {
    if (!draggedId) return false;
    const currentIndex = items.findIndex((item) => item.id === draggedId);
    return currentIndex >= 0 && (insertIndex === currentIndex || insertIndex === currentIndex + 1);
  }

  function cancelEditing() {
    setItems(savedItems.map((item) => ({ ...item })));
    setEditing(false); setPendingAction(null); setAlert(null);
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    setItems((current) => current.filter((item) => item.id !== pendingAction.id));
    setPendingAction(null);
  }

  async function save() {
    if (!hasChanges) return;
    if (!items.length || items.some((item) => !item.title.trim() || !item.body.trim())) { setAlert({ tone: 'danger', message: 'Completá el subtítulo y el texto de cada apartado.' }); return; }
    setSaving(true); setAlert(null);
    try {
      await authorizedRequest<unknown>('/terms', token, { method: 'PUT', body: JSON.stringify({ content }) });
      const updatedAt = new Date().toISOString();
      setTerms({ content, updated_at: updatedAt }); setSavedItems(items.map((item) => ({ ...item })));
      setEditing(false); setAlert({ tone: 'success', message: 'Términos actualizados correctamente.' });
    } catch (cause) { setAlert({ tone: 'danger', message: cause instanceof Error ? cause.message : 'No se pudieron actualizar.' }); } finally { setSaving(false); }
  }

  return <><section className="admin-workspace terms-workspace" aria-labelledby="terms-title">
    <header className="workspace-heading my-services-heading"><div><h1 id="terms-title">Términos y Condiciones</h1><p>{editing ? 'Edición de apartados y orden de visualización.' : terms?.updated_at ? `Vista previa · última actualización: ${new Date(terms.updated_at).toLocaleDateString('es-AR')}` : 'Vista previa de las condiciones de uso'}</p></div>{admin && (editing ? <div className="terms-header-actions"><button className="secondary-button" type="button" disabled={saving} onClick={cancelEditing}>Cancelar</button><button className="primary-button terms-save" type="button" disabled={saving || !items.length || !hasChanges} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div> : <button className="primary-button terms-save" type="button" onClick={() => { setEditing(true); setAlert(null); }}><i className="bi bi-pencil" /> Editar</button>)}</header>
    <div className="admin-workspace-content">{alert && <Alert tone={alert.tone}>{alert.message}</Alert>}{terms === null ? <div className="modal-loading">Cargando términos…</div> : admin && editing ? <div className={`terms-item-editor${draggedId ? ' is-dragging' : ''}`}>
      {items.map((item, index) => <Fragment key={item.id}><div className={`term-drop-zone${isCurrentPosition(index) ? ' is-disabled' : ''}${dragInsertIndex === index && !isCurrentPosition(index) ? ' is-active' : ''}`} onDragEnter={(event) => { if (isCurrentPosition(index)) return; event.preventDefault(); setDragInsertIndex(index); }} onDragOver={(event) => { if (isCurrentPosition(index)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragInsertIndex(index); }} onDrop={(event) => { if (isCurrentPosition(index)) return; event.preventDefault(); dropAt(index); }}><span>Soltar aquí</span></div><article className={`term-edit-card${draggedId === item.id ? ' is-dragging' : ''}`}><span className="term-drag-handle" draggable title="Arrastrar para cambiar de ubicación" aria-label="Arrastrar apartado" onDragStart={(event) => { const card = event.currentTarget.closest('.term-edit-card'); if (card) event.dataTransfer.setDragImage(card, 20, 20); setDraggedId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id); }} onDragEnd={() => { setDraggedId(null); setDragInsertIndex(null); }}><i className="bi bi-list" /></span><div className="term-fields"><label>Subtítulo<input value={item.title} onChange={(event) => update(item.id, 'title', event.target.value)} /></label><label>Texto<textarea rows={3} value={item.body} onChange={(event) => update(item.id, 'body', event.target.value)} /></label></div><div className="term-card-actions"><details className="term-insert-menu"><summary aria-label="Agregar término" title="Agregar término"><i className="bi bi-plus-lg" /></summary><div><button type="button" onClick={(event) => { insertAt(index); event.currentTarget.closest('details')?.removeAttribute('open'); }}><i className="bi bi-arrow-up" /> Agregar término arriba</button><button type="button" onClick={(event) => { insertAt(index + 1); event.currentTarget.closest('details')?.removeAttribute('open'); }}><i className="bi bi-arrow-down" /> Agregar término debajo</button></div></details><button className="term-remove" type="button" aria-label={`Eliminar apartado ${index + 1}`} title="Eliminar apartado" onClick={() => setPendingAction({ type: 'remove', id: item.id, position: index, title: item.title })}><i className="bi bi-trash3" /></button></div></article></Fragment>)}
      {!!items.length && <div className={`term-drop-zone${isCurrentPosition(items.length) ? ' is-disabled' : ''}${dragInsertIndex === items.length && !isCurrentPosition(items.length) ? ' is-active' : ''}`} onDragEnter={(event) => { if (isCurrentPosition(items.length)) return; event.preventDefault(); setDragInsertIndex(items.length); }} onDragOver={(event) => { if (isCurrentPosition(items.length)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragInsertIndex(items.length); }} onDrop={(event) => { if (isCurrentPosition(items.length)) return; event.preventDefault(); dropAt(items.length); }}><span>Soltar aquí</span></div>}
      {!items.length && <button className="secondary-button add-term-item" type="button" onClick={() => setItems([emptyTermItem()])}><i className="bi bi-plus-lg" /> Agregar primer apartado</button>}
    </div> : <div className="terms-preview"><div className="terms-preview-bar"><i className="bi bi-eye" /><span>Así verán los términos los usuarios</span></div><div className="terms-content">{items.map((item, index) => <section key={item.id}><h3>{index + 1}. {item.title}</h3><p>{item.body}</p></section>)}</div></div>}</div>
  </section>{pendingAction && <ConfirmationDialog title={`¿Eliminar el apartado ${pendingAction.position + 1}?`} message={`Se eliminará “${pendingAction.title || 'Sin subtítulo'}”. Los demás cambios de esta edición se conservarán.`} confirmLabel="Eliminar apartado" tone="danger" onCancel={() => setPendingAction(null)} onConfirm={confirmPendingAction} />}</>;
}
