const CHATBOT_INTENTS = [
    {
        id: 'contact-provider',
        patterns: [
            /\b(contacto|contactar|contactarme|comunicarme|hablar|contratar)\b.*\b(prestador|proveedor|profesional|servicio)\b/,
            /\b(datos|telefono|email|correo)\b.*\b(prestador|proveedor|profesional)\b/,
        ],
        keywords: ['contactar prestador', 'contacto prestador', 'contactar proveedor', 'datos del prestador', 'contratar servicio'],
        answer: '📞 Para contactar a un prestador:\n1. Buscá el servicio que te interesa en el inicio.\n2. Abrí la publicación.\n3. Tocá “Contratar servicio”.\n4. Ahí se muestran el teléfono y el email que el prestador haya informado.',
        action: { label: 'Buscar un servicio', type: 'focus-search' },
    },
    {
        id: 'forgot-password',
        patterns: [/\b(olvide|olvidada|recuperar|recupero|restablecer|no recuerdo)\b.*\b(contrasena|clave|password)\b/],
        keywords: ['recuperar contraseña', 'olvide mi clave', 'no recuerdo mi contraseña'],
        answer: '🔑 Para recuperar el acceso, cerrá la sesión si todavía está abierta. En la pantalla de ingreso elegí “¿Olvidaste tu contraseña?”, ingresá tu email y seguí los pasos del código de verificación.',
    },
    {
        id: 'change-password',
        patterns: [/\b(cambiar|actualizar|modificar)\b.*\b(contrasena|clave|password)\b/],
        keywords: ['contraseña', 'password', 'clave'],
        answer: '🔐 Para cambiar tu contraseña:\n1. Abrí tu perfil.\n2. Bajá hasta “Cambiar contraseña”.\n3. Ingresá la contraseña actual y la nueva.\n4. Guardá los cambios.',
        action: { label: 'Abrir mi perfil', type: 'open-profile' },
    },
    {
        id: 'edit-profile',
        patterns: [/\b(editar|cambiar|actualizar|modificar)\b.*\b(perfil|nombre|foto|telefono|avatar)\b/],
        keywords: ['perfil', 'editar perfil', 'información personal'],
        answer: '👤 Para editar tu perfil, abrí el ícono de persona, modificá los datos necesarios y tocá “Guardar cambios”.',
        action: { label: 'Abrir mi perfil', type: 'open-profile' },
    },
    {
        id: 'publish-service',
        patterns: [/\b(publicar|agregar|crear|subir)\b.*\b(servicio|publicacion|aviso)\b/],
        keywords: ['cómo publico', 'nuevo servicio', 'crear publicación'],
        answer: '📝 Para publicar un servicio, tocá el botón “+”, completá título, descripción, imagen y categoría, y elegí “Publicar”. La publicación quedará pendiente hasta que un administrador la revise.',
        action: { label: 'Crear una publicación', type: 'open-create' },
    },
    {
        id: 'pending-post',
        patterns: [/\b(publicacion|servicio)\b.*\b(no aparece|no se ve|pendiente|revision|rechazada|rechazado)\b/],
        keywords: ['no se ve', 'no aparece', 'publicación pendiente', 'estado de publicación'],
        answer: '⏳ Las publicaciones pasan por revisión antes de mostrarse. Podés consultar si está pendiente, aprobada o rechazada desde “Mis Servicios”.',
        action: { label: 'Ver Mis Servicios', type: 'open-my-services' },
    },
    {
        id: 'approval-time',
        patterns: [/\b(cuanto tarda|demora|cuando se aprueba|tiempo de aprobacion)\b/],
        keywords: ['cuánto tarda', 'tiempo aprobación'],
        answer: '⏱️ El tiempo estimado de aprobación es de 24 a 48 horas hábiles. Si se supera ese plazo, abrí un ticket de soporte.',
        action: { label: 'Abrir soporte', type: 'open-support' },
    },
    {
        id: 'search-service',
        patterns: [/\b(buscar|encontrar|necesito)\b.*\b(servicio|prestador|proveedor|profesional|plomero|docente|programador)\b/],
        keywords: ['buscar servicio', 'encontrar profesional'],
        answer: '🔎 Escribí el servicio o profesional en el buscador del inicio. También podés tocar una categoría para filtrar las publicaciones.',
        action: { label: 'Ir al buscador', type: 'focus-search' },
    },
    {
        id: 'contact-support',
        patterns: [/\b(contactar|contacto|hablar|ayuda)\b.*\b(fivox|equipo|administrador|admin|soporte)\b/],
        keywords: ['contactar fivox', 'equipo fivox', 'soporte fivox', 'hablar con un admin'],
        answer: '📬 Para contactar al equipo de FIVOX, abrí Soporte, creá una consulta y explicá lo ocurrido. Un administrador te responderá dentro del mismo ticket.',
        action: { label: 'Abrir soporte', type: 'open-support' },
    },
    {
        id: 'support-ticket',
        patterns: [/\b(crear|abrir|ver|responder|cerrar)\b.*\b(ticket|consulta|soporte)\b/],
        keywords: ['ticket', 'soporte', 'mis consultas'],
        answer: '💬 En Soporte podés crear una consulta, ver las respuestas y continuar la conversación hasta que el caso se cierre.',
        action: { label: 'Abrir soporte', type: 'open-support' },
    },
    {
        id: 'reviews',
        patterns: [/\b(calificar|valorar|resena|estrellas)\b.*\b(servicio|prestador|contacto)?\b/],
        keywords: ['calificar servicio', 'dejar reseña'],
        answer: '⭐ Podés calificar un servicio desde “Calificar servicios” después de haber contactado al prestador y cuando se habilite la opción.',
        action: { label: 'Ver servicios para calificar', type: 'open-reviews' },
    },
    {
        id: 'report-post',
        patterns: [/\b(reportar|denunciar|inapropiada|inadecuado)\b.*\b(publicacion|servicio|contenido)?\b/],
        keywords: ['reportar publicación', 'contenido inadecuado'],
        answer: '🚩 Para reportar una publicación, abrí Soporte y creá un ticket indicando el título del servicio y el motivo del reporte.',
        action: { label: 'Reportar en soporte', type: 'open-support' },
    },
    {
        id: 'terms',
        patterns: [/\b(terminos|condiciones|politicas|reglas)\b/],
        keywords: ['términos y condiciones'],
        answer: '📄 Podés consultar las reglas de uso desde “Términos y Condiciones” en el menú lateral.',
        action: { label: 'Ver términos', type: 'open-terms' },
    },
    {
        id: 'roles-and-permissions',
        patterns: [/\b(rol|roles|permisos|administrador|admin|tipo de usuario)\b/],
        keywords: ['qué puede hacer un usuario', 'qué hace un administrador'],
        answer: '🛡️ El rol USER puede buscar, publicar y contactar servicios, calificar y usar soporte. El rol ADMIN administra usuarios, publicaciones, reportes, términos y tickets. Algunas opciones solo aparecen para el rol correspondiente.',
    },
    {
        id: 'logout',
        patterns: [/\b(cerrar sesion|logout|salir|desconectar)\b/],
        keywords: ['cómo cierro sesión'],
        answer: '👋 Para cerrar sesión, usá el botón rojo “Cerrar sesión” del menú lateral.',
    },
    {
        id: 'technical-problem',
        patterns: [/\b(error|bug|falla|no funciona|problema tecnico)\b/],
        keywords: ['problema técnico'],
        answer: '🛠️ Si encontraste un error, abrí un ticket de soporte e indicá qué estabas haciendo, qué esperabas que ocurriera y qué ocurrió finalmente.',
        action: { label: 'Informar el problema', type: 'open-support' },
    },
    {
        id: 'greeting',
        patterns: [/^(hola|buen dia|buenas|hey|que tal)$/],
        keywords: [],
        answer: '¡Hola! 👋 Puedo ayudarte a buscar o publicar servicios, contactar prestadores, administrar tu perfil y usar soporte.',
    },
    {
        id: 'thanks',
        patterns: [/\b(gracias|muchas gracias|genial|perfecto)\b/],
        keywords: [],
        answer: '¡De nada! 😊 Si necesitás algo más sobre FIVOX, escribime.',
    },
];

