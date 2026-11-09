import { useEffect, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import type { Post } from './types';

type UserProfile = {
  id_user: number;
  user_name: string;
  avatar_url?: string | null;
  posts: Post[];
};

type Props = { userId: number; token: string; isAdmin: boolean; onClose: () => void };

export function UserProfileModal({ userId, token, isAdmin, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setProfile(null);
    setError(null);
    authorizedRequest<UserProfile>(`/users/${userId}/profile`, token)
      .then((response) => setProfile(response.data))
      .catch((cause: Error) => setError(cause.message));
  }, [token, userId]);

  return <div className="modal-backdrop user-profile-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="user-profile-modal" role="dialog" aria-modal="true" aria-labelledby="user-profile-title">
      <button className="modal-close user-profile-close" type="button" aria-label="Cerrar perfil" onClick={onClose}><i className="bi bi-x-lg" /></button>
      {error ? <div className="user-profile-state"><Alert tone="danger">{error}</Alert></div> : !profile ? <div className="modal-loading">Cargando usuario…</div> : <>
        <header className="user-profile-header">
          <div className="user-profile-avatar">{profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : profile.user_name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div><span>Prestador en FIVOX</span><h2 id="user-profile-title">{profile.user_name}</h2><p>{profile.posts.length} {profile.posts.length === 1 ? 'servicio publicado' : 'servicios publicados'}</p></div>
        </header>
        <div className="user-profile-content">
          <div className="user-profile-section-heading"><div><span>Servicios</span><h3>Publicaciones de {profile.user_name}</h3></div><i className="bi bi-grid" aria-hidden="true" /></div>
          {profile.posts.length ? <div className="user-profile-posts">{profile.posts.map((post) => <article key={post.id_post} className="user-profile-post"><div>{post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" />}</div><span>{post.category}</span><h4>{post.title}</h4>{isAdmin && Number(post.is_active) !== 1 && <small>No publicada</small>}</article>)}</div> : <div className="user-profile-empty"><i className="bi bi-inbox" /><strong>Sin publicaciones</strong><p>Este usuario todavía no tiene servicios cargados.</p></div>}
        </div>
      </>}
    </section>
  </div>;
}
