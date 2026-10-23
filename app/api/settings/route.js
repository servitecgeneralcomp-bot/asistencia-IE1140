import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { getSettings, saveSettings } from '@/lib/settings';
import { audit } from '@/lib/auth';
export const GET = handler(async () => json(await getSettings()));
export const PUT = handler(async (req, { user }) => {
  try { const s = await saveSettings(await body(req)); await audit(user.id, 'ajustes', JSON.stringify(s)); return json(s); }
  catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, e.message); }
}, { role: 'admin' });
