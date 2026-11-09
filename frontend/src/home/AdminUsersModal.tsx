import { useCallback, useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { ReasonDialog } from '../components/ReasonDialog';
import type { Post } from './types';

type AdminUser = {
  id_user: number;
  user_name: string;
  email: string;
  avatar_url?: string | null;
  post_count: number;
  role: 'ADMIN' | 'USER';
  is_active: 0 | 1;
  created_at?: string | null;
  disabled_reason?: string | null;
};
type Props = { token: string; currentUserId?: number; onViewUser: (userId: number) => void };
const USERS_PER_PAGE = 5;
const localDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('en-CA') : '';

export function AdminUsersView({ token, currentUserId, onViewUser }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'USER'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [registrationDate, setRegistrationDate] = useState('');
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'activity' | 'history'>('info');
  const [posts, setPosts] = useState<Post[]>([]);
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [disableTarget, setDisableTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => authorizedRequest<AdminUser[]>('/users', token)
    .then((response) => setUsers(response.data))
    .catch((cause: Error) => setError(cause.message))
    .finally(() => setLoading(false)), [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!(event.target as Element).closest('.admin-user-actions')) setActionMenu(null);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  const visible = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('es');
    return users.filter((user) =>
      (!text || `${user.user_name} ${user.email}`.toLocaleLowerCase('es').includes(text)) &&
      (roleFilter === 'all' || user.role === roleFilter) &&
      (statusFilter === 'all' || (statusFilter === 'active' ? user.is_active === 1 : user.is_active === 0)) &&
      (!registrationDate || localDate(user.created_at) === registrationDate));
  }, [users, query, roleFilter, statusFilter, registrationDate]);

  const totalPages = Math.max(1, Math.ceil(visible.length / USERS_PER_PAGE));
  const pagedUsers = visible.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);
  const firstVisible = visible.length ? (page - 1) * USERS_PER_PAGE + 1 : 0;
  const lastVisible = Math.min(page * USERS_PER_PAGE, visible.length);
  const pageItems = useMemo<(number | 'ellipsis')[]>(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1);
    if (page <= 3) return [1, 2, 3, 'ellipsis', totalPages];
    if (page >= totalPages - 2) return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages];
    return [1, 'ellipsis', page, 'ellipsis', totalPages];
  }, [page, totalPages]);

  useEffect(() => { setPage(1); }, [query, roleFilter, statusFilter, registrationDate]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const hasFilters = Boolean(query || roleFilter !== 'all' || statusFilter !== 'all' || registrationDate);
  const clearFilters = () => { setQuery(''); setRoleFilter('all'); setStatusFilter('all'); setRegistrationDate(''); };

  async function openUser(user: AdminUser) {
    setSelected(user);
    setDetailTab('info');
    setPosts([]);
    try {
      const response = await authorizedRequest<Post[]>(`/users/${user.id_user}/posts`, token);
      setPosts(response.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las publicaciones.');
    }
  }

  async function changeStatus(user: AdminUser, active: boolean, statusReason?: string) {
    setBusy(true);
    setError(null);
    try {
      await authorizedRequest(`/users/${user.id_user}/status`, token, { method: 'PUT', body: JSON.stringify({ active, reason: statusReason }) });
      setDisableTarget(null);
      setReason('');
      await load();
      setSelected((current) => current?.id_user === user.id_user ? { ...current, is_active: active ? 1 : 0, disabled_reason: active ? null : statusReason } : current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el estado de la cuenta.');
    } finally { setBusy(false); }
  }

  async function removeUser(user: AdminUser) {
    setBusy(true);
    try {
      await authorizedRequest(`/users/${user.id_user}`, token, { method: 'DELETE' });
      setDeleteTarget(null);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo eliminar la cuenta.');
    } finally { setBusy(false); }
  }

  async function changeRole(user: AdminUser) {
    const nextRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    setBusy(true);
    setError(null);
    try {
      await authorizedRequest(`/users/${user.id_user}/role`, token, { method: 'PUT', body: JSON.stringify({ role: nextRole }) });
      setRoleTarget(null);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cambiar el rol.');
      setRoleTarget(null);
    } finally { setBusy(false); }
  }

  return <>
    <section className="admin-workspace admin-users-view" aria-labelledby="admin-users-title">
      <header className="workspace-heading my-services-heading">
        <div><h1 id="admin-users-title">Administrar Usuarios</h1><p>Revisá la actividad y administrá el acceso de cada cuenta.</p></div>
        {!selected && <div className="admin-users-filters">
          <label className="admin-user-search"><i className="bi bi-search" /><input type="search" aria-label="Buscar usuarios" placeholder="Buscar por nombre o email…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <select aria-label="Tipo de usuario" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}><option value="all">Tipo de usuario</option><option value="USER">Usuario</option><option value="ADMIN">Administrador</option></select>
          <select aria-label="Estado del usuario" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Estado</option><option value="active">Activo</option><option value="inactive">Inactivo</option></select>
          <label className="admin-user-date"><span>Fecha de registro</span><input type="date" aria-label="Fecha de registro" value={registrationDate} onChange={(event) => setRegistrationDate(event.target.value)} /></label>
          <button className="admin-filters-clear" type="button" disabled={!hasFilters} onClick={clearFilters}><i className="bi bi-arrow-counterclockwise" /> Limpiar</button>
        </div>}
      </header>
      <div className="admin-workspace-content">
        {error && <Alert tone="danger">{error}</Alert>}
        {selected ? <section className="admin-user-detail-card">
          <header className="admin-user-detail-top"><strong>Detalle del usuario</strong><button type="button" aria-label="Cerrar detalle" onClick={() => setSelected(null)}><i className="bi bi-x-lg" /></button></header>
          <div className="admin-user-detail-heading"><div className="admin-avatar admin-avatar--large">{selected.avatar_url ? <img src={selected.avatar_url} alt="" /> : selected.user_name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</div><div><h2>{selected.user_name}</h2><p>{selected.email}</p><div className="admin-user-detail-tags"><span className={`admin-user-role ${selected.role === 'ADMIN' ? 'is-admin' : ''}`}>{selected.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</span><span className={`admin-user-status ${selected.is_active ? 'is-active' : 'is-inactive'}`}><i />{selected.is_active ? 'Activo' : 'Inactivo'}</span></div></div></div>
          <nav className="admin-user-detail-tabs" aria-label="Detalle del usuario"><button className={detailTab === 'info' ? 'is-active' : ''} type="button" onClick={() => setDetailTab('info')}><i className="bi bi-info-circle-fill" /> Información</button><button className={detailTab === 'activity' ? 'is-active' : ''} type="button" onClick={() => setDetailTab('activity')}><i className="bi bi-bar-chart-fill" /> Actividad</button><button className={detailTab === 'history' ? 'is-active' : ''} type="button" onClick={() => setDetailTab('history')}><i className="bi bi-clock-history" /> Historial</button></nav>
          <div className="admin-user-detail-content">{detailTab === 'info' ? <><h3>Información de cuenta</h3><dl className="admin-user-facts"><div><dt>Fecha de registro</dt><dd>{selected.created_at ? new Date(selected.created_at).toLocaleDateString('es-AR') : 'Sin fecha'}</dd></div><div><dt>Tipo de cuenta</dt><dd>{selected.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</dd></div><div><dt>Estado</dt><dd><span className={`admin-user-status ${selected.is_active ? 'is-active' : 'is-inactive'}`}><i />{selected.is_active ? 'Activo' : 'Inactivo'}</span></dd></div><div><dt>Publicaciones</dt><dd>{selected.post_count}</dd></div>{!selected.is_active && selected.disabled_reason && <div className="admin-user-disable-reason"><dt>Motivo de deshabilitación</dt><dd>{selected.disabled_reason}</dd></div>}</dl></> : detailTab === 'activity' ? <><div className="admin-user-detail-section-title"><h3>Actividad reciente</h3><span>{posts.length} publicaciones</span></div><div className="admin-user-activity-list">{posts.length ? posts.slice(0, 5).map((post) => <div key={post.id_post}><i className="bi bi-file-earmark-text" /><span><strong>{post.title}</strong><small>{post.created_at ? new Date(post.created_at).toLocaleDateString('es-AR') : post.category}</small></span></div>) : <p className="admin-user-detail-empty">No hay actividad registrada.</p>}</div></> : <><h3>Historial de la cuenta</h3><div className="admin-user-history"><div><i className="bi bi-person-plus" /><span><strong>Cuenta registrada</strong><small>{selected.created_at ? new Date(selected.created_at).toLocaleDateString('es-AR') : 'Fecha no disponible'}</small></span></div>{!selected.is_active && <div><i className="bi bi-person-x" /><span><strong>Cuenta deshabilitada</strong><small>{selected.disabled_reason || 'Sin motivo registrado'}</small></span></div>}</div></>}</div>
          {selected.role !== 'ADMIN' && <footer className="admin-user-detail-actions">{selected.is_active ? <button className="danger-button" type="button" onClick={() => { setReason(''); setDisableTarget(selected); }}><i className="bi bi-person-x" /> Deshabilitar cuenta</button> : <><button className="positive-action" type="button" disabled={busy} onClick={() => void changeStatus(selected, true)}><i className="bi bi-lock-fill" /> Reactivar cuenta</button><button className="danger-button" type="button" onClick={() => setDeleteTarget(selected)}><i className="bi bi-trash3" /> Eliminar cuenta</button></>}</footer>}
        </section> : loading ? <div className="modal-loading">Cargando usuarios…</div> : visible.length ? <div className="admin-users-table-wrap"><div className="admin-users-table" role="table" aria-label="Usuarios registrados">
          <div className="admin-users-table-head" role="row"><span role="columnheader">Usuario</span><span role="columnheader">Tipo</span><span role="columnheader">Registro</span><span role="columnheader">Estado</span><span role="columnheader">Publicaciones</span><span role="columnheader">Acciones</span></div>
          {pagedUsers.map((user) => <div className="admin-user-row" role="row" key={user.id_user}><div className="admin-user-identity" role="cell"><div className="admin-avatar">{user.avatar_url ? <img src={user.avatar_url} alt="" /> : user.user_name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</div><div className="admin-user-copy"><button className="admin-user-name-link" type="button" onClick={() => onViewUser(user.id_user)}>{user.user_name}</button><span>{user.email}</span></div></div><span className={`admin-user-role ${user.role === 'ADMIN' ? 'is-admin' : ''}`} role="cell">{user.role === 'ADMIN' ? 'Administrador' : 'Usuario'}</span><time role="cell">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-AR') : 'Sin fecha'}</time><span role="cell" className={`admin-user-status ${user.is_active ? 'is-active' : 'is-inactive'}`}><i />{user.is_active ? 'Activo' : 'Inactivo'}</span><span className="admin-user-post-count" role="cell">{user.post_count}</span><div className="admin-user-actions" role="cell"><button className="admin-user-actions-toggle" type="button" aria-label={`Acciones para ${user.user_name}`} aria-haspopup="menu" aria-expanded={actionMenu === user.id_user} onClick={() => setActionMenu((current) => current === user.id_user ? null : user.id_user)}><i className="bi bi-three-dots-vertical" /></button>{actionMenu === user.id_user && <div className="admin-user-actions-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setActionMenu(null); onViewUser(user.id_user); }}><i className="bi bi-person" /> Ver usuario</button>{user.id_user !== currentUserId && <button type="button" role="menuitem" onClick={() => { setActionMenu(null); setRoleTarget(user); }}><i className={`bi ${user.role === 'ADMIN' ? 'bi-person-dash' : 'bi-person-gear'}`} /> {user.role === 'ADMIN' ? 'Quitar rol de administrador' : 'Convertir en administrador'}</button>}{user.role !== 'ADMIN' && (user.is_active ? <button className="danger-action" type="button" role="menuitem" onClick={() => { setActionMenu(null); setReason(''); setDisableTarget(user); }}><i className="bi bi-person-x" /> Deshabilitar cuenta</button> : <button type="button" role="menuitem" onClick={() => { setActionMenu(null); void changeStatus(user, true); }}><i className="bi bi-person-check" /> Reactivar cuenta</button>)}</div>}</div></div>)}
          <div className="admin-users-table-footer"><span>Mostrando {firstVisible}–{lastVisible} de {visible.length} usuarios</span><nav aria-label="Páginas de usuarios"><button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><i className="bi bi-chevron-left" /></button>{pageItems.map((item, index) => item === 'ellipsis' ? <span className="admin-page-ellipsis" key={`ellipsis-${index}`}>…</span> : <button type="button" className={item === page ? 'is-active' : ''} aria-current={item === page ? 'page' : undefined} onClick={() => setPage(item)} key={item}>{item}</button>)}<button type="button" aria-label="Página siguiente" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><i className="bi bi-chevron-right" /></button></nav></div>
        </div></div> : <div className="empty-state compact-empty">No hay usuarios que coincidan con los filtros.</div>}
      </div>
    </section>
    {disableTarget && <ReasonDialog title="Deshabilitar cuenta" description={`Explicá por qué ${disableTarget.user_name} no podrá acceder a la plataforma. Este mensaje se le mostrará al iniciar sesión.`} label="Motivo de la deshabilitación" placeholder="Por ejemplo: incumplimiento de las normas de la comunidad…" confirmLabel="Deshabilitar cuenta" value={reason} onChange={setReason} onConfirm={() => void changeStatus(disableTarget, false, reason.trim())} onCancel={() => { if (!busy) { setDisableTarget(null); setReason(''); } }} tone="danger" busy={busy} />}
    {deleteTarget && <ConfirmationDialog title={`¿Eliminar definitivamente a ${deleteTarget.user_name}?`} message="La cuenta ya no podrá recuperarse ni volver a iniciar sesión." confirmLabel="Eliminar cuenta" tone="danger" onCancel={() => setDeleteTarget(null)} onConfirm={() => void removeUser(deleteTarget)} />}
    {roleTarget && <ConfirmationDialog title={roleTarget.role === 'ADMIN' ? `¿Quitar a ${roleTarget.user_name} de administración?` : `¿Convertir a ${roleTarget.user_name} en administrador?`} message={roleTarget.role === 'ADMIN' ? 'Perderá el acceso a usuarios, moderación, soporte y reportes administrativos.' : 'Tendrá acceso a la gestión de usuarios, moderación, soporte y reportes.'} confirmLabel={roleTarget.role === 'ADMIN' ? 'Quitar rol' : 'Asignar rol'} tone={roleTarget.role === 'ADMIN' ? 'danger' : 'default'} onCancel={() => { if (!busy) setRoleTarget(null); }} onConfirm={() => void changeRole(roleTarget)} />}
  </>;
}
