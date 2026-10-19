import { GoogleGenAI } from '@google/genai';

import { EKAAY_LANGUAGES, type EkaayLanguage } from '@/features/ekaay/languages';

import { env } from './env';
import { HttpError } from './http';

// Ekaay's voice, as on cloudspital.ai: Gemini hears the member's spoken question and reads Ekaay's
// answer aloud. Claude still writes every answer (`server/ekaay.ts`); Gemini only turns speech into
// words and words into speech. Both calls send `store: false`, so Google keeps no copy of the
// interaction: questions are about the member's health.

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const SPEAK_TIMEOUT_MS = 40_000;
/** 16 kHz mono WAV: clear for speech, and half the size of Gemini's 24 kHz default. */
const SAMPLE_RATE = 16_000;
const STYLE = 'calm, warm and caring, like a health educator, at an easy pace';

const NOT_SET_UP = 'Ekaay’s voice isn’t set up yet. Type your question instead.';
const UNAVAILABLE = 'Ekaay can’t use its voice right now. Try again in a moment.';
const BUSY = 'Ekaay’s voice is busy right now. Try again in a minute.';

let client: GoogleGenAI | undefined;

function gemini() {
  const { GEMINI_API_KEY } = env();
  if (!GEMINI_API_KEY) throw new HttpError(503, NOT_SET_UP);
  return (client ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY }));
}

/** Whether Ekaay can hear and speak with Gemini; the app hides the mic when it can't. */
export const voiceAvailable = () => Boolean(env().GEMINI_API_KEY);

/** A failed Gemini call as a message the app can show. Never logs the audio or the text. */
function voiceError(task: string, error: unknown): HttpError {
  const { statusCode, status, message = '', body } = (error ?? {}) as {
    statusCode?: number;
    status?: number;
    message?: string;
    body?: unknown;
  };
  const code = statusCode ?? status;
  // The reason is in the body ("API key not valid…"); the message is only "400 API error occurred".
  const detail = `${message} ${typeof body === 'string' ? body : ''}`;
  console.error(`[ekaay] Gemini ${task} failed:`, code ?? '', detail.replace(/\s+/g, ' ').slice(0, 300));
  // A bad, expired or blocked key comes back as a 400 that names it.
  if (code === 401 || code === 403 || (code === 400 && /API_KEY_|api key/i.test(detail))) {
    return new HttpError(503, NOT_SET_UP);
  }
  if (code === 429) return new HttpError(503, BUSY);
  return new HttpError(503, UNAVAILABLE);
}

/** The words of a spoken question, in the language and script they were spoken in. */
export async function transcribe(audio: string, mimeType: string, language?: EkaayLanguage) {
  const expected = language ? ` The speaker most likely speaks ${EKAAY_LANGUAGES[language].name}.` : '';
  let text: string | undefined;
  try {
    const interaction = await gemini().interactions.create(
      {
        model: env().GEMINI_TRANSCRIBE_MODEL,
        system_instruction:
          'You transcribe a question someone asks a health assistant. Write exactly what they say, in the language and script they speak it in: Hindi in Devanagari, Tamil in Tamil script, and so on; Hinglish or another language mixed with English words is written the way it is usually typed. Keep medicine names, test names and numbers as spoken. Do not translate, answer or add anything. If there is no speech, reply with nothing.' +
          expected,
        input: [
          {
            type: 'user_input',
            content: [
              { type: 'audio', data: audio, mime_type: mimeType },
              { type: 'text', text: 'Transcribe this question.' },
            ],
          },
        ],
        store: false,
      },
      { timeout_ms: TRANSCRIBE_TIMEOUT_MS },
    );
    text = interaction.output_text;
  } catch (error) {
    throw voiceError('transcription', error);
  }
  return (text ?? '').trim();
}

/** Ekaay's answer read aloud, as base64 WAV (16-bit PCM, mono, 16 kHz). */
export async function speak(text: string, language?: EkaayLanguage) {
  const { GEMINI_TTS_MODEL, GEMINI_TTS_VOICE } = env();
  let audio: string | undefined;
  try {
    const interaction = await gemini().interactions.create(
      {
        model: GEMINI_TTS_MODEL,
        input: [
          {
            type: 'user_input',
            content: [{ type: 'text', text, annotations: [{ type: 'speech_metadata', style: STYLE }] }],
          },
        ],
        response_format: { type: 'audio', mime_type: 'audio/wav', sample_rate: SAMPLE_RATE },
        // Without a language Gemini works it out from the text.
        generation_config: { speech_config: [{ voice: GEMINI_TTS_VOICE, language }] },
        store: false,
      },
      { timeout_ms: SPEAK_TIMEOUT_MS },
    );
    audio = interaction.output_audio?.data;
  } catch (error) {
    throw voiceError('speech', error);
  }
  if (!audio) {
    console.error('[ekaay] Gemini gave no audio');
    throw new HttpError(503, UNAVAILABLE);
  }
  return audio;
}
