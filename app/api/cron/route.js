import { handler, json, body, clean, HttpError, csv } from '@/lib/api';
import { q, q1 } from '@/lib/db';
export const dynamic = 'force-dynamic';
import crypto from 'crypto';
import { processOutbox, enqueue, template, escHtml } from '@/lib/mail';
import { getSettings } from '@/lib/settings';
import { limaDate, limaMinutes, hhmmToMin, weekday, fmtDateLong } from '@/lib/time';
import { fullName } from '@/lib/attendance';
// Lo llama Vercel Cron (ver vercel.json). Procesa la cola de correos y, si está activado, avisa faltas del día.
export const GET = handler(async (req) => {
  const sec = process.env.CRON_SECRET || ''; const got = (req.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!sec || got.length !== sec.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(sec))) throw new HttpError(401, 'No autorizado');
  const st = await getSettings(); const fecha = limaDate(); let faltas = 0;
  const hol = await q1('SELECT 1 FROM holidays WHERE fecha=$1', [fecha]);
  if (st.notify_falta && !hol && st.dias_lectivos.includes(weekday(fecha)) && limaMinutes() > hhmmToMin(st.hora_entrada) + st.tolerancia + 30) {
    const aus = await q(`SELECT * FROM students s WHERE activo AND apoderado_email<>'' AND NOT EXISTS(SELECT 1 FROM attendance a WHERE a.student_id=s.id AND a.fecha=$1 AND a.tipo='INGRESO')
      AND NOT EXISTS(SELECT 1 FROM justifications j WHERE j.student_id=s.id AND j.fecha=$1 AND j.tipo='FALTA')`, [fecha]);
    for (const s of aus) if (await enqueue({ to: s.apoderado_email, kind: 'falta', ref: `falta-${s.id}-${fecha}`, subject: `Aviso de inasistencia: ${s.nombres} - I.E. 1140`,
      html: template(st, 'Inasistencia', '#b91c1c', [`Estimado(a) ${escHtml(s.apoderado_nombre || 'apoderado(a)')}:`, `<b>${escHtml(fullName(s))}</b> no ha registrado su ingreso hoy, ${escHtml(fmtDateLong(fecha))}.`, 'Si se trata de un error o desea justificar la inasistencia, comuníquese con la institución.']) })) faltas++;
  }
  const r = await processOutbox(80);
  return json({ ok: true, faltas_encoladas: faltas, ...r });
}, { auth: false });
