import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { destroySession } from '@/lib/auth';
export const POST = handler(async () => { await destroySession(); return json({ ok: true }); }, { auth: false });
