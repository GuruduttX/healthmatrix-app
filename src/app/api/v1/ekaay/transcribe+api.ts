import { z } from 'zod';

import { ekaayLanguageCodes } from '@/features/ekaay/languages';
import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { takeEkaay } from '@/server/ekaay-limits';
import { transcribe } from '@/server/gemini';
import { HttpError, handle } from '@/server/http';

/** About two minutes of the app's 32 kbps recording, as base64. */
const AUDIO_MAX = 700_000;

const transcribeInput = z.object({
  audio: z.base64().min(1).max(AUDIO_MAX, 'Keep your question under a minute'),
  mimeType: z.enum(['audio/m4a', 'audio/mp4', 'audio/aac', 'audio/webm', 'audio/ogg', 'audio/wav']),
  lang: z.enum(ekaayLanguageCodes).optional(),
});

/** The words of a question the member spoke to Ekaay. Ekaay answers them like a typed question. */
export const POST = handle(async (request: Request) => {
  const { audio, mimeType, lang } = transcribeInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  // Counted like a question, so the voice can't be used as a free transcription service.
  const use = await takeEkaay(member, 'hear');
  let text: string | undefined;
  try {
    text = await transcribe(audio, mimeType, lang);
  } catch (error) {
    await use.refund();
    throw error;
  }
  if (!text) {
    await use.refund();
    throw new HttpError(422, 'Ekaay couldn’t hear a question. Try again, a little closer to the phone.');
  }
  return Response.json({ text });
});
