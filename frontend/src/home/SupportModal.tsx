import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { authorizedRequest } from '../api/client';
import type { SessionUser } from '../auth/session';
import { Alert } from '../components/Alert';

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
type Props = { token: string; user: SessionUser };

export function SupportView({ token, user }: Props) {
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
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!statusMenuOpen) return;
    function closeMenu(event: PointerEvent) {
      if (!settingsRef.current?.contains(event.target as Node)) setStatusMenuOpen(false);
    }
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [statusMenuOpen]);

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
    setSelected(ticket); setNewTicket(false); setStatusMenuOpen(false); setError(null);
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

  async function changeTicketStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    if (statusReason.trim().length < 5) { setError('Explicá brevemente el motivo del cambio.'); return; }
    const nextStatus = selected.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    setChangingStatus(true); setError(null);
    try {
      await authorizedRequest<unknown>(`/support/tickets/${selected.id_ticket}/status`, token, { method: 'PUT', body: JSON.stringify({ status: nextStatus, reason: statusReason.trim() }) });
      setShowStatusDialog(false); setStatusReason('');
      await Promise.all([loadTickets(), loadMessages(selected.id_ticket)]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No se pudo cambiar el estado de la consulta.'); } finally { setChangingStatus(false); }
  }

  const filterOptions: Array<{ key: Filter; label: string }> = isAdmin
    ? [{ key: 'unread', label: 'Sin responder' }, { key: 'open', label: 'Abiertos' }, { key: 'closed', label: 'Cerrados' }]
    : [{ key: 'all', label: 'Todos' }, { key: 'unread', label: 'Pendientes' }, { key: 'open', label: 'Abiertos' }, { key: 'closed', label: 'Resueltos' }];

  function ticketTone(ticket: Ticket) {
    if (ticket.status === 'CLOSED') return 'is-closed';
    if (Number(ticket.admin_replies || 0) === 0) return 'is-pending';
    return 'is-open';
  }

  function ticketStateLabel(ticket: Ticket) {
    if (ticket.status === 'CLOSED') return 'Resuelta';
    return Number(ticket.admin_replies || 0) > 0 ? 'En conversación' : 'Pendiente';
  }

  function ticketActivity(ticket: Ticket) {
    if (ticket.status === 'CLOSED') return { icon: 'bi-check-circle', label: 'Consulta resuelta' };
    const replies = Number(ticket.admin_replies || 0);
    if (replies === 0) return { icon: 'bi-clock', label: 'Esperando respuesta del equipo' };
    return { icon: 'bi-chat-left-text', label: `${replies} ${replies === 1 ? 'respuesta' : 'respuestas'} del equipo` };
  }

  return <><section className="support-view" aria-labelledby="support-title">
    <header className="workspace-heading my-services-heading support-heading">
      <div className="reviews-heading-copy"><div><h1 id="support-title">{isAdmin ? 'Gestión de soporte' : 'Centro de ayuda'}</h1><p>{isAdmin ? 'Gestioná y respondé las consultas de la comunidad.' : 'Contactate con el equipo de FIVOX.'}</p></div></div>
      <div className="support-heading-actions">
        <label className="ticket-search ticket-search--header"><i className="bi bi-search" /><input type="search" aria-label="Buscar consulta" placeholder="Buscar consulta…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        {!isAdmin && <button className="new-ticket-action" type="button" aria-label="Nueva consulta" data-tooltip="Nueva consulta" onClick={() => { setNewTicket(true); setSelected(null); }}><i className="bi bi-plus-lg" aria-hidden="true" /></button>}
      </div>
    </header>
    {error && <Alert tone="danger">{error}</Alert>}
    <div className={selected || newTicket ? 'support-workspace support-view-workspace has-detail' : 'support-workspace support-view-workspace'}>
      <aside className="ticket-browser">
        <div className="ticket-filters" role="tablist">{filterOptions.map((item) => <button key={item.key} className={`${filter === item.key ? 'is-active ' : ''}is-filter-${item.key}`} type="button" role="tab" aria-selected={filter === item.key} onClick={() => setFilter(item.key)}>{item.label}</button>)}</div>
        <div className="ticket-list">{loading ? <div className="modal-loading">Cargando consultas…</div> : visibleTickets.length ? visibleTickets.map((ticket) => { const activity = ticketActivity(ticket); return <button key={ticket.id_ticket} className={`ticket-item ${ticketTone(ticket)}${selected?.id_ticket === ticket.id_ticket ? ' is-active' : ''}`} type="button" onClick={() => selectTicket(ticket)}><span className="ticket-item-top"><span>Consulta N.º {ticket.id_ticket}</span><time>{new Date(ticket.created_at).toLocaleDateString('es-AR')}</time></span><span className="ticket-item-subject"><strong>{ticket.subject || 'Sin asunto'}</strong><span className="ticket-item-state"><i aria-hidden="true" />{ticketStateLabel(ticket)}</span></span>{isAdmin && <span className="ticket-item-meta"><span><i className="bi bi-person" aria-hidden="true" />{ticket.user_name || 'Usuario'}</span></span>}<span className="ticket-item-activity"><i className={`bi ${activity.icon}`} aria-hidden="true" />{activity.label}</span></button>; }) : <div className="ticket-empty"><i className="bi bi-inbox" /><span>No hay consultas.</span></div>}</div>
      </aside>

      <section className="ticket-detail">
        {newTicket ? <form className="new-ticket-form stacked-form" onSubmit={createTicket}><div className="mobile-detail-heading"><button type="button" aria-label="Volver a consultas" onClick={() => setNewTicket(false)}><i className="bi bi-arrow-left" /></button><div><h3>Nueva consulta</h3><p>Contanos brevemente qué necesitás.</p></div></div><label>Asunto<input maxLength={100} value={newFields.subject} onChange={(event) => setNewFields({ ...newFields, subject: event.target.value })} /></label><label>Mensaje inicial <span className="optional-label">Opcional</span><textarea rows={6} value={newFields.message} onChange={(event) => setNewFields({ ...newFields, message: event.target.value })} /></label><button className="primary-button" disabled={sending}>{sending ? 'Creando…' : 'Crear consulta'}</button></form> : selected ? <><div className="ticket-chat-actions"><button className="mobile-back" type="button" aria-label="Volver a consultas" onClick={() => setSelected(null)}><i className="bi bi-arrow-left" /></button></div><div className="ticket-messages">{messages.length ? messages.map((message) => { const mine = Number(message.id_user) === Number(user.id_user); return <div className={mine ? 'ticket-message is-mine' : 'ticket-message'} key={message.id_message}><p>{message.message}</p><time>{new Date(message.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</time></div>; }) : <div className="ticket-empty"><span>No hay mensajes todavía.</span></div>}<div ref={messagesEnd} /></div>{showStatusDialog ? <form className="ticket-status-inline" onSubmit={changeTicketStatus}><div className="ticket-status-inline-heading"><div><strong>{selected.status === 'OPEN' ? 'Cerrar consulta' : 'Reabrir consulta'}</strong><span>{selected.status === 'OPEN' ? 'El chat quedará bloqueado hasta que vuelva a abrirse.' : 'El chat volverá a admitir mensajes.'}</span></div><button type="button" aria-label="Cancelar cambio de estado" disabled={changingStatus} onClick={() => setShowStatusDialog(false)}><i className="bi bi-x-lg" /></button></div><textarea autoFocus maxLength={300} rows={3} aria-label="Motivo" placeholder={selected.status === 'OPEN' ? 'Explicá por qué se cierra la consulta…' : 'Explicá por qué se vuelve a abrir…'} value={statusReason} onChange={(event) => setStatusReason(event.target.value)} /><div className="ticket-status-inline-actions"><button className="secondary-button" type="button" disabled={changingStatus} onClick={() => setShowStatusDialog(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={changingStatus || statusReason.trim().length < 5}>{changingStatus ? 'Guardando…' : selected.status === 'OPEN' ? 'Cerrar consulta' : 'Reabrir consulta'}</button></div></form> : <form className="ticket-composer" onSubmit={sendMessage}><input aria-label="Mensaje" disabled={selected.status === 'CLOSED'} placeholder={selected.status === 'CLOSED' ? 'Esta consulta fue resuelta' : 'Escribí tu mensaje…'} value={draft} onChange={(event) => setDraft(event.target.value)} /><div className="ticket-settings" ref={settingsRef}><button className="ticket-settings-action" type="button" aria-label="Opciones de la consulta" aria-haspopup="menu" aria-expanded={statusMenuOpen} title="Opciones de la consulta" onClick={() => setStatusMenuOpen((current) => !current)}><i className="bi bi-gear-fill" /></button>{statusMenuOpen && <div className="ticket-settings-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setStatusMenuOpen(false); setStatusReason(''); setShowStatusDialog(true); }}><i className={`bi ${selected.status === 'OPEN' ? 'bi-lock' : 'bi-arrow-counterclockwise'}`} aria-hidden="true" /><span><strong>{selected.status === 'OPEN' ? 'Cerrar consulta' : 'Reabrir consulta'}</strong><small>{selected.status === 'OPEN' ? 'Bloquea nuevos mensajes' : 'Habilita nuevamente el chat'}</small></span></button></div>}</div><button type="submit" aria-label="Enviar mensaje" disabled={sending || selected.status === 'CLOSED' || !draft.trim()}><i className="bi bi-send-fill" /></button></form>}</> : <div className="ticket-placeholder"><i className="bi bi-chat-square-text" /><h3>Seleccioná una consulta</h3><p>Acá vas a poder ver el historial completo y responder.</p></div>}
      </section>
    </div>
  </section>
  </>;
}
