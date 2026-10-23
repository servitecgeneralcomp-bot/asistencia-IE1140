import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { hashPassword, validPassword, audit } from '@/lib/auth';
export const PUT = handler(async (req, { params, user }) => {
  const id = parseInt(params.id, 10); const b = await body(req);
  const u = await q1('SELECT * FROM users WHERE id=$1', [id]); if (!u) throw new HttpError(404, 'No encontrado');
  if (id === user.id && (b.activo === false || b.role === 'auxiliar')) throw new HttpError(400, 'No puedes quitarte tu propio acceso de administrador');
  if (b.password !== undefined) { if (!validPassword(b.password)) throw new HttpError(400, 'Contraseña mínima de 8 caracteres');
    await q('UPDATE users SET password_hash=$2 WHERE id=$1', [id, await hashPassword(b.password)]); await q('DELETE FROM sessions WHERE user_id=$1', [id]); }
  if (b.role && ['admin', 'auxiliar'].includes(b.role)) await q('UPDATE users SET role=$2 WHERE id=$1', [id, b.role]);
  if (typeof b.activo === 'boolean') { await q('UPDATE users SET activo=$2 WHERE id=$1', [id, b.activo]); if (!b.activo) await q('DELETE FROM sessions WHERE user_id=$1', [id]); }
  if (b.nombre) await q('UPDATE users SET nombre=$2 WHERE id=$1', [id, clean(b.nombre, 80)]);
  await audit(user.id, 'usuario_editar', `${u.username} ${Object.keys(b).join(',')}`); return json({ ok: true });
}, { role: 'admin' });
