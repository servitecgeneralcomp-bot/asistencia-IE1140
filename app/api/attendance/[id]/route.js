import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { audit } from '@/lib/auth';
export const DELETE = handler(async (req, { params, user }) => {
  const r = await q1('DELETE FROM attendance a USING students s WHERE a.id=$1 AND s.id=a.student_id RETURNING a.tipo, a.ts, s.dni', [parseInt(params.id, 10)]);
  if (!r) throw new HttpError(404, 'No encontrado');
  await audit(user.id, 'marca_anular', `${r.dni} ${r.tipo} ${r.ts.toISOString()}`);
  return json({ ok: true });
}, { role: 'admin' });
