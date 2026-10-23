import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { parseToken, verifyToken } from '@/lib/qr';
import { registerMark, fullName, aulaLabel } from '@/lib/attendance';
import { rateLimit, audit } from '@/lib/auth';
export const POST = handler(async (req, { user }) => {
  if (!(await rateLimit('scan:' + user.id, 120, 60))) throw new HttpError(429, 'Demasiadas lecturas por minuto');
  const b = await body(req);
  let student;
  if (b.token) {
    const p = parseToken(b.token);
    if (!p) return json({ ok: false, code: 'QR_INVALIDO', error: 'Este QR no es un carnet del colegio' });
    student = await q1('SELECT * FROM students WHERE id=$1', [p.id]);
    if (!student || !verifyToken(p, student)) { await audit(user.id, 'qr_rechazado', b.token.slice(0, 60)); return json({ ok: false, code: 'QR_INVALIDO', error: 'Carnet no válido o anulado' }); }
  } else if (b.studentId) student = await q1('SELECT * FROM students WHERE id=$1', [parseInt(b.studentId, 10)]);
  if (!student) throw new HttpError(404, 'Estudiante no encontrado');
  if (!student.activo) return json({ ok: false, code: 'INACTIVO', error: 'Estudiante inactivo (retirado)', student: { nombre: fullName(student) } });
  const tipo = ['INGRESO', 'SALIDA'].includes(b.tipo) ? b.tipo : 'AUTO';
  const r = await registerMark({ student, tipo, user, metodo: b.token ? 'QR' : 'MANUAL', recoge_nombre: clean(b.recoge_nombre, 100) || null, nota: clean(b.nota, 200) || null, force: !!b.force && !b.token });
  return json({ ...r, record: undefined, student: { id: student.id, nombre: fullName(student), aula: aulaLabel(student), dni: student.dni, foto: student.foto, apoderado: student.apoderado_nombre, email: !!student.apoderado_email } });
});
