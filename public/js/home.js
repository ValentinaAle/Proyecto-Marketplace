let allPosts = []; 
let ticketActivoId = null;
let pollingUsuario = null;
document.addEventListener('DOMContentLoaded', () => {
  init();
});

async function init() {
  const token = getToken();
  console.log('Token encontrado:', token);
  
  if (!token) {
    window.location.href = '/';
    return;
  }

  configurarLogout();
  configurarCategorias();
  configurarScrollCategorias();
  configurarBtnCrear();
  configurarTerminos();
  configurarBtnPerfil();
  configurarBtnSoporte();
  await cargarPosts();
  configurarVistaPorRol();
  configurarContadores();
  configurarBtnUsuarios();
  configurarBtnMisServicios();
  configurarBtnAdminServicios();
  configurarBtnReportes();
  configurarBtnCalificar();
}

function configurarScrollCategorias() {
  const scroller = document.getElementById('categories-scroll');
  const scrollbar = document.querySelector('.categories-scrollbar');
  const thumb = scrollbar?.querySelector('.categories-scrollbar-thumb');

  if (!scroller || !scrollbar || !thumb) return;

  let dragging = false;
  let pointerStart = 0;
  let scrollStart = 0;

  const metrics = () => {
    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const trackWidth = scrollbar.clientWidth;
    const thumbWidth = maxScroll === 0
      ? trackWidth
      : Math.max(56, trackWidth * (scroller.clientWidth / scroller.scrollWidth));

    return { maxScroll, trackWidth, thumbWidth };
  };

  const update = () => {
    const { maxScroll, trackWidth, thumbWidth } = metrics();
    const maxThumbTravel = Math.max(0, trackWidth - thumbWidth);
    const progress = maxScroll > 0 ? scroller.scrollLeft / maxScroll : 0;

    scrollbar.classList.toggle('is-hidden', maxScroll === 0);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.transform = `translateX(${progress * maxThumbTravel}px)`;
    scrollbar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
  };

  scrollbar.addEventListener('pointerdown', (event) => {
    const { maxScroll, trackWidth, thumbWidth } = metrics();
    if (maxScroll === 0) return;

    const thumbRect = thumb.getBoundingClientRect();
    const pressedThumb = event.clientX >= thumbRect.left && event.clientX <= thumbRect.right;

    if (!pressedThumb) {
      const trackRect = scrollbar.getBoundingClientRect();
      const target = event.clientX - trackRect.left - (thumbWidth / 2);
      const progress = Math.max(0, Math.min(1, target / (trackWidth - thumbWidth)));
      scroller.scrollLeft = progress * maxScroll;
    }

    dragging = true;
    pointerStart = event.clientX;
    scrollStart = scroller.scrollLeft;
    scrollbar.setPointerCapture(event.pointerId);
  });

  scrollbar.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const { maxScroll, trackWidth, thumbWidth } = metrics();
    const maxThumbTravel = trackWidth - thumbWidth;
    if (maxThumbTravel <= 0) return;
    scroller.scrollLeft = scrollStart + ((event.clientX - pointerStart) / maxThumbTravel) * maxScroll;
  });

  const stopDragging = () => { dragging = false; };
  scrollbar.addEventListener('pointerup', stopDragging);
  scrollbar.addEventListener('pointercancel', stopDragging);

  scrollbar.addEventListener('keydown', (event) => {
    const step = Math.max(120, scroller.clientWidth * 0.5);
    const destinations = {
      ArrowLeft: scroller.scrollLeft - step,
      ArrowRight: scroller.scrollLeft + step,
      Home: 0,
      End: scroller.scrollWidth,
    };

    if (!(event.key in destinations)) return;
    event.preventDefault();
    scroller.scrollTo({ left: destinations[event.key], behavior: 'smooth' });
  });

  scroller.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(scroller);
  update();
}

function getToken() {
  return localStorage.getItem('fivox_token') || sessionStorage.getItem('fivox_token');
}

function clearAuth() {
  localStorage.removeItem('fivox_token');
  localStorage.removeItem('fivox_user');
  sessionStorage.removeItem('fivox_token');
  sessionStorage.removeItem('fivox_user');
}

function configurarLogout() {
  const btnLogout = document.getElementById('btn-logout');
  if (!btnLogout) return;

  btnLogout.addEventListener('click', () => {
    clearAuth();
    window.location.href = '/';
  });
}

async function cargarPosts() {
  try {
    const token = getToken();

    const response = await fetch('/api/posts', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener publicaciones');
    }

    const data = await response.json();
    const posts = Array.isArray(data) ? data : (data.data || []);

    allPosts = posts;
    renderPosts(allPosts);
    configurarBusqueda();
  } catch (error) {
    console.error(error);
    mostrarError('No se pudieron cargar las publicaciones.');
  }
}


function mostrarError(mensaje) {
  const container = document.getElementById('posts-container');
  if (container) {
    container.innerHTML = `<p class="text-danger text-center w-100">${mensaje}</p>`;
  }
}


// SUPPORT VIEW DISPLAY
// SOPORTE

function configurarBtnSoporte() {
  const btn      = document.getElementById('btn-support');
  const btnAdmin = document.getElementById('btn-support-admin');

  if (btn) {
    btn.addEventListener('click', async () => {
      toggleSupportView();
      await cargarTickets();
    });
  }

  if (btnAdmin) {
    btnAdmin.addEventListener('click', async () => {
      document.getElementById('admin-support-modal').classList.add('visible');
      await cargarTicketsAdmin();
      if (pollingListaAdmin) clearInterval(pollingListaAdmin);
      pollingListaAdmin = setInterval(cargarTicketsAdmin, 4000);
    });
  }
}

function closeAdminSupportModal() {
  document.getElementById('admin-support-modal').classList.remove('visible');
  closeAdminChatModal();
  if (pollingListaAdmin) {
    clearInterval(pollingListaAdmin);
    pollingListaAdmin = null;
  }
}
let todosLosTicketsAdmin = [];
let filtroTicketsAdmin = 'unread';

async function cargarTicketsAdmin() {
  const list = document.getElementById('admin-ticket-list');
  if (list && todosLosTicketsAdmin.length === 0) {
    list.innerHTML = `
      <div class="admin-ticket-skeleton"></div>
      <div class="admin-ticket-skeleton"></div>
      <div class="admin-ticket-skeleton"></div>`;
  }
  try {
    const token = getToken();
    const res = await fetch('/api/support/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('No se pudieron cargar las consultas.');
    const data = await res.json();
    todosLosTicketsAdmin = data.data || [];
    renderTicketsAdmin(todosLosTicketsAdmin);
  } catch (err) {
    console.error('Error al cargar tickets admin:', err);
    if (list) {
      list.innerHTML = `
        <div class="admin-ticket-empty admin-ticket-error">
          <i class="bi bi-exclamation-circle"></i>
          <p>No pudimos cargar las consultas.</p>
          <button type="button" onclick="cargarTicketsAdmin()">Reintentar</button>
        </div>`;
    }
  }
}

function escaparHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTicketsAdmin(tickets) {
  const source = todosLosTicketsAdmin.length || tickets.length === 0 ? todosLosTicketsAdmin : tickets;
  const unread = source.filter(t => Number(t.admin_replies) === 0 && t.status === 'OPEN');
  const open = source.filter(t => Number(t.admin_replies) > 0 && t.status === 'OPEN');
  const closed = source.filter(t => t.status === 'CLOSED');

  document.getElementById('count-unread').textContent = unread.length;
  document.getElementById('count-open').textContent = open.length;
  document.getElementById('count-closed').textContent = closed.length;

  const query = document.getElementById('admin-ticket-search')?.value.trim().toLowerCase() || '';
  const groups = { unread, open, closed };
  const labels = { unread: 'Sin responder', open: 'Abiertos', closed: 'Cerrados' };
  const visibles = (groups[filtroTicketsAdmin] || unread).filter(ticket =>
    !query ||
    String(ticket.id_ticket).includes(query) ||
    (ticket.subject || '').toLowerCase().includes(query) ||
    (ticket.user_name || '').toLowerCase().includes(query)
  );

  const list = document.getElementById('admin-ticket-list');
  if (!list) return;
  document.getElementById('admin-ticket-list-title').textContent = labels[filtroTicketsAdmin];
  document.getElementById('admin-ticket-result-count').textContent =
    `${visibles.length} ${visibles.length === 1 ? 'consulta' : 'consultas'}`;
  list.innerHTML = '';

  if (visibles.length === 0) {
    list.innerHTML = `
      <div class="admin-ticket-empty">
        <i class="bi bi-inbox"></i>
        <p>${query ? 'No encontramos consultas con esa búsqueda.' : 'No hay consultas en este estado.'}</p>
      </div>`;
    return;
  }

  visibles.forEach(ticket => {
    const fecha = new Date(ticket.created_at).toLocaleDateString('es-AR');
    const tieneNoLeidos = Number(ticket.admin_unread_count) > 0;
    const estaActivo = Number(ticketActivoAdminId) === Number(ticket.id_ticket);

    const card = document.createElement('button');
    card.type = 'button';
    card.className = `admin-ticket-card${estaActivo ? ' active' : ''}`;
    card.setAttribute('aria-pressed', String(estaActivo));
    card.innerHTML = `
      <div class="admin-ticket-card-header">
        <span class="admin-ticket-id">#${ticket.id_ticket}</span>
        <span class="admin-ticket-date">${fecha}</span>
      </div>
      <p class="ticket-subject">${escaparHtml(ticket.subject || 'Sin asunto')}</p>
      <div class="ticket-meta">
        <span><i class="bi bi-person"></i>${escaparHtml(ticket.user_name || 'Usuario')}</span>
        ${tieneNoLeidos ? `<span class="admin-ticket-new"><span class="unread-dot"></span>Nuevo</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => abrirTicketAdmin(ticket));
    list.appendChild(card);
  });
}

