import type { Post } from './types';

type PostCardProps = { post: Post; onOpen: (post: Post) => void };

export function PostCard({ post, onOpen }: PostCardProps) {
  const rating = Number(post.avg_rating || 0);
  return (
    <article className="post-card" tabIndex={0} role="button" onClick={() => onOpen(post)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(post); }}>
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
      </div>
    </article>
  );
}
