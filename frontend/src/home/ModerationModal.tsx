import { useCallback, useEffect, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';
import type { Category, Post } from './types';

type Props = { token: string; onClose: () => void; onChanged: () => Promise<void> };
type CategoryDecision = { mode: 'new' | 'existing'; name: string; id: string };

export function ModerationModal({ token, onClose, onChanged }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<Post | null>(null);
  const [reviewing, setReviewing] = useState<Post | null>(null);
  const [decision, setDecision] = useState<CategoryDecision>({ mode: 'new', name: '', id: '' });
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [postResponse, categoryResponse] = await Promise.all([
        authorizedRequest<Post[]>('/posts/pending', token),
        authorizedRequest<Category[]>('/posts/categories', token),
      ]);
      setPosts(postResponse.data);
      setCategories(categoryResponse.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la moderación.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function reviewCategory(post: Post) {
    setReviewing(post);
    setRejecting(null);
    setDecision({ mode: 'new', name: post.proposed_category || '', id: '' });
  }

  async function moderate(post: Post, status: 1 | 3, rejectionReason?: string) {
    if (status === 1 && post.proposed_category && !reviewing) { reviewCategory(post); return; }
    const categoryResolution = post.proposed_category
      ? decision.mode === 'existing' ? { id_category: Number(decision.id) } : { category_name: decision.name.trim() }
      : {};
    if (status === 1 && post.proposed_category && ((decision.mode === 'existing' && !decision.id) || (decision.mode === 'new' && !decision.name.trim()))) {
      setError('Elegí una categoría existente o revisá el nombre propuesto.');
      return;
    }
    try {
      setError(null);
      await authorizedRequest<unknown>(`/posts/${post.id_post}/status`, token, { method: 'PUT', body: JSON.stringify({ status, reason: rejectionReason || null, ...categoryResolution }) });
      setRejecting(null); setReviewing(null); setReason('');
      await Promise.all([load(), onChanged()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo moderar la publicación.'); }
  }

  return <ModalShell title="Administrar Servicios" subtitle={`${posts.length} publicaciones pendientes de revisión.`} onClose={onClose} size="large">
    {error && <Alert tone="danger">{error}</Alert>}
    {loading ? <div className="modal-loading">Cargando publicaciones…</div> : posts.length ? <div className="moderation-list">{posts.map((post) => <article className="moderation-row" key={post.id_post}>
      <div className="admin-post-thumb">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div>
      <div className="moderation-copy">
        <span>{post.category} · {post.author}</span>
        {post.proposed_category && <strong className="proposed-category-badge"><i className="bi bi-stars" /> Categoría propuesta</strong>}
        <h3>{post.title}</h3><p>{post.description}</p>
      </div>
      <div className="moderation-actions"><button className="positive-action" type="button" onClick={() => void moderate(post, 1)}>{post.proposed_category ? 'Revisar categoría' : 'Aprobar'}</button><button className="danger-action" type="button" onClick={() => { setReviewing(null); setRejecting(post); }}>Rechazar</button></div>
    </article>)}</div> : <div className="empty-state compact-empty"><i className="bi bi-check-circle" /><h3>Todo al día</h3><p>No hay publicaciones pendientes.</p></div>}
    {reviewing && <div className="inline-editor category-review-editor">
      <div className="category-review-heading"><div><span>Categoría propuesta</span><strong>{reviewing.proposed_category}</strong></div><button type="button" aria-label="Cerrar revisión" onClick={() => setReviewing(null)}><i className="bi bi-x-lg" /></button></div>
      <div className="category-review-options">
        <label className={decision.mode === 'new' ? 'is-selected' : ''}><input type="radio" name="category-resolution" checked={decision.mode === 'new'} onChange={() => setDecision({ ...decision, mode: 'new' })} /><span><strong>Aprobar o mejorar</strong><small>Creará una categoría nueva con este nombre.</small></span></label>
        <label className={decision.mode === 'existing' ? 'is-selected' : ''}><input type="radio" name="category-resolution" checked={decision.mode === 'existing'} onChange={() => setDecision({ ...decision, mode: 'existing' })} /><span><strong>Usar una existente</strong><small>Reasignará la publicación sin crear otra categoría.</small></span></label>
      </div>
      {decision.mode === 'new' ? <label>Nombre definitivo<input maxLength={45} value={decision.name} onChange={(event) => setDecision({ ...decision, name: event.target.value })} /></label> : <label>Categoría existente<select value={decision.id} onChange={(event) => setDecision({ ...decision, id: event.target.value })}><option value="">Seleccioná una categoría</option>{categories.map((category) => <option key={category.id_category} value={category.id_category}>{category.name}</option>)}</select></label>}
      <div className="inline-editor-actions"><button className="secondary-button" type="button" onClick={() => setReviewing(null)}>Cancelar</button><button className="primary-button modal-primary" type="button" onClick={() => void moderate(reviewing, 1)}>Aprobar publicación</button></div>
    </div>}
    {rejecting && <div className="inline-editor reject-editor"><label>Motivo del rechazo<textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => setRejecting(null)}>Cancelar</button><button className="danger-button" type="button" disabled={!reason.trim()} onClick={() => void moderate(rejecting, 3, reason.trim())}>Confirmar rechazo</button></div>}
  </ModalShell>;
}
