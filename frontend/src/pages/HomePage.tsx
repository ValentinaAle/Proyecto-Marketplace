import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authorizedRequest } from '../api/client';
import { clearSession, getSessionUser, getToken, replaceSession, type AuthData } from '../auth/session';
import { ReasonDialog } from '../components/ReasonDialog';
import { getCategoryMeta } from '../home/categoryMeta';
import { CreatePostModal } from '../home/CreatePostModal';
import { CategoryScrollbar } from '../home/CategoryScrollbar';
import { Chatbot } from '../home/Chatbot';
import { AdminUsersView } from '../home/AdminUsersModal';
import { FloatingActions } from '../home/FloatingActions';
import { MyServicesView } from '../home/MyServicesModal';
import { ModerationView } from '../home/ModerationModal';
import { PostCard } from '../home/PostCard';
import { PostDetail } from '../home/PostDetail';
import { ProfileModal } from '../home/ProfileModal';
import { ReportsView } from '../home/ReportsModal';
import { ReviewsView, type ServiceContact } from '../home/ReviewsModal';
import { Sidebar } from '../home/Sidebar';
import { SupportView } from '../home/SupportModal';
import { TermsModal, TermsView } from '../home/TermsModal';
import type { Category, Post, Profile } from '../home/types';

export function HomePage() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getSessionUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [adminPostAction, setAdminPostAction] = useState<{ kind: 'disable' | 'suggest-edit'; post: Post } | null>(null);
  const [adminActionReason, setAdminActionReason] = useState('');
  const [adminActionBusy, setAdminActionBusy] = useState(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ServiceContact[]>([]);
  const [reviewSuggestionDismissed, setReviewSuggestionDismissed] = useState(false);
  const [activeView, setActiveView] = useState<'publications' | 'services' | 'reviews' | 'support' | 'users' | 'moderation' | 'terms' | 'reports'>('publications');
  const [activeModal, setActiveModal] = useState<'profile' | 'create' | 'terms' | null>(null);
  const [profileRequiredForPost, setProfileRequiredForPost] = useState(false);
  const [logoutArmed, setLogoutArmed] = useState(false);
  const categoryStrip = useRef<HTMLDivElement>(null);
  const postsSection = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const homeMain = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!logoutArmed) return;
    const timer = window.setTimeout(() => setLogoutArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [logoutArmed]);

  const activeSidebarItem = activeModal === 'profile' ? 'Mi perfil'
    : activeModal === 'create' ? 'Crear publicación'
    : activeModal === 'terms' ? 'Términos y Condiciones'
    : activeView === 'users' ? 'Usuarios'
    : activeView === 'moderation' ? 'Administrar Servicios'
        : activeView === 'terms' ? 'Términos y Condiciones'
          : activeView === 'reports' ? 'Reportes'
          : activeView === 'support' ? 'Soporte'
            : activeView === 'reviews' ? 'Calificar servicios'
            : activeView === 'services' ? 'Mis Servicios'
            : 'Publicaciones';

  function requestLogout() {
    if (logoutArmed) logout();
    else setLogoutArmed(true);
  }

  async function openCreatePost() {
    if (!token) return;
    try {
      const response = await authorizedRequest<Profile>('/auth/me', token);
      const profile = response.data;
      if (!profile.name?.trim() || !profile.email?.trim() || !profile.phone?.trim()) {
        setProfileRequiredForPost(true);
        setActiveModal('profile');
        return;
      }
      setProfileRequiredForPost(false);
      setActiveModal('create');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'No pudimos verificar tu perfil.');
    }
  }

  const refreshPosts = useCallback(async () => {
    if (!token) return;
    const [postResponse, categoryResponse] = await Promise.all([
      authorizedRequest<Post[]>('/posts', token),
      authorizedRequest<Category[]>('/posts/categories', token),
    ]);
    setPosts(postResponse.data);
    setCategories(categoryResponse.data);
  }, [token]);

  const refreshContacts = useCallback(async () => {
    if (!token || user?.role === 'ADMIN') return;
    const response = await authorizedRequest<ServiceContact[]>('/reviews/my-contacts', token);
    setContacts(response.data);
  }, [token, user?.role]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      authorizedRequest<Post[]>('/posts', token),
      authorizedRequest<Category[]>('/posts/categories', token),
    ]).then(([postResponse, categoryResponse]) => {
      setPosts(postResponse.data);
      setCategories(categoryResponse.data);
    }).catch((error: unknown) => {
      setMessage(error instanceof Error ? error.message : 'No se pudo cargar el home.');
    }).finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { void refreshContacts().catch(() => undefined); }, [refreshContacts]);

  const pendingReviews = useMemo(() => contacts.filter((contact) => Number(contact.days_since_contact) >= 3 && !Number(contact.already_reviewed)), [contacts]);

  const visiblePosts = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es');
    return posts.filter((post) => (!category || post.category === category) && (!normalized || `${post.title} ${post.description} ${post.author}`.toLocaleLowerCase('es').includes(normalized)));
  }, [posts, query, category]);

  if (!token || !user) return <Navigate to="/login" replace />;

  function logout() {
    clearSession();
    navigate('/login', { replace: true });
  }

  function legacyNotice(label: string) {
    if (label === 'Publicaciones') {
      setActiveModal(null);
      setActiveView('publications');
      homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (label === 'Mi perfil') { setProfileRequiredForPost(false); setActiveModal('profile'); return; }
    if (label === 'Crear publicación') { void openCreatePost(); return; }
    if (label === 'Mis Servicios') { setActiveModal(null); setActiveView('services'); homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (label === 'Calificar servicios') { void refreshContacts().catch(() => undefined); setActiveModal(null); setActiveView('reviews'); setReviewSuggestionDismissed(true); homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (label === 'Soporte' || label === 'Consultas') { setActiveModal(null); setActiveView('support'); homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (label === 'Usuarios') { setActiveModal(null); setActiveView('users'); homeMain.current?.scrollTo({ top: 0 }); return; }
    if (label === 'Administrar Servicios') { setActiveModal(null); setActiveView('moderation'); homeMain.current?.scrollTo({ top: 0 }); return; }
    if (label === 'Términos y Condiciones') {
      if (user?.role === 'ADMIN') { setActiveModal(null); setActiveView('terms'); homeMain.current?.scrollTo({ top: 0 }); }
      else setActiveModal('terms');
      return;
    }
    if (label === 'Reportes') { setActiveModal(null); setActiveView('reports'); homeMain.current?.scrollTo({ top: 0 }); return; }
    setMessage(`${label} se migra en la próxima etapa. Mientras tanto sigue disponible en el home actual.`);
  }

  async function handleCreated() {
    await refreshPosts();
  }

  async function handleProfileSaved(session: AuthData) {
    replaceSession(session);
    await refreshPosts();
    if (profileRequiredForPost) {
      setProfileRequiredForPost(false);
      setActiveModal('create');
    }
  }

  function openAdminPostAction(kind: 'disable' | 'suggest-edit', post: Post) {
    setAdminPostAction({ kind, post });
    setAdminActionReason('');
    setAdminActionError(null);
  }

  function closeAdminPostAction() {
    if (adminActionBusy) return;
    setAdminPostAction(null);
    setAdminActionReason('');
    setAdminActionError(null);
  }

  async function confirmAdminPostAction() {
    if (!adminPostAction || !adminActionReason.trim()) return;
    setAdminActionBusy(true);
    setAdminActionError(null);
    try {
      const endpoint = adminPostAction.kind === 'disable' ? `/posts/${adminPostAction.post.id_post}/availability` : `/posts/${adminPostAction.post.id_post}/revision-request`;
      const body = adminPostAction.kind === 'disable' ? { active: false, reason: adminActionReason.trim() } : { reason: adminActionReason.trim() };
      await authorizedRequest(endpoint, token!, { method: 'PUT', body: JSON.stringify(body) });
      await refreshPosts();
      setAdminPostAction(null);
      setAdminActionReason('');
    } catch (reason) {
      setAdminActionError(reason instanceof Error ? reason.message : adminPostAction.kind === 'disable' ? 'No se pudo deshabilitar la publicación.' : 'No se pudo solicitar la edición.');
    } finally { setAdminActionBusy(false); }
  }

  function filterFromDetail(selectedCategory: string) {
    setSelectedPost(null);
    setActiveModal(null);
    setActiveView('publications');
    setQuery('');
    setCategory(selectedCategory);
    window.requestAnimationFrame(() => homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  return (
    <div className="home-frame">
      <Sidebar user={user} activeItem={activeSidebarItem} reviewCount={pendingReviews.length} onLegacyAction={legacyNotice} />
      <main className="home-main" ref={homeMain}>
        <div className="home-content">
          {pendingReviews.length > 0 && !reviewSuggestionDismissed && activeView === 'publications' && <aside className="review-suggestion" aria-label="Servicio pendiente de confirmación"><i className="bi bi-star-fill" /><div><strong>¿Finalmente contrataste {pendingReviews.length === 1 ? `“${pendingReviews[0].post_title}”` : 'alguno de estos servicios'}?</strong><span>Confirmalo para poder calificar tu experiencia.</span></div><button className="primary-button" type="button" onClick={() => { setActiveView('reviews'); setReviewSuggestionDismissed(true); homeMain.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Revisar ahora</button><button className="review-suggestion-close" type="button" aria-label="Cerrar sugerencia" onClick={() => setReviewSuggestionDismissed(true)}><i className="bi bi-x-lg" /></button></aside>}
          {activeView === 'publications' ? <>
          <section className="home-hero">
            <h1>¿Qué servicio necesitás?</h1>
            <p>Encontrá profesionales de confianza en un solo lugar.</p>
            <label className="home-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input ref={searchInput} type="search" aria-label="Buscar servicios" placeholder="Plomero, programador, profesor particular…" value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><i className="bi bi-x-lg" /></button>}
            </label>
          </section>

          <section className="category-section" aria-label="Filtros por categoría">
            <CategoryScrollbar scrollerRef={categoryStrip} itemCount={categories.length} />
            {category && <div className="category-selection"><button type="button" onClick={() => setCategory(null)}>Ver todas</button></div>}
            <div className="category-strip" id="category-strip" ref={categoryStrip}>
              {categories.map((item) => {
                const meta = getCategoryMeta(item.name);
                const active = category === item.name;
                return <button key={item.id_category} className={active ? 'category-card is-active' : 'category-card'} type="button" aria-pressed={active} onClick={() => setCategory(active ? null : item.name)}><span className="category-card-heading"><i className={`bi ${meta.icon}`} /><strong>{item.name}</strong></span><span className="category-card-description">{meta.description}</span></button>;
              })}
            </div>
          </section>

          <section className="posts-section" ref={postsSection} aria-label="Publicaciones">
            {message && <div className="home-message" role="status">{message}<button type="button" aria-label="Cerrar mensaje" onClick={() => setMessage(null)}><i className="bi bi-x" /></button></div>}
            {loading ? <div className="post-grid">{Array.from({ length: 8 }, (_, index) => <div className="post-skeleton" key={index} />)}</div> : visiblePosts.length ? <div className="post-grid">{visiblePosts.map((post, index) => <PostCard key={post.id_post} post={post} revealOrder={index % 4} onOpen={setSelectedPost} adminActions={user.role === 'ADMIN' ? { onSuggestEdit: (selected) => openAdminPostAction('suggest-edit', selected), onDisable: (selected) => openAdminPostAction('disable', selected) } : undefined} />)}</div> : <div className="empty-state"><i className="bi bi-search" /><h3>No encontramos publicaciones</h3><p>Probá con otra búsqueda o eliminá el filtro seleccionado.</p></div>}
          </section>
          </> : activeView === 'services' ? <MyServicesView token={token} categories={categories} onChanged={refreshPosts} /> : activeView === 'reviews' ? <ReviewsView token={token} contacts={contacts} onChanged={refreshContacts} onReviewPublished={refreshPosts} /> : activeView === 'support' ? <SupportView token={token} user={user} /> : activeView === 'users' ? <AdminUsersView token={token} /> : activeView === 'moderation' ? <ModerationView token={token} onChanged={refreshPosts} /> : activeView === 'reports' ? <ReportsView token={token} posts={posts} /> : <TermsView token={token} user={user} />}
        </div>
      </main>
      <div className="mobile-floating-dock" role="navigation" aria-label="Acciones rápidas">
        <FloatingActions isAdmin={user.role === 'ADMIN'} activeAction={activeSidebarItem} onAction={legacyNotice} onLogout={user.role === 'ADMIN' ? requestLogout : undefined} logoutArmed={logoutArmed} />
        {user.role !== 'ADMIN' && <Chatbot searchRef={searchInput} onAction={legacyNotice} onLogout={requestLogout} logoutArmed={logoutArmed} />}
      </div>
      {selectedPost && <PostDetail post={selectedPost} token={token} canContact={user.role !== 'ADMIN'} onContactRegistered={() => { void refreshContacts().catch(() => undefined); }} onCategorySelect={filterFromDetail} onClose={() => setSelectedPost(null)} />}
      {activeModal === 'profile' && <ProfileModal token={token} notice={profileRequiredForPost ? 'Completá tu nombre, email y teléfono antes de crear una publicación.' : undefined} onClose={() => { setActiveModal(null); setProfileRequiredForPost(false); }} onSaved={handleProfileSaved} />}
      {activeModal === 'create' && <CreatePostModal token={token} categories={categories} onClose={() => setActiveModal(null)} onCreated={handleCreated} />}
      {activeModal === 'terms' && <TermsModal token={token} onClose={() => setActiveModal(null)} />}
      {adminPostAction && <ReasonDialog title={adminPostAction.kind === 'disable' ? 'Deshabilitar publicación' : 'Sugerir una edición'} description={adminPostAction.kind === 'disable' ? `Indicá por qué “${adminPostAction.post.title}” dejará de estar publicada.` : `Explicá qué debería corregir el usuario en “${adminPostAction.post.title}”.`} label={adminPostAction.kind === 'disable' ? 'Motivo de la deshabilitación' : 'Edición solicitada'} placeholder={adminPostAction.kind === 'disable' ? 'Por ejemplo: la información de contacto ya no es válida…' : 'Por ejemplo: corregir el título y ampliar la descripción…'} confirmLabel={adminPostAction.kind === 'disable' ? 'Deshabilitar' : 'Enviar sugerencia'} value={adminActionReason} onChange={setAdminActionReason} onConfirm={() => void confirmAdminPostAction()} onCancel={closeAdminPostAction} tone={adminPostAction.kind === 'disable' ? 'danger' : 'default'} busy={adminActionBusy} error={adminActionError} />}
    </div>
  );
}
