import { useEffect } from 'react';
import type { Post } from './types';

type PostDetailProps = { post: Post; onClose: () => void };

export function PostDetail({ post, onClose }: PostDetailProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="post-detail" role="dialog" aria-modal="true" aria-labelledby="post-detail-title">
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={onClose}><i className="bi bi-x-lg" /></button>
        {post.image_url && <img className="detail-image" src={post.image_url} alt="" />}
        <div className="detail-body">
          <span className="post-category">{post.category}</span>
          <h2 id="post-detail-title">{post.title}</h2>
          <p className="detail-author">Publicado por {post.author}</p>
          <p className="detail-description">{post.description}</p>
          {(post.author_phone || post.author_email) && <div className="detail-contact">{post.author_phone && <span><i className="bi bi-telephone-fill" /> {post.author_phone}</span>}{post.author_email && <span><i className="bi bi-envelope-fill" /> {post.author_email}</span>}</div>}
        </div>
      </section>
    </div>
  );
}
