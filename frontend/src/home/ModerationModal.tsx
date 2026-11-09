import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import type { Category, Post } from './types';

type Props = { token: string; onChanged: () => Promise<void>; onViewUser: (userId: number) => void };
type CategoryDecision = { mode: 'new' | 'existing'; name: string; id: string };
type ReviewAction = 'suggest' | 'reject' | 'category' | null;

export function ModerationView({ token, onChanged, onViewUser }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [postponedIds, setPostponedIds] = useState<Set<number>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ReviewAction>(null);
  const [reason, setReason] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const actionEditorRef = useRef<HTMLDivElement>(null);
  const reviewTopRef = useRef<HTMLElement>(null);
  const [decision, setDecision] = useState<CategoryDecision>({ mode: 'new', name: '', id: '' });

  const load = useCallback(async () => {
    try {
      const [postResponse, categoryResponse] = await Promise.all([
        authorizedRequest<Post[]>('/posts/pending', token),
        authorizedRequest<Category[]>('/posts/categories', token),
      ]);
      setPosts(postResponse.data);
      setCategories(categoryResponse.data);
      setSelectedId((current) => postResponse.data.some((post) => post.id_post === current) ? current : (postResponse.data[0]?.id_post ?? null));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la moderación.');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (action !== 'suggest' && action !== 'reject') return;

    const frame = window.requestAnimationFrame(() => {
      const editor = actionEditorRef.current;
      if (!editor) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      editor.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      editor.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [action, selectedId]);

  const orderedPosts = useMemo(() => [...posts].sort((left, right) => Number(postponedIds.has(left.id_post)) - Number(postponedIds.has(right.id_post))), [posts, postponedIds]);
  const filteredPosts = useMemo(() => {
    if (categoryFilter === 'all') return orderedPosts;
    const category = categories.find((item) => String(item.id_category) === categoryFilter);
    if (!category) return orderedPosts;
    return orderedPosts.filter((post) => post.id_category === category.id_category || post.category.localeCompare(category.name, undefined, { sensitivity: 'base' }) === 0);
  }, [categories, categoryFilter, orderedPosts]);
  const selected = filteredPosts.find((post) => post.id_post === selectedId) ?? filteredPosts[0] ?? null;

  function selectPost(post: Post) {
    setSelectedId(post.id_post);
    setAction(null);
    setReason('');
    setError(null);
  }

  function openAction(nextAction: Exclude<ReviewAction, null>, post: Post) {
    setAction(nextAction);
    setReason('');
    setError(null);
    if (nextAction === 'category') setDecision({ mode: 'new', name: post.proposed_category || '', id: '' });
  }

  function cancelReasonAction() {
    setAction(null);
    setReason('');
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const homeMain = reviewTopRef.current?.closest<HTMLElement>('.home-main');
      if (homeMain) homeMain.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  async function refreshAfterDecision() {
    setAction(null);
    setReason('');
    await Promise.all([load(), onChanged()]);
  }

  async function approve(post: Post) {
    if (post.proposed_category && action !== 'category') { openAction('category', post); return; }
    const categoryResolution = post.proposed_category
      ? decision.mode === 'existing' ? { id_category: Number(decision.id) } : { category_name: decision.name.trim() }
      : {};
    if (post.proposed_category && ((decision.mode === 'existing' && !decision.id) || (decision.mode === 'new' && !decision.name.trim()))) {
      setError('Elegí una categoría existente o revisá el nombre propuesto.');
      return;
    }
    setSaving(true);
    try {
      await authorizedRequest<unknown>(`/posts/${post.id_post}/status`, token, { method: 'PUT', body: JSON.stringify({ status: 1, reason: null, ...categoryResolution }) });
      setPostponedIds((current) => { const next = new Set(current); next.delete(post.id_post); return next; });
      await refreshAfterDecision();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo aprobar la publicación.'); }
    finally { setSaving(false); }
  }

  async function submitReason(post: Post) {
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    setSaving(true);
    try {
      if (action === 'suggest') await authorizedRequest<unknown>(`/posts/${post.id_post}/revision-request`, token, { method: 'PUT', body: JSON.stringify({ reason: trimmedReason }) });
      else await authorizedRequest<unknown>(`/posts/${post.id_post}/status`, token, { method: 'PUT', body: JSON.stringify({ status: 3, reason: trimmedReason }) });
      setPostponedIds((current) => { const next = new Set(current); next.delete(post.id_post); return next; });
      await refreshAfterDecision();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la decisión.'); }
    finally { setSaving(false); }
  }

  function postpone(post: Post) {
    const nextPostponed = new Set(postponedIds).add(post.id_post);
    setPostponedIds(nextPostponed);
    setAction(null);
    setReason('');
    const next = posts.find((candidate) => candidate.id_post !== post.id_post && !nextPostponed.has(candidate.id_post));
    if (next) setSelectedId(next.id_post);
  }

  return <section className="admin-workspace moderation-workspace" aria-labelledby="moderation-title">
    <header className="workspace-heading my-services-heading"><div><h1 id="moderation-title">Administrar Servicios</h1><p>{posts.length} publicaciones pendientes de revisión.</p></div></header>
    <div className="admin-workspace-content">
      {error && <Alert tone="danger">{error}</Alert>}
      {loading ? <div className="modal-loading">Cargando publicaciones…</div> : posts.length ? <div className="moderation-board">
        <aside className="moderation-queue" aria-label="Publicaciones pendientes">
          <div className="moderation-queue-heading"><div><span>Cola de revisión</span><details className="moderation-category-filter"><summary><span>Filtrar por categoría</span><i className="bi bi-chevron-down" aria-hidden="true" /></summary><div className="moderation-category-menu"><button className={categoryFilter === 'all' ? 'is-active' : ''} type="button" onClick={(event) => { setCategoryFilter('all'); setSelectedId(null); setAction(null); event.currentTarget.closest('details')?.removeAttribute('open'); }}>Todas las categorías</button>{categories.map((category) => <button className={categoryFilter === String(category.id_category) ? 'is-active' : ''} key={category.id_category} type="button" onClick={(event) => { setCategoryFilter(String(category.id_category)); setSelectedId(null); setAction(null); event.currentTarget.closest('details')?.removeAttribute('open'); }}>{category.name}</button>)}</div></details></div><i className="bi bi-list-check moderation-queue-icon" aria-hidden="true" /></div>
          <div className="moderation-list">{filteredPosts.map((post) => <button className={`moderation-row ${selected?.id_post === post.id_post ? 'is-selected' : ''}`} key={post.id_post} type="button" aria-pressed={selected?.id_post === post.id_post} onClick={() => selectPost(post)}>
            <div className="admin-post-thumb">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div>
            <div className="moderation-copy"><span>{post.category} · {post.author}</span><h3>{post.title}</h3>{postponedIds.has(post.id_post) && <small><i className="bi bi-clock" /> Pospuesta</small>}</div>
            <i className="bi bi-chevron-right moderation-chevron" aria-hidden="true" />
          </button>)}{filteredPosts.length === 0 && <div className="moderation-filter-empty"><i className="bi bi-funnel" /><span>No hay publicaciones pendientes en esta categoría.</span></div>}</div>
        </aside>

        {selected ? <section ref={reviewTopRef} className="moderation-review" aria-live="polite">
          <article className="moderation-preview-card">
            <div className="moderation-preview-image">{selected.image_url ? <img src={selected.image_url} alt={`Vista previa de ${selected.title}`} /> : <i className="bi bi-image" />}</div>
            <div className="moderation-preview-body"><div className="moderation-preview-meta">{selected.id_user ? <button className="moderation-preview-author" type="button" onClick={() => onViewUser(selected.id_user!)}>{selected.author_avatar ? <img src={selected.author_avatar} alt="" /> : <i className="bi bi-person-fill" aria-hidden="true" />}<span>{selected.author}</span></button> : <span className="moderation-preview-author">{selected.author_avatar ? <img src={selected.author_avatar} alt="" /> : <i className="bi bi-person-fill" aria-hidden="true" />}<span>{selected.author}</span></span>}<span className="detail-category moderation-preview-category"><i className="bi bi-tag-fill" aria-hidden="true" />{selected.category}</span></div><h2>{selected.title}</h2><p>{selected.description}</p>{selected.proposed_category && <div className="proposed-category-notice"><i className="bi bi-stars" /><div><span>Categoría propuesta</span><strong>{selected.proposed_category}</strong></div></div>}</div>
          </article>

          <div className="moderation-decision-grid" aria-label="Acciones de moderación">
            <button className="moderation-decision moderation-decision--approve" type="button" disabled={saving} onClick={() => void approve(selected)}><i className="bi bi-check-lg" /><span><strong>Aceptar</strong></span></button>
            <button className={`moderation-decision ${action === 'suggest' ? 'is-active' : ''}`} type="button" disabled={saving} onClick={() => openAction('suggest', selected)}><i className="bi bi-pencil-square" /><span><strong>Sugerir modificación</strong></span></button>
            <button className={`moderation-decision moderation-decision--reject ${action === 'reject' ? 'is-active' : ''}`} type="button" disabled={saving} onClick={() => openAction('reject', selected)}><i className="bi bi-x-lg" /><span><strong>Rechazar</strong></span></button>
            <button className="moderation-decision moderation-decision--postpone" type="button" disabled={saving || postponedIds.has(selected.id_post)} onClick={() => postpone(selected)}><i className="bi bi-clock" /><span><strong>{postponedIds.has(selected.id_post) ? 'Pospuesta' : 'Posponer'}</strong></span></button>
          </div>

          {(action === 'suggest' || action === 'reject') && <div ref={actionEditorRef} className={`moderation-action-editor moderation-action-editor--${action}`}><div><span>{action === 'suggest' ? 'Sugerencia para el prestador' : 'Motivo del rechazo'}</span><small>{reason.length}/255</small></div><textarea maxLength={255} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={action === 'suggest' ? 'Explicá qué debería modificar antes de publicar…' : 'Explicá por qué la publicación no puede aprobarse…'} /><div className="moderation-editor-actions"><button className="secondary-button" type="button" disabled={saving} onClick={cancelReasonAction}>Cancelar</button><button className={action === 'reject' ? 'danger-button' : 'primary-button'} type="button" disabled={saving || !reason.trim()} onClick={() => void submitReason(selected)}>{saving ? 'Guardando…' : action === 'suggest' ? 'Enviar sugerencia' : 'Confirmar rechazo'}</button></div></div>}

          {action === 'category' && <div className="moderation-action-editor category-review-editor"><div className="category-review-heading"><div><span>Categoría propuesta</span><strong>{selected.proposed_category}</strong></div></div><div className="category-review-options"><label className={decision.mode === 'new' ? 'is-selected' : ''}><input type="radio" name="category-resolution" checked={decision.mode === 'new'} onChange={() => setDecision({ ...decision, mode: 'new' })} /><span><strong>Aprobar o mejorar</strong><small>Creará una categoría con el nombre definitivo.</small></span></label><label className={decision.mode === 'existing' ? 'is-selected' : ''}><input type="radio" name="category-resolution" checked={decision.mode === 'existing'} onChange={() => setDecision({ ...decision, mode: 'existing' })} /><span><strong>Usar una existente</strong><small>Reasignará la publicación.</small></span></label></div>{decision.mode === 'new' ? <label>Nombre definitivo<input maxLength={45} value={decision.name} onChange={(event) => setDecision({ ...decision, name: event.target.value })} /></label> : <label>Categoría existente<select value={decision.id} onChange={(event) => setDecision({ ...decision, id: event.target.value })}><option value="">Seleccioná una categoría</option>{categories.map((category) => <option key={category.id_category} value={category.id_category}>{category.name}</option>)}</select></label>}<div className="moderation-editor-actions"><button className="secondary-button" type="button" disabled={saving} onClick={() => setAction(null)}>Cancelar</button><button className="primary-button" type="button" disabled={saving} onClick={() => void approve(selected)}>{saving ? 'Publicando…' : 'Aceptar y publicar'}</button></div></div>}
        </section> : <div className="empty-state moderation-filter-review-empty"><i className="bi bi-funnel" /><h3>Sin pendientes</h3><p>Elegí otra categoría para continuar revisando publicaciones.</p></div>}
      </div> : <div className="empty-state compact-empty"><i className="bi bi-check-circle" /><h3>Todo al día</h3><p>No hay publicaciones pendientes.</p></div>}
    </div>
  </section>;
}
