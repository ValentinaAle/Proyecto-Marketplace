import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { authorizedRequest, uploadImage } from '../api/client';
import { Alert } from '../components/Alert';
import { PostDetail } from './PostDetail';
import type { Category, Post } from './types';

type StatusKey = 'pending' | 'approved' | 'rejected' | 'inactive';
type SortKey = 'newest' | 'oldest' | 'name';
type EditFields = { title: string; description: string; image_url: string; id_category: string };

const tabs: Array<{ key: StatusKey; label: string; statuses: number[] }> = [
  { key: 'pending', label: 'Pendientes', statuses: [2] },
  { key: 'approved', label: 'Publicadas', statuses: [1] },
  { key: 'rejected', label: 'Rechazadas', statuses: [3] },
  { key: 'inactive', label: 'Inactivas', statuses: [0] },
];

const statusMeta: Record<StatusKey, { label: string; className: string }> = {
  pending: { label: 'Pendiente', className: 'is-pending' },
  approved: { label: 'Publicada', className: 'is-approved' },
  rejected: { label: 'Rechazada', className: 'is-rejected' },
  inactive: { label: 'Inactiva', className: 'is-inactive' },
};

type Props = { token: string; categories: Category[]; onChanged: () => Promise<void> };

function localDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString('en-CA');
}

