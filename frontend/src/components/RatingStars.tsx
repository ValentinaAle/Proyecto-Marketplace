import type { CSSProperties } from 'react';

type Props = { value: number; className?: string };

export function RatingStars({ value, className = '' }: Props) {
  const rating = Math.min(5, Math.max(0, Number.isFinite(value) ? value : 0));
  const stars = Array.from({ length: 5 }, (_, index) => <i className="bi bi-star-fill" key={index} />);
  return <span className={`rating-stars ${className}`.trim()} role="img" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
    <span className="rating-stars-track" aria-hidden="true">{stars}</span>
    <span className="rating-stars-fill" aria-hidden="true" style={{ '--rating-width': `${rating / 5 * 100}%` } as CSSProperties}><span>{stars}</span></span>
  </span>;
}
