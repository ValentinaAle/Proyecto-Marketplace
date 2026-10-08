import { useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { ModalShell } from './ModalShell';

export interface ServiceContact {
  id_contact: number;
  id_post: number;
  contacted_at: string;
  days_since_contact: number | string;
  already_reviewed: number | string;
  post_title: string;
  post_image?: string | null;
  author_name: string;
}

type ReviewsModalProps = {
  token: string;
  contacts: ServiceContact[];
  onClose: () => void;
  onChanged: () => Promise<void>;
  onReviewPublished: () => Promise<void>;
};

const ratingLabels = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

export function ReviewsModal({ token, contacts, onClose, onChanged, onReviewPublished }: ReviewsModalProps) {
  const [confirming, setConfirming] = useState<ServiceContact | null>(null);
  const [reviewing, setReviewing] = useState<ServiceContact | null>(null);
  const [rating, setRating] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConfirming(null);
    setReviewing(null);
    setRating(0);
    setError(null);
  }, [contacts]);

  const sortedContacts = useMemo(() => [...contacts].sort((a, b) => {
    const aReady = Number(a.days_since_contact) >= 3 && !Number(a.already_reviewed);
    const bReady = Number(b.days_since_contact) >= 3 && !Number(b.already_reviewed);
    return Number(bReady) - Number(aReady) || new Date(b.contacted_at).getTime() - new Date(a.contacted_at).getTime();
  }), [contacts]);

  async function discard(contact: ServiceContact) {
    setBusy(true);
    setError(null);
    try {
      await authorizedRequest<unknown>(`/reviews/contact/${contact.id_contact}/discard`, token, { method: 'PUT' });
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos actualizar el servicio.');
    } finally {
      setBusy(false);
    }
  }

  async function publishReview() {
    if (!reviewing || !rating) return;
    setBusy(true);
    setError(null);
    try {
      await authorizedRequest<unknown>('/reviews', token, {
        method: 'POST',
        body: JSON.stringify({ id_contact: reviewing.id_contact, id_post: reviewing.id_post, rating }),
      });
      await Promise.all([onChanged(), onReviewPublished()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No pudimos publicar la calificación.');
    } finally {
      setBusy(false);
    }
  }

  return <ModalShell title="Calificar servicios" subtitle="Contanos cómo fue tu experiencia después de contactar al prestador." onClose={onClose} size="large" className="reviews-modal">
    {error && <div className="review-error" role="alert"><i className="bi bi-exclamation-circle-fill" /> {error}</div>}
    {sortedContacts.length === 0 ? <div className="review-empty"><i className="bi bi-star" /><h3>Todavía no hay servicios para revisar</h3><p>Cuando contactes a un prestador, el servicio aparecerá acá. A los 3 días te preguntaremos si finalmente lo contrataste.</p></div> : <div className="review-list">
      {sortedContacts.map((contact) => {
        const reviewed = Number(contact.already_reviewed) > 0;
        const daysRemaining = Math.max(0, 3 - Number(contact.days_since_contact));
        const ready = daysRemaining === 0 && !reviewed;
        const isConfirming = confirming?.id_contact === contact.id_contact;
        const isReviewing = reviewing?.id_contact === contact.id_contact;

        return <article className={`review-service ${ready ? 'is-ready' : ''}`} key={contact.id_contact}>
          <div className="review-service-image">{contact.post_image ? <img src={contact.post_image} alt="" /> : <i className="bi bi-image" />}</div>
          <div className="review-service-copy"><h3>{contact.post_title}</h3><p>{contact.author_name} · Contactado el {new Date(contact.contacted_at).toLocaleDateString('es-AR')}</p>{reviewed ? <span className="review-status is-complete"><i className="bi bi-check-circle-fill" /> Ya calificaste este servicio</span> : ready ? <span className="review-status is-ready"><i className="bi bi-clock-history" /> Ya podés confirmar la contratación</span> : <span className="review-status"><i className="bi bi-clock" /> Te preguntaremos en {daysRemaining} día{daysRemaining === 1 ? '' : 's'}</span>}</div>
          {!reviewed && <div className="review-service-action">
            {!ready ? <button type="button" disabled><i className="bi bi-lock" /> Aún no disponible</button> : !isConfirming && !isReviewing ? <button className="primary-button" type="button" onClick={() => { setConfirming(contact); setError(null); }}><i className="bi bi-check2-circle" /> Confirmar</button> : null}
          </div>}
          {isConfirming && <div className="review-question">
            <strong>¿Finalmente contrataste este servicio?</strong>
            <p>Solo se puede calificar una experiencia que realmente ocurrió.</p>
            <div><button type="button" className="secondary-button" disabled={busy} onClick={() => discard(contact)}>No, no lo contraté</button><button type="button" className="primary-button" onClick={() => { setConfirming(null); setReviewing(contact); setRating(0); }}>Sí, lo contraté</button></div>
          </div>}
          {isReviewing && <div className="review-rating-panel">
            <div><strong>¿Cómo calificarías el servicio?</strong><span aria-live="polite">{rating ? ratingLabels[rating] : 'Elegí de 1 a 5 estrellas'}</span></div>
            <div className="star-rating" role="radiogroup" aria-label="Calificación">
              {[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" role="radio" aria-checked={rating === value} aria-label={`${value} estrella${value === 1 ? '' : 's'}`} onClick={() => setRating(value)}><i className={`bi ${value <= rating ? 'bi-star-fill' : 'bi-star'}`} /></button>)}
            </div>
            <div className="review-rating-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => { setReviewing(null); setRating(0); }}>Volver</button><button type="button" className="primary-button" disabled={!rating || busy} onClick={publishReview}>{busy ? 'Publicando…' : 'Publicar calificación'}</button></div>
          </div>}
        </article>;
      })}
    </div>}
  </ModalShell>;
}
