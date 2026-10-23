import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { validateStudent } from '@/lib/students';
import { newNonce } from '@/lib/qr';
import { audit } from '@/lib/auth';
export const POST = handler(async (req, { user }) => {
  const b = await body(req);
  if (!Array.isArray(b.rows) || b.rows.length > 3000) throw new HttpError(400, 'Envía hasta 3000 filas');
  let creados = 0, actualizados = 0; const errores = [];
  for (const [i, row] of b.rows.entries()) {
    try {
      const s = validateStudent({ ...row, foto: undefined });
      const r = await q1(`INSERT INTO students(dni,nombres,apellidos,grado,seccion,aula,apoderado_nombre,apoderado_email,apoderado_telefono,hora_entrada,hora_salida,qr_nonce)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT(dni) DO UPDATE SET nombres=EXCLUDED.nombres,apellidos=EXCLUDED.apellidos,grado=EXCLUDED.grado,seccion=EXCLUDED.seccion,aula=EXCLUDED.aula,
          apoderado_nombre=EXCLUDED.apoderado_nombre,apoderado_email=EXCLUDED.apoderado_email,apoderado_telefono=EXCLUDED.apoderado_telefono,updated_at=now()
        RETURNING (xmax=0) AS nuevo`, [s.dni, s.nombres, s.apellidos, s.grado, s.seccion, s.aula, s.apoderado_nombre, s.apoderado_email, s.apoderado_telefono, s.hora_entrada, s.hora_salida, newNonce()]);
      r.nuevo ? creados++ : actualizados++;
    } catch (e) { errores.push(`Fila ${i + 2}: ${e.message}`); }
  }
  await audit(user.id, 'estudiantes_importar', `${creados} nuevos, ${actualizados} actualizados, ${errores.length} errores`);
  return json({ creados, actualizados, errores: errores.slice(0, 100) });
}, { role: 'admin' });
