import { useEffect } from 'react';
import { authorizedRequest } from '../api/client';
import type { Post } from './types';

type PostDetailProps = { post: Post; token?: string; preview?: boolean; canContact?: boolean; onContactRegistered?: () => void; onCategorySelect?: (category: string) => void; onClose: () => void };

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10) return `549${digits}`;
  return digits;
}

export function PostDetail({ post, token, preview = false, canContact = false, onContactRegistered, onCategorySelect, onClose }: PostDetailProps) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const rating = Number(post.avg_rating || 0);
  const whatsapp = post.author_phone ? `https://wa.me/${whatsappNumber(post.author_phone)}?text=${encodeURIComponent(`Hola ${post.author}, vi tu publicación “${post.title}” en FIVOX y quisiera hacerte una consulta.`)}` : null;

  function registerContact() {
    if (!token || preview) return;
    void authorizedRequest<unknown>('/reviews/contact', token, { method: 'POST', body: JSON.stringify({ id_post: post.id_post }) }).then(() => onContactRegistered?.()).catch(() => undefined);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={post.image_url ? 'post-detail has-image' : 'post-detail'} role="dialog" aria-modal="true" aria-labelledby="post-detail-title">
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={onClose}><i className="bi bi-x-lg" /></button>
        {post.image_url && <img className="detail-image" src={post.image_url} alt="" />}
        <div className="detail-body">
          <div className="detail-author-row">{post.author_avatar ? <img src={post.author_avatar} alt="" /> : <span><i className="bi bi-person-fill" /></span>}<div><small>{preview ? 'Así se verá la publicación' : 'Publicado por'}</small><strong>{preview ? 'Vista previa' : post.author}</strong></div>{onCategorySelect ? <button className="detail-category" type="button" onClick={() => onCategorySelect(post.category)}><i className="bi bi-tag-fill" /> {post.category}</button> : <span className="detail-category">{post.category}</span>}</div>
          <div className="detail-title-row"><h2 id="post-detail-title">{post.title}</h2></div>
          {rating > 0 && Number(post.total_reviews) > 0 && <div className="detail-rating"><i className="bi bi-star-fill" /> <strong>{rating.toFixed(1)}</strong><span>{post.total_reviews} reseña{Number(post.total_reviews) === 1 ? '' : 's'}</span></div>}
          <p className="detail-description">{post.description}</p>
          {!preview && !canContact && (post.author_phone || post.author_email) && <div className="detail-contact">{post.author_phone && <span><i className="bi bi-telephone-fill" /> {post.author_phone}</span>}{post.author_email && <span><i className="bi bi-envelope-fill" /> {post.author_email}</span>}</div>}
          {!preview && canContact && (whatsapp || post.author_email) && <div className="detail-actions">{whatsapp && <a className="contact-whatsapp" href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={registerContact}><i className="bi bi-whatsapp" /> Contactar por WhatsApp</a>}{post.author_email && <a className="contact-email" href={`mailto:${post.author_email}?subject=${encodeURIComponent(`Consulta por ${post.title}`)}`} onClick={registerContact}><i className="bi bi-envelope" /> Enviar email</a>}</div>}
        </div>
      </section>
    </div>
  );
}
