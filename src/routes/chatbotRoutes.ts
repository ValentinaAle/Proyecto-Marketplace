import { Router } from 'express';
import authMiddleware from '../middlewares/auth';

interface AskBody {
  message?: unknown;
}

interface OllamaResponse {
  message?: { content?: unknown };
  error?: unknown;
}

const router = Router();
const MAX_MESSAGE_LENGTH = 800;
const MAX_REQUESTS = 10;
const WINDOW_MS = 5 * 60 * 1000;
const aiRequests = new Map<number, number[]>();

const SYSTEM_INSTRUCTIONS = `
Sos el asistente de FIVOX, un marketplace de servicios en Argentina.
Respondé siempre en español, de forma breve, cordial y útil.
Sólo orientá sobre el uso de FIVOX: buscar o publicar servicios, contactar prestadores,
perfil, contraseñas, calificaciones, soporte, tickets, términos y roles.
No inventes información, precios, políticas ni estados de cuentas.
No solicites contraseñas, códigos de verificación, tokens ni otros datos sensibles.
No afirmes haber realizado acciones: sólo podés explicar pasos dentro de la aplicación.
Si la consulta no está relacionada con FIVOX, indicá que podés ayudar con FIVOX y sugerí abrir soporte si necesita asistencia.
`;

function isRateLimited(userId: number): boolean {
  const now = Date.now();
  const recentRequests = (aiRequests.get(userId) || []).filter(time => now - time < WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS) return true;

  recentRequests.push(now);
  aiRequests.set(userId, recentRequests);
  return false;
}

function getOutputText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;

  const outputText = (payload as OllamaResponse).message?.content;
  if (typeof outputText !== 'string') return null;

  const answer = outputText.trim();
  return answer || null;
}

// POST /api/chatbot/ask — segunda capa de IA para consultas sin regla conocida.
router.post<Record<string, never>, unknown, AskBody>('/ask', authMiddleware, async (req, res) => {
  const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!message) {
    return res.status(400).json({ ok: false, message: 'La consulta es requerida.' });
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ ok: false, message: `La consulta no puede superar ${MAX_MESSAGE_LENGTH} caracteres.` });
  }

  if (isRateLimited(req.user.id_user)) {
    return res.status(429).json({ ok: false, message: 'Realizaste muchas consultas. Intentá nuevamente en unos minutos.' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTIONS },
          { role: 'user', content: message },
        ],
        stream: false,
        keep_alive: '5m',
        options: {
          temperature: 0.3,
          num_predict: 280,
        },
      }),
      signal: controller.signal,
    });

    const payload = await response.json() as unknown;
    if (!response.ok) {
      const providerError = (payload as OllamaResponse).error;
      const providerMessage = typeof providerError === 'string'
        ? providerError
        : 'No se pudo obtener una respuesta de IA.';
      console.error('Error de Ollama:', response.status, providerMessage);
      return res.status(502).json({ ok: false, message: 'La asistencia con IA no está disponible en este momento.' });
    }

    const answer = getOutputText(payload);
    if (!answer) {
      return res.status(502).json({ ok: false, message: 'La asistencia con IA no devolvió una respuesta válida.' });
    }

    return res.status(200).json({ ok: true, data: { answer, source: 'ai' } });
  } catch (error) {
    const reason = error instanceof Error && error.name === 'AbortError' ? 'tiempo de espera agotado' : 'error de conexión';
    console.error(`Error al consultar IA: ${reason}`);
    return res.status(502).json({ ok: false, message: 'La asistencia con IA no está disponible en este momento.' });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;
