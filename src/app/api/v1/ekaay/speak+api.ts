import { z } from 'zod';

import { ekaayLanguageCodes } from '@/features/ekaay/languages';
import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { isEkaayAnswer, takeEkaay } from '@/server/ekaay-limits';
import { speak } from '@/server/gemini';
import { handle, HttpError } from '@/server/http';

const speakInput = z.object({
  /** One of Ekaay's answers; they are a few sentences, so this leaves plenty of room. */
  text: z.string().trim().min(1).max(1500),
  lang: z.enum(ekaayLanguageCodes).optional(),
});

/**
 * One of Ekaay's answers read aloud by Gemini, as base64 WAV. Only answers Ekaay gave this member
 * are read, so this can't be used to voice any other text. When it refuses, the app reads the
 * answer with the phone's own voice.
 */
export const POST = handle(async (request: Request) => {
  const { text, lang } = speakInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  if (!(await isEkaayAnswer(member, text))) {
    throw new HttpError(403, 'Ekaay only reads its own answers aloud.');
  }
  const use = await takeEkaay(member, 'speak');
  try {
    return Response.json({ audio: await speak(text, lang), mimeType: 'audio/wav' });
  } catch (error) {
    await use.refund();
    throw error;
  }
});
