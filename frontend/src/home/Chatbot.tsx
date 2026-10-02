import { useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';

type ChatbotAction = {
  label: string;
  type: 'focus-search' | 'open-profile' | 'open-create' | 'open-support' | 'open-my-services' | 'open-reviews' | 'open-terms';
};

type Intent = {
  patterns: RegExp[];
  keywords: string[];
  answer: string;
  action?: ChatbotAction;
};

type Message = {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  action?: ChatbotAction;
};

type ChatbotProps = {
  searchRef: RefObject<HTMLInputElement | null>;
  onAction: (label: string) => void;
};

const intents: Intent[] = [
  { patterns: [/\b(contacto|contactar|contactarme|comunicarme|hablar|contratar)\b.*\b(prestador|proveedor|profesional|servicio)\b/, /\b(datos|telefono|email|correo)\b.*\b(prestador|proveedor|profesional)\b/], keywords: ['contactar prestador', 'contacto prestador', 'contactar proveedor', 'datos del prestador', 'contratar servicio'], answer: 'Para contactar a un prestador:\n1. Buscá el servicio que te interesa.\n2. Abrí la publicación.\n3. Allí vas a encontrar el teléfono y el email que haya informado.', action: { label: 'Buscar un servicio', type: 'focus-search' } },
  { patterns: [/\b(olvide|olvidada|recuperar|recupero|restablecer|no recuerdo)\b.*\b(contrasena|clave|password)\b/], keywords: ['recuperar contraseña', 'olvide mi clave', 'no recuerdo mi contraseña'], answer: 'Para recuperar el acceso, cerrá la sesión si todavía está abierta. En el ingreso elegí “¿Olvidaste tu contraseña?”, ingresá tu email y seguí los pasos del código de verificación.' },
  { patterns: [/\b(cambiar|actualizar|modificar)\b.*\b(contrasena|clave|password)\b/], keywords: ['contraseña', 'password', 'clave'], answer: 'Para cambiar tu contraseña, abrí tu perfil, bajá hasta “Cambiar contraseña”, completá la contraseña actual y la nueva, y guardá los cambios.', action: { label: 'Abrir mi perfil', type: 'open-profile' } },
  { patterns: [/\b(editar|cambiar|actualizar|modificar)\b.*\b(perfil|nombre|foto|telefono|avatar)\b/], keywords: ['perfil', 'editar perfil', 'información personal'], answer: 'Para editar tu perfil, abrí el ícono de persona, modificá los datos necesarios y tocá “Guardar cambios”.', action: { label: 'Abrir mi perfil', type: 'open-profile' } },
  { patterns: [/\b(publicar|agregar|crear|subir)\b.*\b(servicio|publicacion|aviso)\b/], keywords: ['cómo publico', 'nuevo servicio', 'crear publicación'], answer: 'Para publicar un servicio, tocá el botón “+”, completá título, descripción, imagen y categoría, y elegí “Publicar”. Quedará pendiente hasta que un administrador lo revise.', action: { label: 'Crear una publicación', type: 'open-create' } },
  { patterns: [/\b(publicacion|servicio)\b.*\b(no aparece|no se ve|pendiente|revision|rechazada|rechazado)\b/], keywords: ['no se ve', 'no aparece', 'publicación pendiente', 'estado de publicación'], answer: 'Las publicaciones pasan por revisión antes de mostrarse. Podés consultar si está pendiente, aprobada o rechazada desde “Mis Servicios”.', action: { label: 'Ver Mis Servicios', type: 'open-my-services' } },
  { patterns: [/\b(cuanto tarda|demora|cuando se aprueba|tiempo de aprobacion)\b/], keywords: ['cuánto tarda', 'tiempo aprobación'], answer: 'El tiempo estimado de aprobación es de 24 a 48 horas hábiles. Si se supera ese plazo, abrí un ticket de soporte.', action: { label: 'Abrir soporte', type: 'open-support' } },
  { patterns: [/\b(buscar|encontrar|necesito)\b.*\b(servicio|prestador|proveedor|profesional|plomero|docente|programador)\b/], keywords: ['buscar servicio', 'encontrar profesional'], answer: 'Escribí el servicio o profesional en el buscador. También podés tocar una categoría para filtrar las publicaciones.', action: { label: 'Ir al buscador', type: 'focus-search' } },
  { patterns: [/\b(contactar|contacto|hablar|ayuda)\b.*\b(fivox|equipo|administrador|admin|soporte)\b/, /\b(crear|abrir|ver|responder|cerrar)\b.*\b(ticket|consulta|soporte)\b/], keywords: ['contactar fivox', 'equipo fivox', 'soporte fivox', 'ticket', 'mis consultas'], answer: 'En Soporte podés crear una consulta, ver las respuestas y continuar la conversación con el equipo de FIVOX.', action: { label: 'Abrir soporte', type: 'open-support' } },
  { patterns: [/\b(calificar|valorar|resena|estrellas)\b/], keywords: ['calificar servicio', 'dejar reseña'], answer: 'Podés calificar un servicio desde “Calificar servicios” después de haber contactado al prestador.', action: { label: 'Ver servicios para calificar', type: 'open-reviews' } },
  { patterns: [/\b(reportar|denunciar|inapropiada|inadecuado)\b/], keywords: ['reportar publicación', 'contenido inadecuado'], answer: 'Para reportar una publicación, abrí Soporte y creá un ticket indicando el título del servicio y el motivo.', action: { label: 'Reportar en soporte', type: 'open-support' } },
  { patterns: [/\b(terminos|condiciones|politicas|reglas)\b/], keywords: ['términos y condiciones'], answer: 'Podés consultar las reglas de uso desde “Términos y Condiciones” en el menú lateral.', action: { label: 'Ver términos', type: 'open-terms' } },
  { patterns: [/\b(rol|roles|permisos|administrador|admin|tipo de usuario)\b/], keywords: ['qué puede hacer un usuario', 'qué hace un administrador'], answer: 'El rol de usuario permite buscar, publicar y contactar servicios, calificar y usar soporte. Los administradores gestionan usuarios, publicaciones, reportes, términos y tickets.' },
  { patterns: [/\b(cerrar sesion|logout|salir|desconectar)\b/], keywords: ['cómo cierro sesión'], answer: 'Para cerrar sesión, usá el botón rojo “Cerrar sesión” del menú lateral.' },
  { patterns: [/\b(error|bug|falla|no funciona|problema tecnico)\b/], keywords: ['problema técnico'], answer: 'Si encontraste un error, abrí un ticket de soporte e indicá qué estabas haciendo, qué esperabas que ocurriera y qué ocurrió finalmente.', action: { label: 'Informar el problema', type: 'open-support' } },
  { patterns: [/^(hola|buen dia|buenas|hey|que tal)$/], keywords: [], answer: '¡Hola! Puedo ayudarte a buscar o publicar servicios, contactar prestadores, administrar tu perfil y usar soporte.' },
  { patterns: [/\b(gracias|muchas gracias|genial|perfecto)\b/], keywords: [], answer: '¡De nada! Si necesitás algo más sobre FIVOX, escribime.' },
];

const quickReplies = ['¿Cómo contacto a un prestador?', '¿Cómo publico un servicio?', '¿Cómo recupero mi contraseña?', 'Tengo un problema técnico'];
const fallback: Omit<Message, 'id' | 'sender'> = { text: 'Todavía no tengo una respuesta precisa para eso. Puedo ayudarte con publicaciones, prestadores, perfil, contraseña, calificaciones o soporte.', action: { label: 'Abrir soporte', type: 'open-support' } };

function normalize(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function responseFor(value: string) {
  const normalized = normalize(value);
  const match = intents.find((intent) => intent.patterns.some((pattern) => pattern.test(normalized)) || intent.keywords.some((keyword) => normalized.includes(normalize(keyword))));
  return match ? { text: match.answer, action: match.action } : fallback;
}

export function Chatbot({ searchRef, onAction }: ChatbotProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [messages, setMessages] = useState<Message[]>([{ id: 1, sender: 'bot', text: '¡Hola! Soy tu asistente FIVOX. ¿Cómo puedo ayudarte hoy?' }]);
  const nextId = useRef(2);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ block: 'end' }); }, [messages, open]);

  function send(text: string) {
    const clean = text.trim();
    if (!clean) return;
    const response = responseFor(clean);
    setMessages((current) => [...current, { id: nextId.current++, sender: 'user', text: clean }, { id: nextId.current++, sender: 'bot', ...response }]);
    setShowQuickReplies(false);
    setDraft('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    send(draft);
  }

  function runAction(action: ChatbotAction) {
    setOpen(false);
    if (action.type === 'focus-search') {
      searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      searchRef.current?.focus();
      return;
    }
    const labels: Record<Exclude<ChatbotAction['type'], 'focus-search'>, string> = {
      'open-profile': 'Mi perfil',
      'open-create': 'Crear publicación',
      'open-support': 'Soporte',
      'open-my-services': 'Mis Servicios',
      'open-reviews': 'Calificar servicios',
      'open-terms': 'Términos y Condiciones',
    };
    onAction(labels[action.type]);
  }

  return (
    <>
      <section className={open ? 'chatbot-panel is-open' : 'chatbot-panel'} role="dialog" aria-modal="false" aria-label="Asistente FIVOX" aria-hidden={!open}>
        <header className="chatbot-header"><span className="chatbot-avatar"><i className="bi bi-robot" aria-hidden="true" /></span><div><strong>Asistente FIVOX</strong><small>Ayuda rápida</small></div><button type="button" aria-label="Cerrar asistente" onClick={() => setOpen(false)}><i className="bi bi-x-lg" /></button></header>
        <div className="chatbot-messages" role="log" aria-live="polite">
          {messages.map((message) => <div className={`chatbot-message is-${message.sender}`} key={message.id}><p>{message.text}</p>{message.action && <button type="button" onClick={() => runAction(message.action!)}>{message.action.label}</button>}</div>)}
          <div ref={messagesEnd} />
        </div>
        {showQuickReplies && <div className="chatbot-quick-replies">{quickReplies.map((reply) => <button type="button" key={reply} onClick={() => send(reply)}>{reply}</button>)}</div>}
        <form className="chatbot-composer" onSubmit={submit}><input aria-label="Mensaje para el asistente" placeholder="Escribí tu mensaje…" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit" aria-label="Enviar mensaje" disabled={!draft.trim()}><i className="bi bi-send-fill" /></button></form>
      </section>
      <button className="chatbot-toggle" type="button" aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'} aria-expanded={open} onClick={() => setOpen((current) => !current)}><i className={open ? 'bi bi-x-lg' : 'bi bi-robot'} aria-hidden="true" /></button>
    </>
  );
}