export function MyServicesView({ token, categories, onChanged }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<StatusKey>('pending');
  const [query, setQuery] = useState('');
  const [date, setDate] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [preview, setPreview] = useState<Post | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);
  const [fields, setFields] = useState<EditFields>({ title: '', description: '', image_url: '', id_category: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => authorizedRequest<Post[]>('/posts/my', token)
    .then((response) => setPosts(response.data))
    .catch((reason: Error) => setError(reason.message))
    .finally(() => setLoading(false)), [token]);

  useEffect(() => { void load(); }, [load]);

  const currentTab = tabs.find((item) => item.key === tab)!;
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return posts
      .filter((post) => currentTab.statuses.includes(Number(post.is_active)))
      .filter((post) => !normalized || post.title.toLocaleLowerCase('es').includes(normalized))
      .filter((post) => !date || localDate(post.created_at) === date)
      .sort((left, right) => {
        if (sort === 'name') return left.title.localeCompare(right.title, 'es');
        const difference = new Date(left.created_at || 0).getTime() - new Date(right.created_at || 0).getTime();
        return sort === 'oldest' ? difference : -difference;
      });
  }, [posts, currentTab, query, date, sort]);

  async function changeStatus(post: Post, status: 0 | 1) {
    setError(null); setNotice(null);
    try {
      await authorizedRequest<unknown>(`/posts/my/${post.id_post}/status`, token, { method: 'PUT', body: JSON.stringify({ status }) });
      await load(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la publicación.'); }
  }

  async function remove(post: Post) {
    if (!window.confirm('¿Eliminar esta publicación inactiva?')) return;
    try {
      await authorizedRequest<unknown>(`/posts/my/${post.id_post}`, token, { method: 'DELETE' });
      await load(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la publicación.'); }
  }

  function startEditing(post: Post) {
    const category = categories.find((item) => item.name === post.category);
    setEditing(post);
    setFields({ title: post.title, description: post.description, image_url: post.image_url || '', id_category: String(post.id_category || category?.id_category || '') });
    setError(null); setNotice(null);
  }

  function update(name: keyof EditFields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Usá una imagen JPG, PNG o WEBP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('La imagen no puede superar los 5 MB.'); return; }
    setUploading(true); setError(null);
    try {
      const response = await uploadImage<{ url: string }>('/posts/image', token, 'image', file);
      update('image_url', response.data.url);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo subir la imagen.'); } finally { setUploading(false); }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing || !fields.title.trim() || !fields.description.trim() || !fields.id_category) { setError('Título, descripción y categoría son obligatorios.'); return; }
    setSaving(true); setError(null); setNotice(null);
    try {
      await authorizedRequest<unknown>(`/posts/my/${editing.id_post}`, token, { method: 'PUT', body: JSON.stringify({ ...fields, id_category: Number(fields.id_category) }) });
      setEditing(null); setTab('pending');
      setNotice('Cambios guardados. La publicación volvió a revisión.');
      await load(); await onChanged();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo editar la publicación.'); } finally { setSaving(false); }
  }

  const meta = statusMeta[tab];

  return <section className="my-services-view" aria-labelledby="my-services-title">
    <header className="workspace-heading my-services-heading">
      <div><h1 id="my-services-title">Mis Servicios</h1><p>Revisá, filtrá y editá tus publicaciones desde un solo lugar.</p></div>
      <div className="service-filters-panel">
        <div className="service-toolbar">
          <label className="service-search"><i className="bi bi-search" /><input type="search" aria-label="Buscar por nombre" placeholder="Buscar por nombre…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="service-date"><span>Fecha</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <label className="service-sort"><span>Orden</span><select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="newest">Más recientes</option><option value="oldest">Más antiguas</option><option value="name">Nombre A–Z</option></select></label>
          {(query || date) && <button className="clear-service-filters" type="button" onClick={() => { setQuery(''); setDate(''); }}>Limpiar</button>}
        </div>
      </div>
    </header>
    <div className="my-services-content">
      {error && <Alert tone="danger">{error}</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}

      {editing && <form className="service-editor" onSubmit={save}>
        <header><div><h2>Editar publicación</h2><p>Al guardar, los cambios volverán a revisión.</p></div><button type="button" aria-label="Cancelar edición" onClick={() => setEditing(null)}><i className="bi bi-x-lg" /></button></header>
        <div className="service-editor-grid">
          <label>Título <span className="field-count">{fields.title.length}/45</span><input maxLength={45} value={fields.title} onChange={(event) => update('title', event.target.value)} /></label>
          <label>Categoría<select value={fields.id_category} onChange={(event) => update('id_category', event.target.value)}><option value="">Seleccioná una categoría</option>{categories.map((category) => <option key={category.id_category} value={category.id_category}>{category.name}</option>)}</select></label>
          <label className="service-editor-description">Descripción <span className="field-count">{fields.description.length}/300</span><textarea maxLength={300} rows={5} value={fields.description} onChange={(event) => update('description', event.target.value)} /></label>
          <label className="service-editor-image">Imagen <span className="image-upload-field"><span className="image-preview">{fields.image_url ? <img src={fields.image_url} alt="Vista previa" /> : <i className="bi bi-image" />}</span><span className="image-upload-copy"><strong>{uploading ? 'Subiendo imagen…' : fields.image_url ? 'Imagen lista' : 'Sin imagen'}</strong><small>JPG, PNG o WEBP · máximo 5 MB</small><span className="file-button"><i className="bi bi-upload" />Cambiar imagen<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={selectImage} /></span></span></span></label>
        </div>
        <footer><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button modal-primary" type="submit" disabled={saving || uploading}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></footer>
      </form>}

      <div className="service-tabs" role="tablist">{tabs.map((item) => <button key={item.key} className={tab === item.key ? 'is-active' : ''} type="button" role="tab" aria-selected={tab === item.key} onClick={() => { setTab(item.key); setEditing(null); }}>{item.label}<span>{posts.filter((post) => item.statuses.includes(Number(post.is_active))).length}</span></button>)}</div>

      {loading ? <div className="modal-loading">Cargando publicaciones…</div> : visible.length ? <div className="my-services-grid">{visible.map((post) => <article className="post-card my-service-card" key={post.id_post}>
        <div className="post-image">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}<span className={`service-status ${meta.className}`}>{meta.label}</span></div>
        <div className="post-body"><span className="post-category">{post.category}</span><h3>{post.title}</h3><time>{post.created_at ? new Date(post.created_at).toLocaleDateString('es-AR') : 'Sin fecha'}</time>{tab === 'rejected' && post.rejection_reason && <p className="rejection-reason"><i className="bi bi-info-circle-fill" /> {post.rejection_reason}</p>}<div className="my-service-actions"><button type="button" onClick={() => setPreview(post)}><i className="bi bi-eye" /> Vista previa</button><button type="button" onClick={() => startEditing(post)}><i className="bi bi-pencil" /> Editar</button>{tab === 'approved' && <button type="button" onClick={() => changeStatus(post, 0)}>Desactivar</button>}{tab === 'inactive' && <><button className="positive-action" type="button" onClick={() => changeStatus(post, 1)}>Activar</button><button className="danger-action" type="button" onClick={() => remove(post)}>Eliminar</button></>}</div></div>
      </article>)}</div> : <div className="empty-state compact-empty"><i className="bi bi-inbox" /><h3>Sin resultados</h3><p>No hay servicios que coincidan con estos filtros.</p></div>}
    </div>
    {preview && <PostDetail post={{ ...preview, author: 'Vista previa' }} preview onClose={() => setPreview(null)} />}
  </section>;
}
