import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { runInNewContext } from 'node:vm';

const chatbotSource = readFileSync(path.join(process.cwd(), 'public/js/chatbot.js'), 'utf8');

interface ChatbotResponse {
  id: string;
  answer: string;
  action?: { type: string };
}

function responseFor(message: string): ChatbotResponse {
  const documentStub = { addEventListener: () => undefined };
  const serialized = runInNewContext(
    `${chatbotSource}\nJSON.stringify(getBotResponse(${JSON.stringify(message)}))`,
    { document: documentStub, JSON, String },
  );
  return JSON.parse(String(serialized)) as ChatbotResponse;
}

describe('chatbot intent recognition', () => {
  it('answers how to contact a provider with the real UI steps', () => {
    const response = responseFor('¿Cómo contacto a un prestador?');

    assert.equal(response.id, 'contact-provider');
    assert.match(response.answer, /Contratar servicio/);
    assert.match(response.answer, /teléfono y el email/);
    assert.equal(response.action?.type, 'focus-search');
  });

  it('recognizes provider-contact synonyms, accents and casing', () => {
    assert.equal(responseFor('QUIERO comunicarme con un profesional').id, 'contact-provider');
    assert.equal(responseFor('¿Dónde veo el teléfono del proveedor?').id, 'contact-provider');
  });

  it('distinguishes provider contact from FIVOX support', () => {
    assert.equal(responseFor('¿Cómo contacto al equipo de Fivox?').id, 'contact-support');
  });

  it('recognizes password recovery separately from changing a password', () => {
    assert.equal(responseFor('Olvidé mi contraseña').id, 'forgot-password');
    assert.equal(responseFor('Quiero cambiar mi contraseña').id, 'change-password');
  });

  it('returns a useful fallback for an unknown topic', () => {
    const response = responseFor('¿Cuál es el clima de mañana?');

    assert.equal(response.id, 'fallback');
    assert.match(response.answer, /ticket/);
  });
});
