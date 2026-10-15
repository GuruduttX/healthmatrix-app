import { api } from '@/services/api';

import { type ChatMessage } from './chat';

/** A model answer can take a while; the server gives OpenAI 45 seconds. */
const ASK_TIMEOUT_MS = 60_000;

type Answer = Pick<ChatMessage, 'text' | 'chart' | 'actions'>;

export const ekaayApi = {
  /**
   * Ekaay's answer to the last question in `messages`. Matches `src/app/api/v1/ekaay+api.ts`.
   * The whole chat goes along so follow-ups make sense; the server keeps the last few turns.
   */
  ask: (messages: ChatMessage[]) =>
    api<{ message: Answer }>('/ekaay', {
      method: 'POST',
      body: {
        messages: messages.map((message) => ({
          role: message.from === 'user' ? 'user' : 'assistant',
          text: message.text,
        })),
      },
      timeoutMs: ASK_TIMEOUT_MS,
    }).then(({ message }) => message),
};
