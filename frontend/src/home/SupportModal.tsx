import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { authorizedRequest } from '../api/client';
import type { SessionUser } from '../auth/session';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';

type Ticket = {
  id_ticket: number;
  subject: string | null;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  user_name?: string;
  unread_count?: number;
  admin_unread_count?: number;
  admin_replies?: number;
};

type TicketMessage = { id_message: number; id_user: number; message: string; created_at: string };
type Filter = 'unread' | 'open' | 'closed' | 'all';
type Props = { token: string; user: SessionUser; onClose: () => void };

export function SupportModal({ token, user, onClose }: Props) {
  const isAdmin = user.role === 'ADMIN';
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [filter, setFilter] = useState<Filter>(isAdmin ? 'unread' : 'all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [newTicket, setNewTicket] = useState(false);
  const [newFields, setNewFields] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    const path = isAdmin ? '/support/admin/tickets' : '/support/tickets';
    const response = await authorizedRequest<Ticket[]>(path, token);
    setTickets(response.data);
    setSelected((current) => current ? response.data.find((ticket) => Number(ticket.id_ticket) === Number(current.id_ticket)) ?? null : null);
  }, [isAdmin, token]);

  const loadMessages = useCallback(async (ticketId: number) => {
    const response = await authorizedRequest<TicketMessage[]>(`/support/tickets/${ticketId}/messages`, token);
    setMessages(response.data);
  }, [token]);

  useEffect(() => {
    loadTickets().catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
    const interval = window.setInterval(() => { void loadTickets(); }, 8000);
    return () => window.clearInterval(interval);
  }, [loadTickets]);

  useEffect(() => {
    if (!selected) return;
    void loadMessages(selected.id_ticket);
    const interval = window.setInterval(() => { void loadMessages(selected.id_ticket); }, 5000);
    return () => window.clearInterval(interval);
  }, [selected?.id_ticket, loadMessages]);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ block: 'nearest' }); }, [messages]);

  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    const matchesFilter = filter === 'all'
      || (filter === 'closed'
        ? ticket.status === 'CLOSED'
        : filter === 'open'
          ? ticket.status === 'OPEN' && Number(ticket.admin_replies || 0) > 0
          : ticket.status === 'OPEN' && Number(ticket.admin_replies || 0) === 0);
    const normalized = query.trim().toLocaleLowerCase('es');
    return matchesFilter && (!normalized || `${ticket.id_ticket} ${ticket.subject || ''} ${ticket.user_name || ''}`.toLocaleLowerCase('es').includes(normalized));
  }), [tickets, filter, query]);

  async function selectTicket(ticket: Ticket) {
    setSelected(ticket); setNewTicket(false); setError(null);
    await Promise.all([
      loadMessages(ticket.id_ticket),
      authorizedRequest<unknown>(`/support/tickets/${ticket.id_ticket}/${isAdmin ? 'read-admin' : 'read'}`, token, { method: 'PUT' }),
    ]).catch((reason: Error) => setError(reason.message));
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !draft.trim() || selected.status === 'CLOSED') return;
    setSending(true); setError(null);
    try {
      await authorizedRequest<unknown>(`/support/tickets/${selected.id_ticket}/messages`, token, { method: 'POST', body: JSON.stringify({ message: draft.trim() }) });
      setDraft('');
      await Promise.all([loadMessages(selected.id_ticket), loadTickets()]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo enviar el mensaje.'); } finally { setSending(false); }
  }

  async function createTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newFields.subject.trim()) { setError('Ingresá un asunto para la consulta.'); return; }
    setSending(true); setError(null);
    try {
      const response = await authorizedRequest<{ id_ticket: number }>('/support/tickets', token, { method: 'POST', body: JSON.stringify({ subject: newFields.subject.trim() }) });
      if (newFields.message.trim()) await authorizedRequest<unknown>(`/support/tickets/${response.data.id_ticket}/messages`, token, { method: 'POST', body: JSON.stringify({ message: newFields.message.trim() }) });
      setNewFields({ subject: '', message: '' }); setNewTicket(false);
      await loadTickets();
      const created = { id_ticket: response.data.id_ticket, subject: newFields.subject.trim(), status: 'OPEN' as const, created_at: new Date().toISOString() };
      await selectTicket(created);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo crear la consulta.'); } finally { setSending(false); }
  }

  async function closeTicket() {
    if (!selected || !window.confirm('¿Cerrar esta consulta?')) return;
    try { await authorizedRequest<unknown>(`/support/tickets/${selected.id_ticket}/close`, token, { method: 'PUT' }); await loadTickets(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cerrar la consulta.'); }
  }

  const filterOptions: Array<{ key: Filter; label: string }> = isAdmin
    ? [{ key: 'unread', label: 'Sin responder' }, { key: 'open', label: 'Abiertos' }, { key: 'closed', label: 'Cerrados' }]
    : [{ key: 'all', label: 'Todos' }, { key: 'unread', label: 'Pendientes' }, { key: 'open', label: 'Abiertos' }, { key: 'closed', label: 'Resueltos' }];

  function ticketTone(ticket: Ticket) {
    if (ticket.status === 'CLOSED') return 'is-closed';
    if (Number(ticket.admin_replies || 0) === 0) return 'is-pending';
    return 'is-open';
  }

  return <ModalShell title={isAdmin ? 'Centro de soporte' : 'Mis consultas'} subtitle={isAdmin ? 'Gestioná y respondé las consultas de la comunidad.' : 'Contactate con el equipo de FIVOX.'} onClose={onClose} size="large" className="form-modal--support form-modal--gray-header" contentClassName="form-modal-content--support" headerContent={<label className="ticket-search ticket-search--header"><i className="bi bi-search" /><input type="search" aria-label="Buscar consulta" placeholder="Buscar consulta…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>}>
    {error && <Alert tone="danger">{error}</Alert>}
    <div className={selected || newTicket ? 'support-workspace has-detail' : 'support-workspace'}>
      <aside className="ticket-browser">
        {!isAdmin && <button className="new-ticket-action" type="button" onClick={() => { setNewTicket(true); setSelected(null); }}><i className="bi bi-plus-lg" /> Nueva consulta</button>}
        <div className="ticket-filters" role="tablist">{filterOptions.map((item) => <button key={item.key} className={`${filter === item.key ? 'is-active ' : ''}is-filter-${item.key}`} type="button" role="tab" aria-selected={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div>
        <div className="ticket-list">{loading ? <div className="modal-loading">Cargando consultas…</div> : visibleTickets.length ? visibleTickets.map((ticket) => <button key={ticket.id_ticket} className={`ticket-item ${ticketTone(ticket)}${selected?.id_ticket === ticket.id_ticket ? ' is-active' : ''}`} type="button" onClick={() => selectTicket(ticket)}><div><span>#{ticket.id_ticket}</span><time>{new Date(ticket.created_at).toLocaleDateString('es-AR')}</time></div><strong>{ticket.subject || 'Sin asunto'}</strong><small>{isAdmin ? ticket.user_name || 'Usuario' : ticket.status === 'CLOSED' ? 'Resuelto' : Number(ticket.admin_replies || 0) === 0 ? 'Pendiente' : 'Abierto'}</small></button>) : <div className="ticket-empty"><i className="bi bi-inbox" /><span>No hay consultas.</span></div>}</div>
      </aside>

      <section className="ticket-detail">
        {newTicket ? <form className="new-ticket-form stacked-form" onSubmit={createTicket}><div className="mobile-detail-heading"><button type="button" onClick={() => setNewTicket(false)}><i className="bi bi-arrow-left" /></button><div><h3>Nueva consulta</h3><p>Contanos brevemente qué necesitás.</p></div></div><label>Asunto<input maxLength={100} value={newFields.subject} onChange={(event) => setNewFields({ ...newFields, subject: event.target.value })} /></label><label>Mensaje inicial <span className="optional-label">Opcional</span><textarea rows={6} value={newFields.message} onChange={(event) => setNewFields({ ...newFields, message: event.target.value })} /></label><button className="primary-button" disabled={sending}>{sending ? 'Creando…' : 'Crear consulta'}</button></form> : selected ? <><header className="ticket-chat-header"><button className="mobile-back" type="button" aria-label="Volver a consultas" onClick={() => setSelected(null)}><i className="bi bi-arrow-left" /></button><div><h3>Consulta #{selected.id_ticket}</h3><p>{selected.subject || 'Sin asunto'}{isAdmin && selected.user_name ? ` · ${selected.user_name}` : ''}</p></div>{isAdmin && selected.status === 'OPEN' && <button className="resolve-ticket-action" type="button" aria-label="Marcar como resuelta" data-tooltip="Marcar como resuelta" onClick={closeTicket}><i className="bi bi-check-lg" /></button>}<button className="close-ticket-action" type="button" aria-label="Cerrar conversación" data-tooltip="Cerrar conversación" onClick={() => setSelected(null)}><i className="bi bi-x-lg" /></button></header><div className="ticket-messages">{messages.length ? messages.map((message) => { const mine = Number(message.id_user) === Number(user.id_user); return <div className={mine ? 'ticket-message is-mine' : 'ticket-message'} key={message.id_message}><p>{message.message}</p><time>{new Date(message.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time></div>; }) : <div className="ticket-empty"><span>No hay mensajes todavía.</span></div>}<div ref={messagesEnd} /></div><form className="ticket-composer" onSubmit={sendMessage}><input aria-label="Mensaje" disabled={selected.status === 'CLOSED'} placeholder={selected.status === 'CLOSED' ? 'Esta consulta fue resuelta' : 'Escribí tu mensaje…'} value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit" aria-label="Enviar mensaje" disabled={sending || selected.status === 'CLOSED' || !draft.trim()}><i className="bi bi-send-fill" /></button></form></> : <div className="ticket-placeholder"><i className="bi bi-chat-square-text" /><h3>Seleccioná una consulta</h3><p>Acá vas a poder ver el historial completo y responder.</p></div>}
      </section>
    </div>
  </ModalShell>;
}
