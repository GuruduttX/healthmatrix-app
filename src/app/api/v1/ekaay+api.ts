import { z } from 'zod';

import { requireMember } from '@/server/auth';
import { connectDB } from '@/server/db';
import { askEkaay } from '@/server/ekaay';
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
});

/** Ekaay's answer to the member's question, from their own records. */
export const POST = handle(async (request: Request) => {
  const { messages } = askInput.parse(await request.json());
  await connectDB();
  const member = await requireMember(request);
  return Response.json({ message: await askEkaay(member, messages) });
});
