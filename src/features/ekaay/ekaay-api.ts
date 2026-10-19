import { api } from '@/services/api';

import { type ChatMessage } from './chat';
import { type EkaayLanguage } from './languages';

/** A model answer can take a while; the server gives Claude 45 seconds. */
const ASK_TIMEOUT_MS = 60_000;
/** Gemini hears a question in 30 seconds and reads an answer aloud in 40, at most. */
const TRANSCRIBE_TIMEOUT_MS = 40_000;
const SPEAK_TIMEOUT_MS = 50_000;

type Answer = Pick<ChatMessage, 'text' | 'chart' | 'actions'>;

export const ekaayApi = {
  /** What Ekaay can do here: `voice` is whether it can hear questions and speak with Gemini. */
  features: () => api<{ voice: boolean }>('/ekaay'),

  /**
   * Ekaay's answer to the last question in `messages`. Matches `src/app/api/v1/ekaay+api.ts`.
   * The whole chat goes along so follow-ups make sense; the server keeps the last few turns.
   * With `lang` Ekaay answers in that language; without it, in the question's language.
   */
  ask: (messages: ChatMessage[], lang?: EkaayLanguage) =>
    api<{ message: Answer }>('/ekaay', {
      method: 'POST',
      body: {
        messages: messages.map((message) => ({
          role: message.from === 'user' ? 'user' : 'assistant',
          text: message.text,
        })),
        lang,
      },
      timeoutMs: ASK_TIMEOUT_MS,
    }).then(({ message }) => message),

  /** The words of a spoken question (base64 audio). Matches `ekaay/transcribe+api.ts`. */
  transcribe: (audio: string, mimeType: string, lang?: EkaayLanguage) =>
    api<{ text: string }>('/ekaay/transcribe', {
      method: 'POST',
      body: { audio, mimeType, lang },
      timeoutMs: TRANSCRIBE_TIMEOUT_MS,
    }).then(({ text }) => text),

  /** One answer read aloud, as base64 WAV. Matches `ekaay/speak+api.ts`. */
  speak: (text: string, lang?: EkaayLanguage) =>
    api<{ audio: string; mimeType: string }>('/ekaay/speak', {
      method: 'POST',
      body: { text, lang },
      timeoutMs: SPEAK_TIMEOUT_MS,
    }),
};
