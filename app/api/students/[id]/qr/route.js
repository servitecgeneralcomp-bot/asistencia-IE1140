import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { newNonce } from '@/lib/qr';
import { audit } from '@/lib/auth';
export const POST = handler(async (req, { params, user }) => {
  const r = await q1('UPDATE students SET qr_nonce=$2 WHERE id=$1 RETURNING dni', [parseInt(params.id, 10), newNonce()]);
  if (!r) throw new HttpError(404, 'No encontrado');
  await audit(user.id, 'qr_regenerar', r.dni + ' (el carnet anterior queda anulado)');
  return json({ ok: true });
}, { role: 'admin' });
