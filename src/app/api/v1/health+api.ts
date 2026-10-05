import { connectDB, isDBConnected } from '@/server/db';
import { handle } from '@/server/http';

/** Reports whether the API can reach MongoDB. */
export const GET = handle(async () => {
  await connectDB().catch((error: unknown) => console.error('[db]', (error as Error).message));
  const db = isDBConnected();
  return Response.json({ status: db ? 'ok' : 'degraded', db }, { status: db ? 200 : 503 });
});
