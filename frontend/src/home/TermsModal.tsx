import { useEffect, useState } from 'react';
import { authorizedRequest } from '../api/client';
import type { SessionUser } from '../auth/session';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';

type Terms = { content: string; updated_at?: string };
type Props = { token: string; user: SessionUser; onClose: () => void };
export function TermsModal({ token, user, onClose }: Props) {
  const [terms, setTerms] = useState<Terms | null>(null); const [content, setContent] = useState(''); const [saving, setSaving] = useState(false); const [alert, setAlert] = useState<{ tone: 'danger' | 'success'; message: string } | null>(null);
  useEffect(() => { authorizedRequest<Terms>('/terms', token).then((response) => { setTerms(response.data); setContent(response.data?.content || ''); }).catch((cause: Error) => setAlert({ tone: 'danger', message: cause.message })); }, [token]);
  async function save() { if (!content.trim()) return; setSaving(true); try { await authorizedRequest<unknown>('/terms', token, { method: 'PUT', body: JSON.stringify({ content: content.trim() }) }); setTerms({ content: content.trim(), updated_at: new Date().toISOString() }); setAlert({ tone: 'success', message: 'Términos actualizados correctamente.' }); } catch (cause) { setAlert({ tone: 'danger', message: cause instanceof Error ? cause.message : 'No se pudieron actualizar.' }); } finally { setSaving(false); } }
  const admin = user.role === 'ADMIN';
  return <ModalShell title="Términos y Condiciones" subtitle={terms?.updated_at ? `Última actualización: ${new Date(terms.updated_at).toLocaleDateString('es-AR')}` : 'Condiciones de uso de FIVOX'} onClose={onClose} footer={admin ? <button className="primary-button modal-primary" type="button" disabled={saving || !content.trim()} onClick={save}>{saving ? 'Guardando…' : 'Guardar cambios'}</button> : undefined}>{alert && <Alert tone={alert.tone}>{alert.message}</Alert>}{terms === null ? <div className="modal-loading">Cargando términos…</div> : admin ? <textarea className="terms-editor" value={content} onChange={(event) => setContent(event.target.value)} /> : <div className="terms-content">{terms.content}</div>}</ModalShell>;
}
