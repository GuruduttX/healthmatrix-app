import { z } from 'zod';

import { ekaayLanguageCodes } from '@/features/ekaay/languages';
import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { speak } from '@/server/gemini';
import { handle } from '@/server/http';

const speakInput = z.object({
  /** One of Ekaay's answers; they are a few sentences, so this leaves plenty of room. */
  text: z.string().trim().min(1).max(1500),
  lang: z.enum(ekaayLanguageCodes).optional(),
});

/** One of Ekaay's answers read aloud by Gemini, as base64 WAV. */
export const POST = handle(async (request: Request) => {
  const { text, lang } = speakInput.parse(await request.json());
  await connectDB();
  await requireMember(request);
  return Response.json({ audio: await speak(text, lang), mimeType: 'audio/wav' });
});
