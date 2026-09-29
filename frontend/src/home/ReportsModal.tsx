import { useEffect, useMemo, useState } from 'react';
import { authorizedRequest } from '../api/client';
import { Alert } from '../components/Alert';
import { ModalShell } from './ModalShell';
import type { Post } from './types';

type Ticket = { status: 'OPEN' | 'CLOSED' }; type User = { id_user: number };
type Props = { token: string; posts: Post[]; onClose: () => void };
export function ReportsModal({ token, posts, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]); const [tickets, setTickets] = useState<Ticket[]>([]); const [error, setError] = useState<string | null>(null);
  useEffect(() => { Promise.all([authorizedRequest<User[]>('/users', token), authorizedRequest<Ticket[]>('/support/admin/tickets', token)]).then(([userResponse, ticketResponse]) => { setUsers(userResponse.data); setTickets(ticketResponse.data); }).catch((cause: Error) => setError(cause.message)); }, [token]);
  const categories = useMemo(() => Object.entries(posts.reduce<Record<string,number>>((result, post) => { result[post.category || 'Sin categoría'] = (result[post.category || 'Sin categoría'] || 0) + 1; return result; }, {})).sort((a,b) => b[1] - a[1]), [posts]);
  const max = categories[0]?.[1] || 1; const open = tickets.filter((ticket) => ticket.status === 'OPEN').length;
  return <ModalShell title="Reportes" subtitle="Resumen actual de actividad en FIVOX." onClose={onClose} size="large">{error && <Alert tone="danger">{error}</Alert>}<div className="report-grid"><article><span>Usuarios activos</span><strong>{users.length}</strong></article><article><span>Publicaciones</span><strong>{posts.length}</strong></article><article><span>Tickets abiertos</span><strong>{open}</strong></article><article><span>Tickets cerrados</span><strong>{tickets.length - open}</strong></article></div><h3 className="report-title">Publicaciones por categoría</h3><div className="report-bars">{categories.map(([category,count]) => <div key={category}><span>{category}</span><div><i style={{ width: `${(count / max) * 100}%` }} /></div><strong>{count}</strong></div>)}</div><button className="secondary-button print-report" type="button" onClick={() => window.print()}><i className="bi bi-printer" /> Imprimir reporte</button></ModalShell>;
}
