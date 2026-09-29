import { useCallback, useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';
import type { Post } from './types';

type StatusKey = 'pending' | 'approved' | 'rejected' | 'inactive';
const tabs: Array<{ key: StatusKey; label: string; statuses: number[] }> = [
  { key: 'pending', label: 'Pendientes', statuses: [2] }, { key: 'approved', label: 'Publicadas', statuses: [1] }, { key: 'rejected', label: 'Rechazadas', statuses: [3] }, { key: 'inactive', label: 'Inactivas', statuses: [0] },
];

type Props = { token: string; onClose: () => void; onChanged: () => Promise<void> };

export function MyServicesModal({ token, onClose, onChanged }: Props) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<StatusKey>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => authorizedRequest<Post[]>('/posts/my', token).then((response) => setPosts(response.data)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)), [token]);
  useEffect(() => { void load(); }, [load]);
  const currentTab = tabs.find((item) => item.key === tab)!;
  const visible = useMemo(() => posts.filter((post) => currentTab.statuses.includes(Number(post.is_active))), [posts, currentTab]);

  async function changeStatus(post: Post, status: 0 | 1) {
    setError(null);
    try { await authorizedRequest<unknown>(`/posts/my/${post.id_post}/status`, token, { method: 'PUT', body: JSON.stringify({ status }) }); await load(); await onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo actualizar la publicación.'); }
  }
  async function remove(post: Post) {
    if (!window.confirm('¿Eliminar esta publicación inactiva?')) return;
    try { await authorizedRequest<unknown>(`/posts/my/${post.id_post}`, token, { method: 'DELETE' }); await load(); await onChanged(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo eliminar la publicación.'); }
  }

  return <ModalShell title="Mis Servicios" subtitle="Revisá el estado y administrá tus publicaciones." onClose={onClose} size="large">
    {error && <Alert tone="danger">{error}</Alert>}
    <div className="service-tabs" role="tablist">{tabs.map((item) => <button key={item.key} className={tab === item.key ? 'is-active' : ''} type="button" role="tab" aria-selected={tab === item.key} onClick={() => setTab(item.key)}>{item.label}<span>{posts.filter((post) => item.statuses.includes(Number(post.is_active))).length}</span></button>)}</div>
    {loading ? <div className="modal-loading">Cargando publicaciones…</div> : visible.length ? <div className="my-services-list">{visible.map((post) => <article className="my-service" key={post.id_post}><div className="my-service-image">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div><div className="my-service-copy"><span>{post.category}</span><h3>{post.title}</h3>{tab === 'rejected' && post.rejection_reason && <p className="rejection-reason"><i className="bi bi-info-circle-fill" /> {post.rejection_reason}</p>}</div><div className="my-service-actions">{tab === 'approved' && <button type="button" onClick={() => changeStatus(post, 0)}>Desactivar</button>}{tab === 'inactive' && <><button className="positive-action" type="button" onClick={() => changeStatus(post, 1)}>Activar</button><button className="danger-action" type="button" onClick={() => remove(post)}>Eliminar</button></>}</div></article>)}</div> : <div className="empty-state compact-empty"><i className="bi bi-inbox" /><h3>Sin publicaciones</h3><p>No tenés servicios en este estado.</p></div>}
  </ModalShell>;
}
