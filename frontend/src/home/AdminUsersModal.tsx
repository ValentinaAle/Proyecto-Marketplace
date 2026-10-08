import { useCallback, useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ModalShell } from './ModalShell';
import type { Post } from './types';

type AdminUser = { id_user: number; user_name: string; email: string; avatar_url?: string | null; post_count: number };
type Props = { token: string; onClose: () => void };

export function AdminUsersModal({ token, onClose }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]); const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null); const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null); const [name, setName] = useState('');
  const [userToDisable, setUserToDisable] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => authorizedRequest<AdminUser[]>('/users', token).then((response) => setUsers(response.data)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)), [token]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => users.filter((user) => `${user.user_name} ${user.email}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'))), [users, query]);

  async function viewPosts(user: AdminUser) { setSelected(user); setPosts([]); try { const response = await authorizedRequest<Post[]>(`/users/${user.id_user}/posts`, token); setPosts(response.data); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las publicaciones.'); } }
  async function saveName() { if (!editing || !name.trim()) return; try { await authorizedRequest<unknown>(`/users/${editing.id_user}`, token, { method: 'PUT', body: JSON.stringify({ name: name.trim() }) }); setEditing(null); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo editar el usuario.'); } }
  async function disable(user: AdminUser) { try { await authorizedRequest<unknown>(`/users/${user.id_user}`, token, { method: 'DELETE' }); setUserToDisable(null); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo deshabilitar el usuario.'); } }

  return <><ModalShell title="Usuarios" subtitle="Administrá usuarios con publicaciones activas." onClose={onClose} size="large">
    {error && <Alert tone="danger">{error}</Alert>}
    {selected ? <div className="admin-subview"><button className="back-link" type="button" onClick={() => setSelected(null)}><i className="bi bi-arrow-left" /> Volver a usuarios</button><h3>Publicaciones de {selected.user_name}</h3><div className="admin-post-list">{posts.length ? posts.map((post) => <article key={post.id_post}><div className="admin-post-thumb">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div><div><span>{post.category}</span><strong>{post.title}</strong><p>{post.description}</p></div></article>) : <div className="empty-state compact-empty">Sin publicaciones.</div>}</div></div> : <><label className="admin-search"><i className="bi bi-search" /><input type="search" placeholder="Buscar por nombre o email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>{loading ? <div className="modal-loading">Cargando usuarios…</div> : <div className="admin-user-list">{visible.map((user) => <article className="admin-user-row" key={user.id_user}><div className="admin-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.user_name.split(' ').map((word) => word[0]).join('').slice(0,2).toUpperCase()}</div><div className="admin-user-copy"><strong>{user.user_name}</strong><span>{user.email} · {user.post_count} publicaciones</span></div><div className="admin-row-actions"><button type="button" title="Ver publicaciones" onClick={() => viewPosts(user)}><i className="bi bi-eye-fill" /></button><button type="button" title="Editar usuario" onClick={() => { setEditing(user); setName(user.user_name); }}><i className="bi bi-pencil-fill" /></button><button className="danger-action" type="button" title="Deshabilitar usuario" onClick={() => setUserToDisable(user)}><i className="bi bi-person-x-fill" /></button></div></article>)}</div>}</>}
    {editing && <div className="inline-editor"><label>Nombre del usuario<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button modal-primary" type="button" onClick={saveName}>Guardar</button></div>}
  </ModalShell>{userToDisable && <ConfirmationDialog title={`¿Deshabilitar a ${userToDisable.user_name}?`} message="También se desactivarán todas sus publicaciones." confirmLabel="Deshabilitar usuario" tone="danger" onCancel={() => setUserToDisable(null)} onConfirm={() => void disable(userToDisable)} />}</>;
}
