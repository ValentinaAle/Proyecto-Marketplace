import { useCallback, useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import type { Post } from './types';

type AdminUser = { id_user: number; user_name: string; email: string; avatar_url?: string | null; post_count: number };
type Props = { token: string };

export function AdminUsersView({ token }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]); const [query, setQuery] = useState('');
  const [postFilter, setPostFilter] = useState<'all' | 'with' | 'without'>('all'); const [sort, setSort] = useState<'posts' | 'name'>('posts');
  const [selected, setSelected] = useState<AdminUser | null>(null); const [posts, setPosts] = useState<Post[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null); const [name, setName] = useState('');
  const [userToDisable, setUserToDisable] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => authorizedRequest<AdminUser[]>('/users', token).then((response) => setUsers(response.data)).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)), [token]);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => users
    .filter((user) => `${user.user_name} ${user.email}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
    .filter((user) => postFilter === 'all' || (postFilter === 'with' ? Number(user.post_count) > 0 : Number(user.post_count) === 0))
    .sort((left, right) => sort === 'name' ? left.user_name.localeCompare(right.user_name, 'es') : Number(right.post_count) - Number(left.post_count)), [users, query, postFilter, sort]);

  async function viewPosts(user: AdminUser) { setSelected(user); setPosts([]); try { const response = await authorizedRequest<Post[]>(`/users/${user.id_user}/posts`, token); setPosts(response.data); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las publicaciones.'); } }
  async function saveName() { if (!editing || !name.trim()) return; try { await authorizedRequest<unknown>(`/users/${editing.id_user}`, token, { method: 'PUT', body: JSON.stringify({ name: name.trim() }) }); setEditing(null); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo editar el usuario.'); } }
  async function disable(user: AdminUser) { try { await authorizedRequest<unknown>(`/users/${user.id_user}`, token, { method: 'DELETE' }); setUserToDisable(null); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo deshabilitar el usuario.'); } }

  return <><section className="admin-workspace" aria-labelledby="admin-users-title"><header className="workspace-heading my-services-heading"><div><h1 id="admin-users-title">Usuarios</h1><p>Buscá, revisá y administrá las cuentas de la comunidad.</p></div><div className="admin-users-toolbar"><label className="admin-search admin-search--heading"><i className="bi bi-search" /><input type="search" placeholder="Buscar por nombre o email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label><select aria-label="Filtrar por publicaciones" value={postFilter} onChange={(event) => setPostFilter(event.target.value as typeof postFilter)}><option value="all">Todos</option><option value="with">Con publicaciones</option><option value="without">Sin publicaciones</option></select><select aria-label="Ordenar usuarios" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="posts">Más publicaciones</option><option value="name">Nombre A–Z</option></select></div></header><div className="admin-workspace-content">
    {error && <Alert tone="danger">{error}</Alert>}
    {selected ? <div className="admin-subview"><button className="back-link" type="button" onClick={() => setSelected(null)}><i className="bi bi-arrow-left" /> Volver a usuarios</button><h3>Publicaciones de {selected.user_name}</h3><div className="admin-post-list">{posts.length ? posts.map((post) => <article key={post.id_post}><div className="admin-post-thumb">{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div><div><span>{post.category}</span><strong>{post.title}</strong><p>{post.description}</p></div></article>) : <div className="empty-state compact-empty">Sin publicaciones.</div>}</div></div> : loading ? <div className="modal-loading">Cargando usuarios…</div> : <div className="admin-user-list">{visible.map((user) => <article className="admin-user-row" key={user.id_user}><div className="admin-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.user_name.split(' ').map((word) => word[0]).join('').slice(0,2).toUpperCase()}</div><div className="admin-user-copy"><strong>{user.user_name}</strong><span>{user.email} · {user.post_count} publicaciones</span></div><div className="admin-row-actions"><button type="button" title="Ver publicaciones" onClick={() => viewPosts(user)}><i className="bi bi-eye-fill" /></button><button type="button" title="Editar usuario" onClick={() => { setEditing(user); setName(user.user_name); }}><i className="bi bi-pencil-fill" /></button><button className="danger-action" type="button" title="Deshabilitar usuario" onClick={() => setUserToDisable(user)}><i className="bi bi-person-x-fill" /></button></div></article>)}</div>}
    {editing && <div className="inline-editor"><label>Nombre del usuario<input value={name} onChange={(event) => setName(event.target.value)} /></label><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancelar</button><button className="primary-button modal-primary" type="button" onClick={saveName}>Guardar</button></div>}
  </div></section>
    {userToDisable && <ConfirmationDialog title={`¿Deshabilitar a ${userToDisable.user_name}?`} message="También se desactivarán todas sus publicaciones." confirmLabel="Deshabilitar usuario" tone="danger" onCancel={() => setUserToDisable(null)} onConfirm={() => void disable(userToDisable)} />}
  </>;
}
