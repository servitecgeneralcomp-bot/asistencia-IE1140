import { q } from './db';

export const escHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function mailMode() {
  if (process.env.MAIL_MODE === 'log') return 'log';
  if (process.env.RESEND_API_KEY) return 'resend';
  if (process.env.SMTP_HOST) return 'smtp';
  return 'none';
}
/** Versión en texto simple a partir del HTML (para la parte text/plain). */
export function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h2|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
}
function msgDomain(from) {
  const m = String(from || '').match(/@([^>\s]+)/);
  return m ? m[1] : 'ei1140.local';
}
async function deliver(m) {
  const replyTo = process.env.MAIL_REPLY_TO || undefined;
  const text = htmlToText(m.html);
  const mode = mailMode();
  const from = process.env.MAIL_FROM || 'Asistencia <onboarding@resend.dev>';
  if (mode === 'log') { console.log('[MAIL_MODE=log]', m.to_addr, m.subject); return; }
  if (mode === 'resend') {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST', signal: ctrl.signal,
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `ei1140-${m.id}` },
        body: JSON.stringify({ from, to: [m.to_addr], subject: m.subject, html: m.html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
      });
      if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 200)}`);
    } finally { clearTimeout(t); }
    return;
  }
  if (mode === 'smtp') {
    const nodemailer = (await import('nodemailer')).default;
    const port = +(process.env.SMTP_PORT || 587);
    const tr = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 8000 });
    const sfrom = process.env.MAIL_FROM || process.env.SMTP_USER;
    await tr.sendMail({ from: sfrom, to: m.to_addr, subject: m.subject, html: m.html, text, ...(replyTo ? { replyTo } : {}),
      messageId: `<ei1140-${m.id}-${Date.now()}@${msgDomain(sfrom)}>` });
    return;
  }
  throw new Error('No hay proveedor de correo configurado (RESEND_API_KEY o SMTP_HOST)');
}
/** Encola un correo (idempotente por ref). */
export async function enqueue({ to, subject, html, kind = 'info', ref = null }) {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return null;
  const r = await q('INSERT INTO emails(to_addr,subject,html,kind,ref) VALUES($1,$2,$3,$4,$5) ON CONFLICT(ref) DO NOTHING RETURNING id', [to, subject, html, kind, ref]);
  return r[0]?.id || null;
}
/** Envía pendientes; reintenta hasta 6 veces. Toma filas con bloqueo para que dos instancias no envíen lo mismo. */
export async function processOutbox(limit = 10) {
  const rows = await q(`UPDATE emails SET status='enviando', attempts=attempts+1 WHERE id IN (
      SELECT id FROM emails WHERE (status='pendiente' OR (status='enviando' AND created_at < now()-interval '10 minutes'))
        AND attempts < 6 ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED) RETURNING *`, [limit]);
  let sent = 0;
  for (const m of rows) {
    try { await deliver(m); await q("UPDATE emails SET status='enviado', sent_at=now(), last_error=NULL WHERE id=$1", [m.id]); sent++; }
    catch (e) { await q("UPDATE emails SET status=CASE WHEN attempts>=6 THEN 'fallido' ELSE 'pendiente' END, last_error=$2 WHERE id=$1", [m.id, String(e.message).slice(0, 300)]); }
  }
  return { procesados: rows.length, enviados: sent };
}
export function template(settings, title, color, lines) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#312e81;color:#fff;padding:16px 20px"><b style="font-size:16px">${escHtml(settings.school_name)}</b><br><span style="color:#c7d2fe;font-size:12px">${escHtml(settings.school_place)} · Control de asistencia</span></div>
  <div style="padding:20px"><h2 style="margin:0 0 12px;color:${color};font-size:18px">${escHtml(title)}</h2>
  ${lines.map((l) => `<p style="margin:6px 0;color:#334155;font-size:14px">${l}</p>`).join('')}
  <p style="margin-top:18px;color:#64748b;font-size:12px">Recibe este correo porque está registrado(a) como apoderado(a) de un estudiante de la ${escHtml(settings.school_name)} (${escHtml(settings.school_place || 'La Molina')}). Es un aviso automático del control de asistencia; hora de Lima (Perú). Si tiene consultas, comuníquese con la institución.</p></div></div>`;
}