const QUICK_REPLIES = [
    '¿Cómo contacto a un prestador?',
    '¿Cómo publico un servicio?',
    '¿Cómo recupero mi contraseña?',
    'Tengo un problema técnico',
];

const DEFAULT_RESPONSE = {
    id: 'fallback',
    answer: '🤔 Todavía no tengo una respuesta precisa para eso. Puedo ayudarte con publicaciones, contacto a prestadores, perfil, contraseña, calificaciones o soporte. Si tu consulta es distinta, creá un ticket.',
    action: { label: 'Abrir soporte', type: 'open-support' },
};

function normalizeChatText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getBotResponse(message) {
    const normalized = normalizeChatText(message);
    if (!normalized) return DEFAULT_RESPONSE;

    const intent = CHATBOT_INTENTS.find((item) => {
        const matchesPattern = item.patterns.some((pattern) => pattern.test(normalized));
        const matchesKeyword = item.keywords.some((keyword) => normalized.includes(normalizeChatText(keyword)));
        return matchesPattern || matchesKeyword;
    });

    return intent || DEFAULT_RESPONSE;
}

function initChatbot() {
    const toggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const close = document.getElementById('chatbot-close');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');
    const messages = document.getElementById('chatbot-messages');
    const quickRepliesContainer = document.getElementById('chatbot-quick-replies');

    if (!toggle || !chatbotWindow || !close || !input || !sendBtn || !messages || !quickRepliesContainer) return;

    QUICK_REPLIES.forEach((question) => {
        const btn = document.createElement('button');
        btn.className = 'chatbot-quick-btn';
        btn.type = 'button';
        btn.textContent = question;
        btn.addEventListener('click', () => sendMessage(question));
        quickRepliesContainer.appendChild(btn);
    });

    function setOpen(isOpen) {
        chatbotWindow.classList.toggle('open', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        if (isOpen) input.focus();
    }

    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => setOpen(!chatbotWindow.classList.contains('open')));
    close.addEventListener('click', () => setOpen(false));
    sendBtn.addEventListener('click', sendInputMessage);
    input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') sendInputMessage();
    });

    function sendInputMessage() {
        const text = input.value.trim();
        if (!text) return;
        sendMessage(text);
        input.value = '';
    }

    async function sendMessage(text) {
        appendMessage(text, 'user');
        quickRepliesContainer.style.display = 'none';

        const ruleResponse = getBotResponse(text);
        if (ruleResponse.id !== DEFAULT_RESPONSE.id) {
            window.setTimeout(() => appendBotResponse(ruleResponse), 350);
            return;
        }

        const pendingMessage = appendMessage('⏳ Consultando al asistente de IA...', 'bot');
        pendingMessage.classList.add('chatbot-msg-pending');

        try {
            const aiResponse = await getAiResponse(text);
            pendingMessage.remove();
            appendBotResponse(aiResponse);
        } catch (error) {
            console.warn('La segunda capa de IA no está disponible:', error);
            pendingMessage.remove();
            appendBotResponse(DEFAULT_RESPONSE);
        }
    }

    async function getAiResponse(message) {
        const token = localStorage.getItem('fivox_token') || sessionStorage.getItem('fivox_token');
        const response = await fetch('/api/chatbot/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ message }),
        });

        const data = await response.json();
        if (!response.ok || !data.ok || typeof data.data?.answer !== 'string') {
            throw new Error(data.message || 'No se pudo obtener una respuesta de IA.');
        }

        return { id: 'ai', answer: data.data.answer };
    }

    function appendBotResponse(response) {
        appendMessage(response.answer, 'bot');
        if (!response.action) return;

        const actionButton = document.createElement('button');
        actionButton.type = 'button';
        actionButton.className = 'chatbot-action-btn';
        actionButton.textContent = response.action.label;
        actionButton.addEventListener('click', () => runAction(response.action.type));
        messages.appendChild(actionButton);
        messages.scrollTop = messages.scrollHeight;
    }

    function appendMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `chatbot-msg chatbot-msg-${sender}`;
        div.innerText = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
        return div;
    }

    function runAction(actionType) {
        const targetByAction = {
            'open-profile': 'btn-open-profile',
            'open-create': 'btn-open-create',
            'open-support': 'btn-support',
            'open-my-services': 'btn-mis-servicios',
            'open-reviews': 'btn-calificar',
            'open-terms': 'btn-terms',
        };

        if (actionType === 'focus-search') {
            const searchInput = document.querySelector('.search input');
            setOpen(false);
            searchInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            searchInput?.focus();
            return;
        }

        const target = document.getElementById(targetByAction[actionType]);
        if (target && target.style.display !== 'none') {
            setOpen(false);
            target.click();
        }
    }
}

document.addEventListener('DOMContentLoaded', initChatbot);
