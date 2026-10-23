import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { getSettings } from '@/lib/settings';
import { mailMode } from '@/lib/mail';
export const GET = handler(async (req, { user }) => json({ user, settings: await getSettings(), mail: mailMode() }));