function filtrarTicketsAdmin() {
  renderTicketsAdmin(todosLosTicketsAdmin);
}

function cambiarFiltroTicketsAdmin(filter, button) {
  filtroTicketsAdmin = filter;
  document.querySelectorAll('.admin-ticket-filter').forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
  });
  renderTicketsAdmin(todosLosTicketsAdmin);
}

let ticketActivoAdminId = null;
let pollingAdmin = null;
let pollingListaAdmin = null;

async function abrirTicketAdmin(ticket) {
  ticketActivoAdminId = ticket.id_ticket;

  document.getElementById('admin-chat-title').textContent =
    `Consulta #${ticket.id_ticket} — ${ticket.subject || 'Sin asunto'}`;
  document.getElementById('admin-chat-subtitle').textContent =
    `${ticket.user_name} · ${ticket.status === 'CLOSED' ? 'Cerrado' : 'Abierto desde'} ${new Date(ticket.created_at).toLocaleDateString('es-AR')}`;

  document.getElementById('btn-cerrar-ticket-admin').style.display =
    ticket.status === 'OPEN' ? 'inline-flex' : 'none';
  const status = document.getElementById('admin-chat-status');
  status.textContent = ticket.status === 'CLOSED' ? 'Cerrado' : 'Abierto';
  status.classList.toggle('is-closed', ticket.status === 'CLOSED');

  aplicarEstadoInputAdmin(ticket.status);

  document.getElementById('admin-chat-panel').classList.remove('is-empty');
  document.getElementById('admin-support-modal').classList.add('chat-visible');
  renderTicketsAdmin(todosLosTicketsAdmin);

  // Marcar como leído por admin
  try {
    const token = getToken();
    await fetch(`/api/support/tickets/${ticket.id_ticket}/read-admin`, {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('Error al marcar como leído admin:', err);
  }

  await cargarMensajesAdmin(ticket.id_ticket);

  if (pollingAdmin) clearInterval(pollingAdmin);
  pollingAdmin = setInterval(() => actualizarTicketAbiertoAdmin(ticket.id_ticket), 4000);
}

function aplicarEstadoInputAdmin(status) {
  const cerrado = status === 'CLOSED';
  const inputAdmin = document.getElementById('admin-chat-input-msg');
  const chatInputAdminBox = document.querySelector('#admin-support-modal .admin-chat-input');
  inputAdmin.disabled = cerrado;
  inputAdmin.placeholder = cerrado ? 'Este ticket está cerrado' : 'Escribí tu respuesta...';
  chatInputAdminBox.querySelector('button').disabled = cerrado;
}

async function actualizarTicketAbiertoAdmin(id) {
  if (ticketActivoAdminId !== id) return;

  try {
    const token = getToken();
    const res = await fetch('/api/support/admin/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const tickets = data.data || [];
    const ticket = tickets.find(t => t.id_ticket === id);
    if (!ticket) return;

    document.getElementById('btn-cerrar-ticket-admin').style.display =
      ticket.status === 'OPEN' ? 'inline-flex' : 'none';
    const status = document.getElementById('admin-chat-status');
    status.textContent = ticket.status === 'CLOSED' ? 'Cerrado' : 'Abierto';
    status.classList.toggle('is-closed', ticket.status === 'CLOSED');
    aplicarEstadoInputAdmin(ticket.status);
    todosLosTicketsAdmin = tickets;
    renderTicketsAdmin(tickets);

    await cargarMensajesAdmin(id);
  } catch (err) {
    console.error('Error al actualizar ticket admin:', err);
  }
}

function closeAdminChatModal() {
  document.getElementById('admin-support-modal').classList.remove('chat-visible');
  document.getElementById('admin-chat-panel')?.classList.add('is-empty');
  ticketActivoAdminId = null;
  renderTicketsAdmin(todosLosTicketsAdmin);
  if (pollingAdmin) {
    clearInterval(pollingAdmin);
    pollingAdmin = null;
  }
}

async function cargarMensajesAdmin(id) {
  try {
    const token = getToken();
    const res   = await fetch(`/api/support/tickets/${id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderMensajesAdmin(data.data || []);
  } catch (err) {
    console.error('Error al cargar mensajes:', err);
  }
}

function renderMensajesAdmin(messages) {
  const container = document.getElementById('admin-chat-messages');
  if (!container) return;

  const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
  const user = JSON.parse(userRaw);
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = `<p style="color:#6b7280;font-size:14px;text-align:center;">No hay mensajes aún.</p>`;
    return;
  }

  messages.forEach(msg => {
    const esDelAdmin = Number(msg.id_user) === Number(user.id_user);
    const div = document.createElement('div');
    div.className = `message ${esDelAdmin ? 'admin' : 'user'}`;
    const text = document.createElement('p');
    text.textContent = msg.message;
    div.appendChild(text);
    if (msg.created_at) {
      const time = document.createElement('time');
      time.dateTime = msg.created_at;
      time.textContent = new Date(msg.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      div.appendChild(time);
    }
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

async function enviarMensajeAdmin() {
  if (!ticketActivoAdminId) return;

  const input   = document.getElementById('admin-chat-input-msg');
  const message = input.value.trim();
  if (!message) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/support/tickets/${ticketActivoAdminId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.ok) {
      input.value = '';
      await cargarMensajesAdmin(ticketActivoAdminId);
      await cargarTicketsAdmin();
    }
  } catch (err) {
    console.error('Error al enviar mensaje:', err);
  }
}

async function cerrarTicketAdmin() {
  if (!ticketActivoAdminId) return;
  if (!confirm('¿Seguro que querés cerrar este ticket?')) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/support/tickets/${ticketActivoAdminId}/close`, {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('btn-cerrar-ticket-admin').style.display = 'none';
      const status = document.getElementById('admin-chat-status');
      status.textContent = 'Cerrado';
      status.classList.add('is-closed');
      aplicarEstadoInputAdmin('CLOSED');
      mostrarToast('Ticket cerrado ✅');
      await cargarTicketsAdmin();
    }
  } catch (err) {
    console.error('Error al cerrar ticket:', err);
  }
}

function toggleSupportView() {
  const supportView = document.getElementById('support-view');
  const btn = document.getElementById('btn-support');
  const abierto = supportView.style.display === 'flex';

  if (abierto) {
    supportView.style.display = 'none';
    btn.classList.remove('active');
    detenerPolling();
  } else {
    supportView.style.display = 'flex';
    btn.classList.add('active');
    iniciarPolling();
  }
}

function closeSupportView() {
  document.getElementById('support-view').style.display = 'none';
  document.getElementById('btn-support').classList.remove('active');
  ticketActivoId = null;
  detenerPolling();
  if (pollingUsuario) {
    clearInterval(pollingUsuario);
    pollingUsuario = null;
  }
}

async function cargarTickets() {
  try {
    const token = getToken();
    const res   = await fetch('/api/support/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderTickets(data.data || []);
  } catch (err) {
    console.error('Error al cargar tickets:', err);
  }
}

function renderTickets(tickets) {
  const list = document.getElementById('ticket-list');
  if (!list) return;

  list.innerHTML = '';

  if (tickets.length === 0) {
    list.innerHTML = `<p style="color:#6b7280;font-size:14px;text-align:center;margin-top:20px;">No tenés consultas aún.</p>`;
    return;
  }

  tickets.forEach(ticket => {
    const statusMap = {
      'OPEN':   { label: 'Abierto',  cls: 'status-process' },
      'CLOSED': { label: 'Resuelto', cls: 'status-resolved' },
    };
    const s = statusMap[ticket.status] || { label: ticket.status, cls: 'status-waiting' };
    const fecha = new Date(ticket.created_at).toLocaleDateString('es-AR');
    const tieneNoLeidos = Number(ticket.unread_count) > 0;

    const card = document.createElement('div');
    card.className = `ticket-card${ticketActivoId === ticket.id_ticket ? ' active' : ''}`;
    card.innerHTML = `
      <div class="ticket-header">
        <h4>
          Consulta #${ticket.id_ticket}
          ${tieneNoLeidos ? `<span class="unread-dot" title="Mensaje sin leer"></span>` : ''}
        </h4>
        <button class="ticket-view-btn">
          Ver <i class="bi bi-chevron-right"></i>
        </button>
      </div>
      <p>${ticket.subject || 'Sin asunto'}</p>
      <div class="ticket-footer">
        <span class="ticket-status ${s.cls}">
          <i class="bi bi-clock-fill"></i> ${s.label}
        </span>
        <span>${fecha}</span>
      </div>
    `;

    card.querySelector('.ticket-view-btn').addEventListener('click', () => {
      abrirTicket(ticket.id_ticket, ticket.subject || '');
    });

    list.appendChild(card);
  });
}

async function abrirTicket(id, subject) {
  ticketActivoId = id;
  document.getElementById('chat-ticket-title').textContent = `Consulta #${id} — ${subject}`;

  const chatSection = document.getElementById('support-chat-section');
  if (chatSection) chatSection.style.display = 'flex';

  // Mostrar el input
  document.getElementById('chat-input-area').style.display = 'flex';

  // Marcar como leído
  try {
    const token = getToken();
    await fetch(`/api/support/tickets/${id}/read`, {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error('Error al marcar como leído:', err);
  }

  await cargarMensajes(id);
  await cargarTickets();
}

function aplicarEstadoInputUsuario(status) {
  const cerrado = status === 'CLOSED';
  const input = document.getElementById('chat-input-msg');
  const chatInputBox = document.querySelector('#support-chat-section .chat-input');
  input.disabled = cerrado;
  input.placeholder = cerrado ? 'Este ticket está cerrado' : 'Escribí tu mensaje...';
  chatInputBox.querySelector('button').disabled = cerrado;
}

async function actualizarTicketAbiertoUsuario(id) {
  if (ticketActivoId !== id) return;

  try {
    const token = getToken();
    const res = await fetch('/api/support/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const tickets = data.data || [];
    const ticket = tickets.find(t => t.id_ticket === id);
    if (!ticket) return;

    aplicarEstadoInputUsuario(ticket.status);
    renderTickets(tickets);
    await cargarMensajes(id);
  } catch (err) {
    console.error('Error al actualizar ticket:', err);
  }
}

async function cargarMensajes(id) {
  try {
    const token = getToken();
    const res   = await fetch(`/api/support/tickets/${id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderMensajes(data.data || []);
  } catch (err) {
    console.error('Error al cargar mensajes:', err);
  }
}

function renderMensajes(messages) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
  const user = JSON.parse(userRaw);
  container.innerHTML = '';

  if (messages.length === 0) {
    container.innerHTML = `<p style="color:#6b7280;font-size:14px;text-align:center;">No hay mensajes aún.</p>`;
    return;
  }

  messages.forEach(msg => {
    const esPropio = Number(msg.id_user) === Number(user.id_user);
    const div = document.createElement('div');
    div.className = `message ${esPropio ? 'user' : 'admin'}`;
    div.textContent = msg.message;
    container.appendChild(div);
  });

  container.scrollTop = container.scrollHeight;
}

async function enviarMensaje() {
  if (!ticketActivoId) return;

  const input   = document.getElementById('chat-input-msg');
  const message = input.value.trim();
  if (!message) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/support/tickets/${ticketActivoId}/messages`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.ok) {
      input.value = '';
      await cargarMensajes(ticketActivoId);
    }
  } catch (err) {
    console.error('Error al enviar mensaje:', err);
  }
}

function crearNuevoTicket() {
  document.getElementById('new-ticket-modal').style.display = 'flex';
  document.getElementById('ticket-subject').value = '';
  document.getElementById('ticket-first-message').value = '';
  document.getElementById('new-ticket-alert').className = 'd-none';
}

function closeNewTicketModal() {
  document.getElementById('new-ticket-modal').style.display = 'none';
}

async function confirmarNuevoTicket() {
  const subject = document.getElementById('ticket-subject').value.trim();
  const message = document.getElementById('ticket-first-message').value.trim();
  const alertBox = document.getElementById('new-ticket-alert');

  if (!subject) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'El asunto es obligatorio.';
    return;
  }

  const btn = document.getElementById('btn-create-ticket');
  btn.disabled    = true;
  btn.textContent = 'Creando...';

  try {
    const token = getToken();

    const res = await fetch('/api/support/tickets', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al crear la consulta.';
      return;
    }

    const id_ticket = data.data.id_ticket;

    // Si escribió un mensaje inicial, lo enviamos
    if (message) {
      await fetch(`/api/support/tickets/${id_ticket}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message }),
      });
    }

    closeNewTicketModal();
    await abrirTicket(id_ticket, subject);

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Crear consulta';
  }
}


function configurarBusqueda() {
  const input  = document.querySelector('.search input');
  const btn    = document.querySelector('.search button');
  if (!input || !btn) return;

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    const filtrados = allPosts.filter(post =>
      post.title.toLowerCase().includes(query)
    );
    renderPosts(filtrados);

    // Cambia el ícono según si hay texto o no
    btn.innerHTML = input.value.length > 0
      ? '<i class="bi bi-x-lg"></i>'
      : '<i class="bi bi-search"></i>';
  });

  btn.addEventListener('click', () => {
    input.value = '';
    btn.innerHTML = '<i class="bi bi-search"></i>';
    renderPosts(allPosts);
    input.focus();
  });
}

function configurarCategorias() {
  const cards = document.querySelectorAll('.home-card');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const categoria = card.dataset.category;
      const yaActiva  = card.classList.contains('active');

      // Quitar active de todas
      cards.forEach(c => c.classList.remove('active'));

      if (yaActiva) {
        // Si ya estaba activa, deseleccionar y mostrar todos
        renderPosts(allPosts);
      } else {
        // Activar la seleccionada y filtrar
        card.classList.add('active');
        const filtrados = allPosts.filter(post => post.category === categoria);
        renderPosts(filtrados);
      }
    });
  });
}

function closeModal() {
  document.getElementById('post-modal').style.display = 'none';
}

// CREAR POST MODAL 
function configurarBtnCrear() {
  const btn = document.getElementById('btn-open-create');
  if (!btn) return;
  btn.addEventListener('click', () => openCreateModal());
}

async function openCreateModal() {
  document.getElementById('create-post-modal').style.display = 'flex';
  await cargarCategorias();
}

function closeCreateModal() {
  document.getElementById('create-post-modal').style.display = 'none';
  document.getElementById('cp-title').value       = '';
  document.getElementById('cp-description').value = '';
  document.getElementById('cp-image').value       = '';
  document.getElementById('cp-category').value    = '';
  document.getElementById('create-post-alert').className = 'd-none';

  // Cerrar toast si existe
  const toast = document.querySelector('.fivox-toast');
  if (toast) {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }
}

async function cargarCategorias() {
  try {
    const token = getToken();
    const res   = await fetch('/api/posts/categories', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data  = await res.json();
    const select = document.getElementById('cp-category');

    select.innerHTML = '<option value="">Seleccioná una categoría</option>';
    data.data.forEach(cat => {
      select.innerHTML += `<option value="${cat.id_category}">${cat.name}</option>`;
    });
  } catch (err) {
    console.error('Error al cargar categorías:', err);
  }
}

async function submitPost() {
  const title       = document.getElementById('cp-title').value.trim();
  const description = document.getElementById('cp-description').value.trim();
  const image_url   = document.getElementById('cp-image').value.trim();
  const id_category = document.getElementById('cp-category').value;
  const alertBox = document.getElementById('create-post-alert');

  if (!title || !description || !id_category) {
    alertBox.className = 'alert alert-danger';
    alertBox.textContent = 'Título, descripción y categoría son obligatorios.';
    return;
  }

  const errorPost = validarPost(title, description);
  if (errorPost) {
    alertBox.className = 'alert alert-danger';
    alertBox.textContent = errorPost;
    return;
  }

  try {
    const token = getToken();
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, image_url, id_category }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al publicar.';
      return;
    }

    setTimeout(() => {
      closeCreateModal();
      cargarPosts();
      setTimeout(() => mostrarToast('¡Publicación creada con éxito! 🎉'), 300);
    }, 2000);

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Publicar';
  }
}

function mostrarToast(mensaje) {
  const toast = document.createElement('div');
  toast.className = 'fivox-toast';
  toast.textContent = mensaje;
  document.body.appendChild(toast);

  setTimeout(() => toast.style.opacity = '1', 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function configurarTerminos() {
  const btn = document.getElementById('btn-terms');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await abrirTerminos();
  });
}

async function abrirTerminos() {
  try {
    const token = getToken();
    const res   = await fetch('/api/terms', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
    const user = JSON.parse(userRaw);
    const esAdmin = user.role === 'ADMIN';
    document.getElementById('btn-save-terms').style.display = esAdmin ? 'block' : 'none';

    if (esAdmin) {
      document.getElementById('terms-editor').value       = data.data?.content || '';
      document.getElementById('terms-view-section').style.display   = 'none';
      document.getElementById('terms-edit-section').style.display   = 'block';
    } else {
      document.getElementById('terms-content-text').innerText = data.data?.content || '';
      document.getElementById('terms-view-section').style.display   = 'block';
      document.getElementById('terms-edit-section').style.display   = 'none';
    }

    document.getElementById('terms-modal').style.display = 'flex';
  } catch (err) {
    console.error('Error al cargar términos:', err);
  }
}

async function guardarTerminos() {
  const content  = document.getElementById('terms-editor').value.trim();
  const alertBox = document.getElementById('terms-alert');

  if (!content) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'El contenido no puede estar vacío.';
    return;
  }

  const btn = document.getElementById('btn-save-terms');
  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const token = getToken();
    const res   = await fetch('/api/terms', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al guardar.';
      return;
    }

    alertBox.className   = 'alert alert-success';
    alertBox.textContent = 'Términos actualizados correctamente.';

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  }
}

function closeTermsModal() {
  document.getElementById('terms-modal').style.display = 'none';
}

function configurarBtnPerfil() {
  const btn = document.getElementById('btn-open-profile');
  if (!btn) return;
  btn.addEventListener('click', () => openProfileModal());
}

let pendingChanges = {};

async function openProfileModal() {
  document.getElementById('profile-modal').style.display = 'flex';
  pendingChanges = {};

  try {
    const token = getToken();
    const res   = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (data.ok) {
      setFieldView('name',   data.data.name);
      setFieldView('email',  data.data.email);
      setFieldView('phone',  data.data.phone);
      setFieldView('avatar', data.data.avatar_url);

      document.getElementById('pf-name').value   = data.data.name || '';
      document.getElementById('pf-email').value  = data.data.email || '';
      document.getElementById('pf-phone').value  = data.data.phone || '';
      document.getElementById('pf-avatar').value = data.data.avatar_url || '';

      const img = document.getElementById('profile-avatar-img');
      if (data.data.avatar_url) {
        img.src = data.data.avatar_url;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('Error al cargar perfil:', err);
  }
}

function setFieldView(field, value) {
  const el = document.getElementById(`view-${field}`);
  if (el) el.textContent = value || (field === 'avatar' ? 'Sin definir' : '—');
}

function toggleEdit(field) {
  const wrapper = document.querySelector(`.profile-field[data-field="${field}"]`);
  wrapper.classList.toggle('editing');

  if (wrapper.classList.contains('editing')) {
    document.getElementById(`pf-${field}`).focus();
  }
}

function closeProfileModal() {
  document.getElementById('profile-modal').style.display = 'none';
  document.getElementById('profile-alert').className = 'd-none';
  document.getElementById('pf-old-password').value = '';
  document.getElementById('pf-new-password').value = '';

  document.querySelectorAll('.profile-field.editing').forEach(f => f.classList.remove('editing'));
}

async function saveAll() {
  const name       = document.getElementById('pf-name').value.trim();
  const email      = document.getElementById('pf-email').value.trim();
  const phone      = document.getElementById('pf-phone').value.trim();
  const avatar_url = document.getElementById('pf-avatar').value.trim();
  const oldPassword = document.getElementById('pf-old-password').value;
  const newPassword = document.getElementById('pf-new-password').value;
  const alertBox    = document.getElementById('profile-alert');

  if (!name || !email) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'Nombre y email son obligatorios.';
    return;
  }

  const btn = document.getElementById('btn-save-profile');
  btn.disabled    = true;
  btn.textContent = 'Guardando...';

  try {
    const token = getToken();

    const res = await fetch('/api/auth/profile', {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, email, phone, avatar_url }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al actualizar.';
      return;
    }

    // Si completó los campos de contraseña, cambiarla también
    if (oldPassword && newPassword) {
      const resPass = await fetch('/api/auth/password', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const dataPass = await resPass.json();

      if (!resPass.ok || !dataPass.ok) {
        alertBox.className   = 'alert alert-danger';
        alertBox.textContent = dataPass.message || 'Perfil guardado, pero falló el cambio de contraseña.';
        return;
      }
    }

    setFieldView('name', name);
    setFieldView('email', email);
    setFieldView('phone', phone);
    setFieldView('avatar', avatar_url);

    const img = document.getElementById('profile-avatar-img');
    if (avatar_url) {
      img.src = avatar_url;
      img.style.display = 'block';
    }

    document.querySelectorAll('.profile-field.editing').forEach(f => f.classList.remove('editing'));
    document.getElementById('pf-old-password').value = '';
    document.getElementById('pf-new-password').value = '';

    await cargarPosts(); // refresca los posts para que muestren los datos actualizados

    alertBox.className   = 'alert alert-success';
    alertBox.textContent = 'Perfil actualizado correctamente.';

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  }
}


function configurarVistaPorRol() {
  const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
  const user = JSON.parse(userRaw);
  const esAdmin = user.role === 'ADMIN';

  document.getElementById('btn-mis-servicios').style.display   = esAdmin ? 'none' : 'flex';
  document.getElementById('btn-admin-servicios').style.display = esAdmin ? 'flex' : 'none';
  document.getElementById('btn-open-create').style.display     = esAdmin ? 'none'  : 'flex';
  document.getElementById('btn-usuarios').style.display = esAdmin ? 'flex' : 'none';
  document.getElementById('btn-reportes').style.display = esAdmin ? 'flex' : 'none'; 
  document.getElementById('chatbot-container').style.display = esAdmin ? 'none' : 'block';
  document.getElementById('btn-calificar').style.display = esAdmin ? 'none' : 'flex';
  // Soporte: en admin va al sidebar, en usuario va como flotante
  document.getElementById('btn-support').style.display         = esAdmin ? 'none'  : 'flex';
  document.getElementById('btn-support-admin').style.display   = esAdmin ? 'flex' : 'none';

  if (esAdmin) document.body.classList.add('is-admin');
}

// ADMIN — EDITAR POST
async function editarPost(id) {
  const post = allPosts.find(p => p.id_post === id);
  if (!post) return;

  document.getElementById('ep-title').value       = post.title;
  document.getElementById('ep-description').value = post.description;
  document.getElementById('ep-image').value       = post.image_url || '';
  document.getElementById('ep-id').value          = post.id_post;

  document.getElementById('edit-post-modal').style.display = 'flex';
}

function closeEditPostModal() {
  document.getElementById('edit-post-modal').style.display = 'none';
}

async function guardarEdicionPost() {
  const id          = document.getElementById('ep-id').value;
  const title       = document.getElementById('ep-title').value.trim();
  const description = document.getElementById('ep-description').value.trim();
  const image_url   = document.getElementById('ep-image').value.trim();
  const alertBox    = document.getElementById('edit-post-alert');

  if (!title || !description) {
  alertBox.className   = 'alert alert-danger';
  alertBox.textContent = 'Título y descripción son obligatorios.';
  return;
}

const errorEdit = validarPost(title, description);
if (errorEdit) {
  alertBox.className   = 'alert alert-danger';
  alertBox.textContent = errorEdit;
  return;
}

  try {
    const token = getToken();
    const res   = await fetch(`/api/posts/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title, description, image_url }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al guardar.';
      return;
    }

    closeEditPostModal();
    await cargarPosts();
    mostrarToast('Publicación actualizada ✅');

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Guardar cambios';
  }
}

// ADMIN — ELIMINAR POST
async function eliminarPost(id) {
  if (!confirm('¿Seguro que querés eliminar esta publicación?')) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/posts/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarToast('Error al eliminar la publicación ❌');
      return;
    }

    await cargarPosts();
    mostrarToast('Publicación eliminada ✅');

  } catch (err) {
    console.error(err);
    mostrarToast('No se pudo conectar con el servidor ❌');
  }
}

function mostrarError(mensaje) {
  const container = document.getElementById('posts-container');
  if (container) {
    container.innerHTML = `<p class="text-danger text-center w-100">${mensaje}</p>`;
  }
}

function validarPost(title, description) {
  if (title.length < 25) {
    return 'El título debe tener al menos 25 caracteres.';
  }
  if (title.length > 45) {
    return `El título no puede superar los 45 caracteres. Actualmente tiene ${title.length}.`;
  }
  if (description.length < 90) {
    return 'La descripción debe tener al menos 90 caracteres.';
  }
  if (description.length > 300) {
    return `La descripción no puede superar los 300 caracteres. Actualmente tiene ${description.length}.`;
  }
  return null;
}

function configurarContadores() {
  const cpTitle = document.getElementById('cp-title');
  const cpDesc  = document.getElementById('cp-description');
  const epTitle = document.getElementById('ep-title');
  const epDesc  = document.getElementById('ep-description');

  if (cpTitle) cpTitle.addEventListener('input', () => {
    document.getElementById('cp-title-count').textContent = `${cpTitle.value.length}/45`;
  });
  if (cpDesc) cpDesc.addEventListener('input', () => {
    document.getElementById('cp-desc-count').textContent = `${cpDesc.value.length}/300`;
  });
  if (epTitle) epTitle.addEventListener('input', () => {
    document.getElementById('ep-title-count').textContent = `${epTitle.value.length}/45`;
  });
  if (epDesc) epDesc.addEventListener('input', () => {
    document.getElementById('ep-desc-count').textContent = `${epDesc.value.length}/300`;
  });
}

// ADMIN — USUARIOS
let todosLosUsuarios = [];

function configurarBtnUsuarios() {
  const btn = document.getElementById('btn-usuarios');
  if (!btn) return;
  btn.addEventListener('click', () => abrirUsersModal());
}

async function abrirUsersModal() {
  document.getElementById('users-modal').style.display = 'flex';
  document.getElementById('user-search').value = '';
  await cargarUsuarios();
}

function closeUsersModal() {
  document.getElementById('users-modal').style.display = 'none';
}

async function cargarUsuarios() {
  try {
    const token = getToken();
    const res   = await fetch('/api/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    todosLosUsuarios = data.data || [];
    renderUsuarios(todosLosUsuarios);
  } catch (err) {
    console.error('Error al cargar usuarios:', err);
  }
}

function renderUsuarios(usuarios) {
  const list = document.getElementById('users-list');
  if (!list) return;
  list.innerHTML = '';

  if (usuarios.length === 0) {
    list.innerHTML = `<p style="color:#6b7280;text-align:center;font-size:14px;">No hay usuarios con publicaciones.</p>`;
    return;
  }

  usuarios.forEach(user => {
    const initials = (user.user_name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;align-items:center;gap:14px;
      padding:14px 16px;border-radius:16px;
      border:1px solid #e8edf5;background:white;
    `;
    card.innerHTML = `
      <div style="
        width:44px;height:44px;border-radius:50%;
        background:#ddf7f2;display:flex;align-items:center;
        justify-content:center;font-weight:600;font-size:14px;
        color:#20b39d;flex-shrink:0;overflow:hidden;
      ">
        ${user.avatar_url
          ? `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'">`
          : initials}
      </div>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:600;font-size:15px;color:#17212b;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${user.user_name}</p>
        <p style="font-size:13px;color:#6b7280;margin:2px 0 0;">${user.email} · <strong>${user.post_count}</strong> publicación${user.post_count !== 1 ? 'es' : ''}</p>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button class="btn-ver-posts" title="Ver publicaciones" style="
          width:34px;height:34px;border:none;border-radius:50%;
          background:#f0fdf9;color:#20b39d;cursor:pointer;font-size:16px;
          display:flex;align-items:center;justify-content:center;
        "><i class="bi bi-eye-fill"></i></button>
        <button class="btn-edit-user" title="Editar usuario" style="
          width:34px;height:34px;border:none;border-radius:50%;
          background:#e8f0ff;color:#3b82f6;cursor:pointer;font-size:14px;
          display:flex;align-items:center;justify-content:center;
        "><i class="bi bi-pencil-fill"></i></button>
        <button class="btn-delete-user" title="Eliminar usuario" style="
          width:34px;height:34px;border:none;border-radius:50%;
          background:#fee2e2;color:#ef4444;cursor:pointer;font-size:14px;
          display:flex;align-items:center;justify-content:center;
        "><i class="bi bi-trash-fill"></i></button>
      </div>
    `;

    card.querySelector('.btn-ver-posts').addEventListener('click', () => verPostsDeUsuario(user));
    card.querySelector('.btn-edit-user').addEventListener('click', () => abrirEditarUsuario(user));
    card.querySelector('.btn-delete-user').addEventListener('click', () => eliminarUsuario(user));

    list.appendChild(card);
  });
}

function filtrarUsuarios() {
  const query = document.getElementById('user-search').value.trim().toLowerCase();
  const filtrados = todosLosUsuarios.filter(u =>
    (u.user_name || '').toLowerCase().includes(query) ||
    (u.email     || '').toLowerCase().includes(query)
  );
  renderUsuarios(filtrados);
}

async function verPostsDeUsuario(user) {
  document.getElementById('user-posts-title').textContent    = `Publicaciones de ${user.user_name}`;
  document.getElementById('user-posts-subtitle').textContent = `${user.post_count} publicación${user.post_count !== 1 ? 'es' : ''} activa${user.post_count !== 1 ? 's' : ''}`;
  document.getElementById('user-posts-modal').style.display  = 'flex';
  document.getElementById('user-posts-list').innerHTML       = '<p style="color:#6b7280;text-align:center;">Cargando...</p>';

  try {
    const token = getToken();
    const res   = await fetch(`/api/users/${user.id_user}/posts`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderPostsDeUsuario(data.data || []);
  } catch (err) {
    console.error('Error al cargar posts del usuario:', err);
  }
}

function renderPostsDeUsuario(posts) {
  const list = document.getElementById('user-posts-list');
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `<p style="color:#6b7280;text-align:center;">Sin publicaciones.</p>`;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;gap:14px;padding:14px;
      border-radius:14px;border:1px solid #e8edf5;background:white;
    `;
    card.innerHTML = `
      <div style="
        width:70px;height:70px;border-radius:10px;
        overflow:hidden;flex-shrink:0;background:#ddf7f2;
        display:flex;align-items:center;justify-content:center;font-size:24px;
      ">
        ${post.image_url
          ? `<img src="${post.image_url}" style="width:100%;height:100%;object-fit:cover;">`
          : `<i class="bi bi-image" style="color:#20b39d;"></i>`}
      </div>
      <div style="flex:1;min-width:0;">
        <p style="font-weight:600;font-size:14px;color:#17212b;margin:0 0 4px;">${post.title}</p>
        <p style="font-size:12px;color:#3ed6bc;font-weight:600;margin:0 0 4px;">${post.category}</p>
        <p style="font-size:12px;color:#6b7280;margin:0;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${post.description}</p>
      </div>
    `;
    list.appendChild(card);
  });
}

function closeUserPostsModal() {
  document.getElementById('user-posts-modal').style.display = 'none';
}

function abrirEditarUsuario(user) {
  document.getElementById('eu-id').value   = user.id_user;
  document.getElementById('eu-name').value = user.user_name;
  document.getElementById('edit-user-alert').className = 'd-none';
  document.getElementById('edit-user-modal').style.display = 'flex';
}

function closeEditUserModal() {
  document.getElementById('edit-user-modal').style.display = 'none';
}

async function guardarEdicionUsuario() {
  const id       = document.getElementById('eu-id').value;
  const name     = document.getElementById('eu-name').value.trim();
  const alertBox = document.getElementById('edit-user-alert');

  if (!name) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'El nombre es obligatorio.';
    return;
  }

  try {
    const token = getToken();
    const res   = await fetch(`/api/users/${id}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al guardar.';
      return;
    }

    closeEditUserModal();
    await cargarUsuarios();
    mostrarToast('Usuario actualizado ✅');

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  }
}

async function eliminarUsuario(user) {
  if (!confirm(`¿Seguro que querés deshabilitar a ${user.user_name}? También se desactivarán sus publicaciones.`)) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/users/${user.id_user}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      mostrarToast('Error al deshabilitar usuario ❌');
      return;
    }

    await cargarUsuarios();
    mostrarToast('Usuario deshabilitado ✅');

  } catch (err) {
    console.error(err);
    mostrarToast('No se pudo conectar con el servidor ❌');
  }
}

let pollingInterval = null;

function iniciarPolling() {
  if (pollingInterval) return;
  pollingInterval = setInterval(async () => {
    await cargarTickets();
    if (ticketActivoId) {
      await cargarMensajes(ticketActivoId);
    }
  }, 5000);
}

function detenerPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

// MIS SERVICIOS (USUARIO)
function configurarBtnMisServicios() {
  const btn = document.getElementById('btn-mis-servicios');
  if (!btn) return;
  btn.addEventListener('click', () => abrirMisServicios());
}

async function abrirMisServicios() {
  document.getElementById('mis-servicios-modal').style.display = 'flex';
  await cargarMisServicios();
}

function closeMisServiciosModal() {
  document.getElementById('mis-servicios-modal').style.display = 'none';
}

async function cargarMisServicios() {
  try {
    const token = getToken();
    const res   = await fetch('/api/posts/my', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderMisServicios(data.data || []);
  } catch (err) {
    console.error('Error al cargar mis servicios:', err);
  }
}

function renderMisServicios(posts) {
  const pending  = posts.filter(p => p.is_active === 2);
  const approved = posts.filter(p => p.is_active === 1);
  const rejected = posts.filter(p => p.is_active === 3);
  const active   = posts.filter(p => p.is_active === 1);
  const inactive = posts.filter(p => p.is_active === 0);

  renderListaServicios('my-posts-pending',  pending,  'pending');
  renderListaServicios('my-posts-approved', approved, 'approved');
  renderListaServicios('my-posts-rejected', rejected, 'rejected');
  renderListaServicios('my-posts-active',   active,   'active');
  renderListaServicios('my-posts-inactive', inactive, 'inactive');
}

function renderListaServicios(containerId, posts, tipo) {
  const list = document.getElementById(containerId);
  if (!list) return;
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `<p class="empty-services">Sin publicaciones.</p>`;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.style.flexDirection = 'column';
    card.style.alignItems = 'flex-start';

    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display:flex;align-items:center;gap:14px;width:100%;';
    mainRow.innerHTML = `
      <div class="service-card-img">
        ${post.image_url
          ? `<img src="${post.image_url}" alt="${post.title}">`
          : `<i class="bi bi-image"></i>`}
      </div>
      <div class="service-card-info" style="flex:1;min-width:0;">
        <h4>${post.title}</h4>
        <p>${post.category}</p>
      </div>
      <div class="service-card-actions"></div>
    `;

    const actions = mainRow.querySelector('.service-card-actions');

    if (tipo === 'active') {
      const btn = document.createElement('button');
      btn.className   = 'btn-deactivate';
      btn.textContent = 'Desactivar';
      btn.addEventListener('click', () => cambiarEstadoMiPost(post.id_post, 0));
      actions.appendChild(btn);
    }

    if (tipo === 'inactive') {
      const btnActivar = document.createElement('button');
      btnActivar.className   = 'btn-approve';
      btnActivar.textContent = 'Activar';
      btnActivar.addEventListener('click', () => cambiarEstadoMiPost(post.id_post, 1));
      actions.appendChild(btnActivar);

      const btnEliminar = document.createElement('button');
      btnEliminar.className   = 'btn-delete-service';
      btnEliminar.textContent = 'Eliminar';
      btnEliminar.addEventListener('click', () => eliminarMiPost(post.id_post));
      actions.appendChild(btnEliminar);
    }

    card.appendChild(mainRow);

    if (tipo === 'rejected' && post.rejection_reason) {
      const motivo = document.createElement('div');
      motivo.style.cssText = `
        margin-top:10px;padding:8px 12px;
        background:#fef2f2;border-radius:10px;
        font-size:13px;color:#ef4444;width:100%;
        border:1px solid #fecaca;
      `;
      motivo.innerHTML = `<i class="bi bi-info-circle-fill me-1"></i> <strong>Motivo:</strong> ${post.rejection_reason}`;
      card.appendChild(motivo);
    }

    list.appendChild(card);
  });
}

async function cambiarEstadoMiPost(id, status) {
  const confirmMsg = status === 0 ? '¿Desactivar esta publicación?' : '¿Activar esta publicación?';
  if (!confirm(confirmMsg)) return;

  try {
    const token = getToken();
    await fetch(`/api/posts/${id}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    await cargarMisServicios();
    await cargarPosts();
    mostrarToast(status === 0 ? 'Publicación desactivada ✅' : 'Publicación activada ✅');
  } catch (err) {
    console.error(err);
  }
}

async function eliminarMiPost(id) {
  if (!confirm('¿Eliminar esta publicación? Esta acción no se puede deshacer.')) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/posts/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.ok) {
      await cargarMisServicios();
      await cargarPosts();
      mostrarToast('Publicación eliminada ✅');
    }
  } catch (err) {
    console.error(err);
  }
}

// ADMINISTRAR SERVICIOS (ADMIN)
function configurarBtnAdminServicios() {
  const btn = document.getElementById('btn-admin-servicios');
  if (!btn) return;
  btn.addEventListener('click', () => abrirAdminServicios());
}

async function abrirAdminServicios() {
  document.getElementById('admin-servicios-modal').style.display = 'flex';
  await cargarPostsPendientes();
}

function closeAdminServiciosModal() {
  document.getElementById('admin-servicios-modal').style.display = 'none';
}

async function cargarPostsPendientes() {
  try {
    const token = getToken();
    const res   = await fetch('/api/posts/pending', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderPostsPendientes(data.data || []);
  } catch (err) {
    console.error('Error al cargar posts pendientes:', err);
  }
}

function renderPostsPendientes(posts) {
  const list = document.getElementById('admin-pending-list');
  if (!list) return;
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = `<p class="empty-services" style="text-align:center;">No hay publicaciones pendientes de revisión.</p>`;
    return;
  }

  posts.forEach(post => {
    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-card-img">
        ${post.image_url
          ? `<img src="${post.image_url}" alt="${post.title}">`
          : `<i class="bi bi-image"></i>`}
      </div>
      <div class="service-card-info">
        <h4>${post.title}</h4>
        <p>${post.category} · <strong>${post.author}</strong></p>
        <p style="margin-top:3px;color:#9ba5b3;">${post.description.substring(0, 80)}...</p>
      </div>
      <div class="service-card-actions">
        <button class="btn-approve">Aprobar</button>
        <button class="btn-reject">Rechazar</button>
      </div>
    `;

    card.querySelector('.btn-approve').addEventListener('click', () => moderarPost(post.id_post, 1, card));
    card.querySelector('.btn-reject').addEventListener('click', () => abrirModalRechazo(post.id_post, card));

    list.appendChild(card);
  });
}

async function moderarPost(id, status, card) {
  const accion = status === 1 ? 'aprobar' : 'rechazar';
  if (!confirm(`¿Seguro que querés ${accion} esta publicación?`)) return;

  try {
    const token = getToken();
    const res   = await fetch(`/api/posts/${id}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (data.ok) {
      card.remove();
      await cargarPosts();
      mostrarToast(status === 1 ? 'Publicación aprobada ✅' : 'Publicación rechazada ❌');

      const list = document.getElementById('admin-pending-list');
      if (list && list.children.length === 0) {
        list.innerHTML = `<p class="empty-services" style="text-align:center;">No hay publicaciones pendientes.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// ===== ADMIN — REPORTES =====

let datosReporteActual = null;

function configurarBtnReportes() {
  const btn = document.getElementById('btn-reportes');
  if (!btn) return;
  btn.addEventListener('click', () => abrirReportesModal());
}

function closeReportesModal() {
  document.getElementById('admin-reports-modal').style.display = 'none';
}

async function abrirReportesModal() {
  document.getElementById('admin-reports-modal').style.display = 'flex';
  document.getElementById('admin-reports-body').innerHTML =
    `<p style="color:#9ba5b3;text-align:center;">Cargando estadísticas...</p>`;

  try {
    const token = getToken();

    const [resUsers, resTickets] = await Promise.all([
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/support/admin/tickets', { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const usuarios = (await resUsers.json()).data || [];
    const tickets  = (await resTickets.json()).data || [];

    const totalUsuarios = usuarios.length;
    const totalPosts    = allPosts.length;

    const conteoCategorias = {};
    allPosts.forEach(p => {
      const cat = p.category || 'Sin categoría';
      conteoCategorias[cat] = (conteoCategorias[cat] || 0) + 1;
    });

    const categoriasOrdenadas = Object.entries(conteoCategorias).sort((a, b) => b[1] - a[1]);
    const categoriaTop = categoriasOrdenadas[0] ? categoriasOrdenadas[0][0] : 'Sin datos';

    const ticketsAbiertos = tickets.filter(t => t.status === 'OPEN').length;
    const ticketsCerrados = tickets.filter(t => t.status === 'CLOSED').length;

    datosReporteActual = {
      totalUsuarios, totalPosts, categoriaTop,
      categoriasOrdenadas, ticketsAbiertos, ticketsCerrados,
      totalTickets: tickets.length,
    };

    renderReportes(datosReporteActual);
  } catch (err) {
    console.error('Error al cargar reportes:', err);
    document.getElementById('admin-reports-body').innerHTML =
      `<p style="color:#dc2626;text-align:center;">Error al cargar las estadísticas.</p>`;
  }
}

function renderReportes(d) {
  const maxCat = d.categoriasOrdenadas.length ? d.categoriasOrdenadas[0][1] : 1;

  const barrasHtml = d.categoriasOrdenadas.map(([cat, count]) => `
    <div class="report-bar-row">
      <span class="report-bar-label">${cat}</span>
      <div class="report-bar-track">
        <div class="report-bar-fill" style="width:${(count / maxCat) * 100}%;"></div>
      </div>
      <span class="report-bar-count">${count}</span>
    </div>
  `).join('');

  document.getElementById('admin-reports-body').innerHTML = `
    <div class="report-stats-grid">
      <div class="report-stat-card">
        <span class="stat-label">Usuarios con publicaciones</span>
        <span class="stat-value">${d.totalUsuarios}</span>
      </div>
      <div class="report-stat-card">
        <span class="stat-label">Total de publicaciones</span>
        <span class="stat-value">${d.totalPosts}</span>
      </div>
      <div class="report-stat-card">
        <span class="stat-label">Categoría más popular</span>
        <span class="stat-value small">${d.categoriaTop}</span>
      </div>
      <div class="report-stat-card">
        <span class="stat-label">Consultas de soporte</span>
        <span class="stat-value small">${d.ticketsAbiertos} abiertas · ${d.ticketsCerrados} cerradas</span>
      </div>
    </div>

    <h3 class="report-section-title">Publicaciones por categoría</h3>
    ${barrasHtml || '<p style="color:#9ba5b3;">Sin publicaciones aún.</p>'}
  `;
}

function descargarReportePDF() {
  if (!datosReporteActual) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const d = datosReporteActual;
  const fecha = new Date().toLocaleDateString('es-AR');

  let y = 20;

  doc.setFontSize(18);
  doc.text('FIVOX — Reporte estadístico general', 14, y);
  y += 8;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Generado el ${fecha}`, 14, y);
  doc.setTextColor(0);
  y += 14;

  doc.setFontSize(13);
  doc.text('Resumen general', 14, y);
  y += 8;

  doc.setFontSize(11);
  const resumen = [
    `Usuarios con publicaciones activas: ${d.totalUsuarios}`,
    `Total de publicaciones: ${d.totalPosts}`,
    `Categoría más popular: ${d.categoriaTop}`,
    `Consultas de soporte abiertas: ${d.ticketsAbiertos}`,
    `Consultas de soporte cerradas: ${d.ticketsCerrados}`,
    `Total de consultas de soporte: ${d.totalTickets}`,
  ];
  resumen.forEach(linea => {
    doc.text(`• ${linea}`, 16, y);
    y += 7;
  });

  y += 8;
  doc.setFontSize(13);
  doc.text('Publicaciones por categoría', 14, y);
  y += 10;

  const maxCat = d.categoriasOrdenadas.length ? d.categoriasOrdenadas[0][1] : 1;
  const anchoMaximoBarra = 100;

  d.categoriasOrdenadas.forEach(([cat, count]) => {
    doc.setFontSize(10);
    doc.text(cat, 16, y + 4);
    doc.text(String(count), 190, y + 4, { align: 'right' });

    const anchoBarra = (count / maxCat) * anchoMaximoBarra;
    doc.setFillColor(62, 214, 188);
    doc.roundedRect(70, y, anchoBarra, 5, 1.5, 1.5, 'F');

    y += 10;

    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(`reporte-fivox-${fecha.replace(/\//g, '-')}.pdf`);
}

let postARecharId  = null;
let cardARemover   = null;

function abrirModalRechazo(id, card) {
  postARecharId = id;
  cardARemover  = card;
  document.getElementById('reject-reason').value = '';
  document.getElementById('reject-alert').className = 'd-none';
  document.getElementById('reject-reason-modal').style.display = 'flex';
}

function closeRejectModal() {
  document.getElementById('reject-reason-modal').style.display = 'none';
  postARecharId = null;
  cardARemover  = null;
}

async function confirmarRechazo() {
  const reason   = document.getElementById('reject-reason').value.trim();
  const alertBox = document.getElementById('reject-alert');

  if (!reason) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'El motivo es obligatorio.';
    return;
  }

  try {
    const token = getToken();
    const res   = await fetch(`/api/posts/${postARecharId}/status`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: 3, reason }),
    });
    const data = await res.json();
    if (data.ok) {
      if (cardARemover) cardARemover.remove();
      closeRejectModal();
      await cargarPosts();
      mostrarToast('Publicación rechazada ❌');

      const list = document.getElementById('admin-pending-list');
      if (list && list.children.length === 0) {
        list.innerHTML = `<p class="empty-services" style="text-align:center;">No hay publicaciones pendientes.</p>`;
      }
    }
  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  }
}


let selectedStar = 0;
let postActivoModal = null;

const STAR_LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', '¡Excelente!'];

function openModal(post) {
  postActivoModal = post;

  document.getElementById('modal-title').textContent       = post.title;
  document.getElementById('modal-author').textContent      = post.author;
  document.getElementById('modal-description').textContent = post.description;
  document.getElementById('modal-image').src               = post.image_url || '';
  document.getElementById('modal-image').style.display     = post.image_url ? 'block' : 'none';

  // Ocultar contacto inicialmente
  document.getElementById('modal-contact-info').style.display = 'none';
  document.getElementById('btn-contratar').innerHTML = '<i class="bi bi-telephone-fill me-2"></i>Contratar servicio';

  // Rating
  const ratingEl = document.getElementById('modal-rating');
  if (ratingEl) {
    if (post.avg_rating && post.total_reviews > 0) {
      ratingEl.innerHTML = `${'⭐'.repeat(Math.round(post.avg_rating))} <span style="font-size:13px;color:#6b7280;">${post.avg_rating} (${post.total_reviews} reseña${post.total_reviews !== 1 ? 's' : ''})</span>`;
      ratingEl.style.display = 'block';
    } else {
      ratingEl.style.display = 'none';
    }
  }

  const avatarImg = document.getElementById('modal-author-avatar');
  if (post.author_avatar) {
    avatarImg.src = post.author_avatar;
    avatarImg.style.display = 'block';
  } else {
    avatarImg.style.display = 'none';
  }

  document.getElementById('modal-phone').textContent = post.author_phone ? `📞 ${post.author_phone}` : '';
  document.getElementById('modal-email').textContent = post.author_email ? `✉️ ${post.author_email}` : '';

  // Compartir por WhatsApp (solo usuario, no admin)
  const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
  const user = JSON.parse(userRaw);
  const esAdmin = user.role === 'ADMIN';

  const btnShare = document.getElementById('btn-share-whatsapp');
  if (!esAdmin) {
    const contacto = post.author_phone ? `\nContacto: ${post.author_phone}` : '';
    const texto = `*${post.title}*\n${post.description}\n\nPublicado por ${post.author} en FIVOX${contacto}`;
    btnShare.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    btnShare.style.display = 'flex';
  } else {
    btnShare.style.display = 'none';
  }

  document.getElementById('post-modal').style.display = 'flex';
}


async function contratarServicio() {
  const contactInfo = document.getElementById('modal-contact-info');
  const btn         = document.getElementById('btn-contratar');

  if (contactInfo.style.display === 'none') {
    contactInfo.style.display = 'block';
    btn.innerHTML = '<i class="bi bi-telephone-fill me-2"></i>Ocultar contacto';

    // Registrar contacto en BD
    if (postActivoModal) {
      try {
        const token = getToken();
        await fetch('/api/reviews/contact', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id_post: postActivoModal.id_post }),
        });
      } catch (err) {
        console.error('Error al registrar contacto:', err);
      }
    }
  } else {
    contactInfo.style.display = 'none';
    btn.innerHTML = '<i class="bi bi-telephone-fill me-2"></i>Contratar servicio';
  }
}


// Mostrar rating en la tarjeta del post
function renderPosts(posts) {
  const container = document.getElementById('posts-container');
  if (!container) return;
  container.innerHTML = '';

  if (posts.length === 0) {
    container.innerHTML = `<p class="text-muted text-center w-100">No hay publicaciones disponibles.</p>`;
    return;
  }

  posts.forEach(post => {
    const userRaw = localStorage.getItem('fivox_user') || sessionStorage.getItem('fivox_user') || '{}';
    const user    = JSON.parse(userRaw);
    const esAdmin = user.role === 'ADMIN';

    const starsHtml = post.avg_rating && post.total_reviews > 0
      ? `<div class="post-rating">
           <i class="bi bi-star-fill"></i>
           <span>${post.avg_rating}</span>
           <span style="color:#9ba5b3;">(${post.total_reviews})</span>
         </div>`
      : '';

    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-lg-3';
    col.innerHTML = `
      <div class="post">
        <div class="post-image">
          ${post.image_url
            ? `<img src="${post.image_url}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;">`
            : `<i class="bi bi-image"></i>`}
        </div>
        <div class="post-content">
          <h4>${post.title}</h4>
          <div class="post-footer">
            <span>${post.author}</span>
            ${starsHtml}
            ${esAdmin ? `
              <div class="post-admin-btns">
                <button class="btn-edit-post" onclick="editarPost(${post.id_post})">
                  <i class="bi bi-pencil-fill"></i>
                </button>
                <button class="btn-delete-post" onclick="eliminarPost(${post.id_post})">
                  <i class="bi bi-trash-fill"></i>
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
    col.querySelector('.post').addEventListener('click', (e) => {
      if (e.target.closest('.post-admin-btns')) return;
      openModal(post);
    });
    container.appendChild(col);
  });
}

// CALIFICAR SERVICIOS
function configurarBtnCalificar() {
  const btn = document.getElementById('btn-calificar');
  if (!btn) return;
  btn.addEventListener('click', () => abrirCalificarModal());
}

async function abrirCalificarModal() {
  document.getElementById('calificar-modal').style.display = 'flex';
  await cargarMisContactos();
}

function closeCalificarModal() {
  document.getElementById('calificar-modal').style.display = 'none';
}

async function cargarMisContactos() {
  try {
    const token = getToken();
    const res   = await fetch('/api/reviews/my-contacts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    renderMisContactos(data.data || []);
  } catch (err) {
    console.error('Error al cargar contactos:', err);
  }
}

function renderMisContactos(contactos) {
  const list = document.getElementById('calificar-list');
  if (!list) return;
  list.innerHTML = '';

  if (contactos.length === 0) {
    list.innerHTML = `<p style="color:#6b7280;text-align:center;font-size:14px;">No contactaste ningún servicio aún.</p>`;
    return;
  }

  contactos.forEach(c => {
    const fecha         = new Date(c.contacted_at).toLocaleDateString('es-AR');
    const puedeCalificar = Number(c.days_since_contact) >= 3 && !c.already_reviewed;
    const yaReseño      = c.already_reviewed > 0;
    const diasFaltan    = 3 - Number(c.days_since_contact);

    const card = document.createElement('div');
    card.className = 'service-card';
    card.innerHTML = `
      <div class="service-card-img">
        ${c.post_image
          ? `<img src="${c.post_image}" alt="${c.post_title}">`
          : `<i class="bi bi-image"></i>`}
      </div>
      <div class="service-card-info" style="flex:1;min-width:0;">
        <h4>${c.post_title}</h4>
        <p>${c.author_name} · Contactado el ${fecha}</p>
        ${yaReseño
          ? `<p style="color:#16a34a;font-size:12px;"><i class="bi bi-check-circle-fill"></i> Ya calificaste este servicio</p>`
          : !puedeCalificar
            ? `<p style="color:#9ba5b3;font-size:12px;"><i class="bi bi-clock"></i> Disponible en ${diasFaltan} día${diasFaltan !== 1 ? 's' : ''}</p>`
            : ''}
      </div>
      <div class="service-card-actions" style="flex-direction:column;gap:6px;">
        <button class="btn-approve" 
          ${!puedeCalificar || yaReseño ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}
          onclick="abrirReviewModal(${c.id_contact}, ${c.id_post}, '${c.post_title.replace(/'/g, "\\'")}')">
          <i class="bi bi-star-fill me-1"></i> Calificar
        </button>
        <button class="btn-delete-service"
          onclick="descartarContacto(${c.id_contact})">
          No tomé este servicio
        </button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function descartarContacto(id) {
  if (!confirm('¿Descartás este servicio de tu lista?')) return;
  try {
    const token = getToken();
    await fetch(`/api/reviews/contact/${id}/discard`, {
      method:  'PUT',
      headers: { Authorization: `Bearer ${token}` },
    });
    await cargarMisContactos();
  } catch (err) {
    console.error(err);
  }
}

function abrirReviewModal(idContact, idPost, postTitle) {
  selectedStar = 0;
  document.getElementById('review-id-contact').value  = idContact;
  document.getElementById('review-id-post').value     = idPost;
  document.getElementById('review-post-name').textContent = postTitle;
  document.getElementById('review-alert').className   = 'd-none';
  document.getElementById('star-label').textContent   = '';
  document.querySelectorAll('.star-btn').forEach(b => {
    b.innerHTML = '<i class="bi bi-star"></i>';
    b.classList.remove('active');
  });
  document.getElementById('review-modal').style.display = 'flex';
}

function closeReviewModal() {
  document.getElementById('review-modal').style.display = 'none';
}

function selectStar(value) {
  selectedStar = value;
  document.getElementById('star-label').textContent = STAR_LABELS[value];
  document.querySelectorAll('.star-btn').forEach(btn => {
    const v = Number(btn.dataset.value);
    btn.innerHTML = v <= value ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
    btn.classList.toggle('active', v <= value);
  });
}

async function enviarResena() {
  const id_contact = document.getElementById('review-id-contact').value;
  const id_post    = document.getElementById('review-id-post').value;
  const alertBox   = document.getElementById('review-alert');

  if (!selectedStar) {
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'Seleccioná una cantidad de estrellas.';
    return;
  }

  const btn = document.getElementById('btn-submit-review');
  btn.disabled    = true;
  btn.textContent = 'Publicando...';

  try {
    const token = getToken();
    const res   = await fetch('/api/reviews', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id_contact, id_post, rating: selectedStar }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      alertBox.className   = 'alert alert-danger';
      alertBox.textContent = data.message || 'Error al publicar la reseña.';
      return;
    }

    closeReviewModal();
    await cargarMisContactos();
    await cargarPosts();
    mostrarToast('¡Reseña publicada! ⭐');

  } catch (err) {
    console.error(err);
    alertBox.className   = 'alert alert-danger';
    alertBox.textContent = 'No se pudo conectar con el servidor.';
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Publicar reseña';
  }
}
