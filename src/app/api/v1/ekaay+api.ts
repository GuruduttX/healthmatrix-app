import { z } from 'zod';

import { ekaayLanguageCodes } from '@/features/ekaay/languages';
import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { askEkaay } from '@/server/ekaay';
import { rememberAnswer, takeEkaay } from '@/server/ekaay-limits';
import { voiceAvailable } from '@/server/gemini';
import { handle } from '@/server/http';

const QUESTION_MAX = 1000;

const askInput = z.object({
  /** The chat so far, oldest first, ending with the member's question. */
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(50)
    .refine((messages) => messages[messages.length - 1]?.role === 'user', 'Ask a question first')
    .refine(
      (messages) => messages[messages.length - 1]!.text.length <= QUESTION_MAX,
      `Keep your question under ${QUESTION_MAX.toLocaleString('en-IN')} characters`,
    ),
  /** The language the member picked; without one Ekaay answers in the question's language. */
  lang: z.enum(ekaayLanguageCodes).optional(),
});

/** What Ekaay can do here: `voice` is whether it can hear questions and speak with Gemini. */
export const GET = handle(async (request: Request) => {
  await connectDB();
  await requireMember(request);
  return Response.json({ voice: voiceAvailable() });
});

/**
 * Ekaay's answer to the member's question, from their own records. Each one counts against the
 * member's daily allowance, given back if no answer comes; the answer is remembered so it can be
 * read aloud.
 */
export const POST = handle(async (request: Request) => {
  const { messages, lang } = askInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  const use = await takeEkaay(member, 'ask');
  let message: Awaited<ReturnType<typeof askEkaay>>;
  try {
    message = await askEkaay(member, messages, lang);
  } catch (error) {
    await use.refund();
    throw error;
  }
  await rememberAnswer(member, message.text);
  return Response.json({ message });
});
