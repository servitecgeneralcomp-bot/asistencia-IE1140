import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { audit } from '@/lib/auth';
import { range } from '@/lib/filters';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const { from, to } = range(u, 60);
  return json({ rows: await q(`SELECT j.id, to_char(j.fecha,'YYYY-MM-DD') fecha, j.tipo, j.motivo, s.dni, s.apellidos||', '||s.nombres estudiante, s.grado||' '||s.seccion aula, coalesce(u.nombre,'—') por
    FROM justifications j JOIN students s ON s.id=j.student_id LEFT JOIN users u ON u.id=j.user_id WHERE j.fecha BETWEEN $1 AND $2 ORDER BY j.fecha DESC`, [from, to]) });
});
export const POST = handler(async (req, { user }) => {
  const b = await body(req);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') || !['FALTA', 'TARDANZA'].includes(b.tipo)) throw new HttpError(400, 'Datos inválidos');
  const motivo = clean(b.motivo, 300); if (!motivo) throw new HttpError(400, 'Escribe el motivo');
  const s = await q1('SELECT id,dni FROM students WHERE id=$1', [parseInt(b.studentId, 10)]); if (!s) throw new HttpError(404, 'Estudiante no encontrado');
  await q('INSERT INTO justifications(student_id,fecha,tipo,motivo,user_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(student_id,fecha,tipo) DO UPDATE SET motivo=EXCLUDED.motivo,user_id=EXCLUDED.user_id', [s.id, b.fecha, b.tipo, motivo, user.id]);
  await audit(user.id, 'justificar', `${s.dni} ${b.tipo} ${b.fecha}`);
  return json({ ok: true });
});
export const DELETE = handler(async (req, { user }) => {
  const id = parseInt(new URL(req.url).searchParams.get('id'), 10);
  await q('DELETE FROM justifications WHERE id=$1', [id]); await audit(user.id, 'justificacion_eliminar', String(id));
  return json({ ok: true });
}, { role: 'admin' });
