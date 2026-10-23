import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import { processOutbox, mailMode, enqueue, template } from '@/lib/mail';
import { getSettings } from '@/lib/settings';
import { audit } from '@/lib/auth';
export const GET = handler(async (req) => {
  const st = new URL(req.url).searchParams.get('estado') || '';
  return json({ modo: mailMode(), rows: await q(`SELECT id,to_addr,subject,kind,status,attempts,last_error,
      to_char(created_at AT TIME ZONE 'America/Lima','YYYY-MM-DD HH24:MI') creado, to_char(sent_at AT TIME ZONE 'America/Lima','HH24:MI:SS') enviado
    FROM emails WHERE ($1='' OR status=$1) ORDER BY id DESC LIMIT 300`, [st]) });
}, { role: 'admin' });
export const POST = handler(async (req, { user }) => {
  const b = await body(req);
  if (b.action === 'reintentar') await q("UPDATE emails SET status='pendiente', attempts=0 WHERE status='fallido'");
  if (b.action === 'prueba') {
    const to = clean(b.to, 120); const st = await getSettings();
    const id = await enqueue({ to, subject: 'Prueba de correo - ' + st.school_name, html: template(st, 'Correo de prueba', '#047857', ['Si recibe este mensaje, las notificaciones a apoderados funcionan correctamente.']), kind: 'prueba' });
    if (!id) throw new HttpError(400, 'Correo inválido');
    await audit(user.id, 'correo_prueba', to);
  }
  const r = await processOutbox(20);
  const last = b.action === 'prueba' ? await q1('SELECT status,last_error FROM emails ORDER BY id DESC LIMIT 1') : null;
  return json({ ...r, prueba: last });
}, { role: 'admin' });
