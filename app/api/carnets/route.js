import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import QRCode from 'qrcode';
import { qrToken } from '@/lib/qr';
import { getSettings } from '@/lib/settings';
export const GET = handler(async (req) => {
  const u = new URL(req.url); const aula = clean(u.searchParams.get('aula'), 60);
  const ids = (u.searchParams.get('ids') || '').split(',').map(Number).filter(Boolean).slice(0, 500);
  const rows = ids.length ? await q('SELECT * FROM students WHERE id = ANY($1) ORDER BY apellidos', [ids])
    : await q("SELECT * FROM students WHERE activo AND ($1='' OR grado||' '||seccion=$1) ORDER BY grado,seccion,apellidos LIMIT 500", [aula]);
  const out = [];
  for (const s of rows) out.push({ id: s.id, dni: s.dni, nombres: s.nombres, apellidos: s.apellidos, grado: s.grado, seccion: s.seccion, aula: s.aula, foto: s.foto,
    qr: await QRCode.toDataURL(qrToken(s), { errorCorrectionLevel: 'M', margin: 1, width: 260 }) });
  return json({ carnets: out, settings: await getSettings() });
}, { role: 'admin' });
