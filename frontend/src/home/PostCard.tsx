import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Post } from './types';

type PostCardProps = { post: Post; onOpen: (post: Post) => void; revealOrder?: number; adminActions?: { onSuggestEdit: (post: Post) => void; onDisable: (post: Post) => void } };

export function PostCard({ post, onOpen, revealOrder = 0, adminActions }: PostCardProps) {
  const rating = Number(post.avg_rating || 0);
  const cardRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || revealed) return;

    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setRevealed(true);
      observer.disconnect();
    }, { threshold: 0.12, rootMargin: '0px 0px -24px' });

    observer.observe(card);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <article
      ref={cardRef}
      className={`post-card post-card--reveal${revealed ? ' is-revealed' : ''}`}
      style={{ '--reveal-order': Math.min(revealOrder, 3) } as CSSProperties}
      tabIndex={0}
      role="button"
      onClick={() => onOpen(post)}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(post); }}
    >
      <div className="post-image">
        {post.image_url ? <img src={post.image_url} alt="" /> : <i className="bi bi-image" aria-hidden="true" />}
      </div>
      <div className="post-body">
        <span className="post-category">{post.category}</span>
        <h3>{post.title}</h3>
        <div className="post-meta">
          <span>{post.author}</span>
          {rating > 0 && Number(post.total_reviews) > 0 && <span className="post-rating"><i className="bi bi-star-fill" /> {rating.toFixed(1)} <small>({post.total_reviews})</small></span>}
        </div>
        <span className="post-card-cta">Ver detalle <i className="bi bi-arrow-right" aria-hidden="true" /></span>
        {adminActions && <div className="admin-post-actions"><button type="button" onClick={(event) => { event.stopPropagation(); adminActions.onSuggestEdit(post); }}><i className="bi bi-pencil-square" /> Sugerir edición</button><button className="danger-action" type="button" onClick={(event) => { event.stopPropagation(); adminActions.onDisable(post); }}><i className="bi bi-eye-slash" /> Deshabilitar</button></div>}
      </div>
    </article>
  );
}
