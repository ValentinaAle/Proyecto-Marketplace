import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from 'react';

type Props = {
  scrollerRef: RefObject<HTMLDivElement | null>;
  itemCount: number;
};

type Metrics = { left: number; width: number; maxScroll: number };

export function CategoryScrollbar({ scrollerRef, itemCount }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef(0);
  const [metrics, setMetrics] = useState<Metrics>({ left: 0, width: 0, maxScroll: 0 });

  const update = useCallback(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const trackWidth = track.clientWidth;
    const width = maxScroll ? Math.max(48, trackWidth * (scroller.clientWidth / scroller.scrollWidth)) : trackWidth;
    const travel = Math.max(0, trackWidth - width);
    const left = maxScroll ? (scroller.scrollLeft / maxScroll) * travel : 0;
    setMetrics({ left, width, maxScroll });
  }, [scrollerRef]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    observer.observe(track);
    scroller.addEventListener('scroll', update, { passive: true });
    const frame = window.requestAnimationFrame(update);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      scroller.removeEventListener('scroll', update);
    };
  }, [itemCount, scrollerRef, update]);

  function move(clientX: number) {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track || !metrics.maxScroll) return;
    const rect = track.getBoundingClientRect();
    const travel = rect.width - metrics.width;
    const nextLeft = Math.min(travel, Math.max(0, clientX - rect.left - dragOffset.current));
    scroller.scrollLeft = (nextLeft / travel) * metrics.maxScroll;
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!metrics.maxScroll) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const clickedThumb = pointerX >= metrics.left && pointerX <= metrics.left + metrics.width;
    dragOffset.current = clickedThumb ? pointerX - metrics.left : metrics.width / 2;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    move(event.clientX);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (dragging.current) move(event.clientX);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const scroller = scrollerRef.current;
    if (!scroller || !metrics.maxScroll) return;
    const step = Math.max(180, scroller.clientWidth * .55);
    if (event.key === 'ArrowRight') scroller.scrollBy({ left: step, behavior: 'smooth' });
    else if (event.key === 'ArrowLeft') scroller.scrollBy({ left: -step, behavior: 'smooth' });
    else if (event.key === 'Home') scroller.scrollTo({ left: 0, behavior: 'smooth' });
    else if (event.key === 'End') scroller.scrollTo({ left: metrics.maxScroll, behavior: 'smooth' });
    else return;
    event.preventDefault();
  }

  return (
    <div
      ref={trackRef}
      className={metrics.maxScroll ? 'category-scrollbar' : 'category-scrollbar is-hidden'}
      role="scrollbar"
      tabIndex={metrics.maxScroll ? 0 : -1}
      aria-label="Desplazar filtros de categorías"
      aria-controls="category-strip"
      aria-orientation="horizontal"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={metrics.maxScroll ? Math.round((scrollerRef.current?.scrollLeft || 0) / metrics.maxScroll * 100) : 0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
    >
      <span className="category-scrollbar-thumb" style={{ width: metrics.width, transform: `translateX(${metrics.left}px)` }} />
    </div>
  );
}
