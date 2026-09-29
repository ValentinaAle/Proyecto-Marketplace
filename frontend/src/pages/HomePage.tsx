import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { authorizedRequest } from '../api/client';
import { clearSession, getSessionUser, getToken, replaceSession, type AuthData } from '../auth/session';
import { getCategoryMeta } from '../home/categoryMeta';
import { CreatePostModal } from '../home/CreatePostModal';
import { FloatingActions } from '../home/FloatingActions';
import { MyServicesModal } from '../home/MyServicesModal';
import { PostCard } from '../home/PostCard';
import { PostDetail } from '../home/PostDetail';
import { ProfileModal } from '../home/ProfileModal';
import { Sidebar } from '../home/Sidebar';
import type { Category, Post } from '../home/types';

export function HomePage() {
  const navigate = useNavigate();
  const token = getToken();
  const user = getSessionUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'profile' | 'create' | 'services' | null>(null);
  const categoryStrip = useRef<HTMLDivElement>(null);

  const refreshPosts = useCallback(async () => {
    if (!token) return;
    const response = await authorizedRequest<Post[]>('/posts', token);
    setPosts(response.data);
  }, [token]);

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
    if (label === 'Mi perfil') { setActiveModal('profile'); return; }
    if (label === 'Crear publicación') { setActiveModal('create'); return; }
    if (label === 'Mis Servicios') { setActiveModal('services'); return; }
    setMessage(`${label} se migra en la próxima etapa. Mientras tanto sigue disponible en el home actual.`);
  }

  async function handleCreated() {
    await refreshPosts();
    setMessage('Publicación creada. Quedó pendiente de aprobación.');
  }

  async function handleProfileSaved(session: AuthData) {
    replaceSession(session);
    await refreshPosts();
  }

  return (
    <div className="home-frame">
      <Sidebar user={user} onLegacyAction={legacyNotice} onLogout={logout} />
      <main className="home-main">
        <FloatingActions isAdmin={user.role === 'ADMIN'} onAction={legacyNotice} />
        <div className="home-content">
          <section className="home-hero">
            <span className="hero-eyebrow">Servicios cerca tuyo</span>
            <h1>¿Qué servicio necesitás?</h1>
            <p>Encontrá profesionales de confianza en un solo lugar.</p>
            <label className="home-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input type="search" aria-label="Buscar servicios" placeholder="Plomero, programador, profesor particular…" value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setQuery('')}><i className="bi bi-x-lg" /></button>}
            </label>
          </section>

          <section className="category-section" aria-labelledby="category-title">
            <div className="section-heading"><div><span>Explorá</span><h2 id="category-title">Categorías</h2></div><div className="category-controls">{category && <button className="clear-category" type="button" onClick={() => setCategory(null)}>Ver todas</button>}<button type="button" aria-label="Ver categorías anteriores" onClick={() => categoryStrip.current?.scrollBy({ left: -464, behavior: 'smooth' })}><i className="bi bi-arrow-left" /></button><button type="button" aria-label="Ver más categorías" onClick={() => categoryStrip.current?.scrollBy({ left: 464, behavior: 'smooth' })}><i className="bi bi-arrow-right" /></button></div></div>
            <div className="category-strip" ref={categoryStrip}>
              {categories.map((item) => {
                const meta = getCategoryMeta(item.name);
                const active = category === item.name;
                return <button key={item.id_category} className={active ? 'category-card is-active' : 'category-card'} type="button" aria-pressed={active} onClick={() => setCategory(active ? null : item.name)}><i className={`bi ${meta.icon}`} /><strong>{item.name}</strong><span>{meta.description}</span></button>;
              })}
            </div>
          </section>

          <section className="posts-section" aria-labelledby="posts-title">
            <div className="section-heading"><div><span>{visiblePosts.length} disponibles</span><h2 id="posts-title">Publicaciones</h2></div></div>
            {message && <div className="home-message" role="status">{message}<button type="button" aria-label="Cerrar mensaje" onClick={() => setMessage(null)}><i className="bi bi-x" /></button></div>}
            {loading ? <div className="post-grid">{Array.from({ length: 8 }, (_, index) => <div className="post-skeleton" key={index} />)}</div> : visiblePosts.length ? <div className="post-grid">{visiblePosts.map((post) => <PostCard key={post.id_post} post={post} onOpen={setSelectedPost} />)}</div> : <div className="empty-state"><i className="bi bi-search" /><h3>No encontramos publicaciones</h3><p>Probá con otra búsqueda o eliminá el filtro seleccionado.</p></div>}
          </section>
        </div>
      </main>
      {selectedPost && <PostDetail post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {activeModal === 'profile' && <ProfileModal token={token} onClose={() => setActiveModal(null)} onSaved={handleProfileSaved} />}
      {activeModal === 'create' && <CreatePostModal token={token} categories={categories} onClose={() => setActiveModal(null)} onCreated={handleCreated} />}
      {activeModal === 'services' && <MyServicesModal token={token} onClose={() => setActiveModal(null)} onChanged={refreshPosts} />}
    </div>
  );
}
