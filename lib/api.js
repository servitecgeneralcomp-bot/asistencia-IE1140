import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { currentUser } from './auth';

export class HttpError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
export const json = (data, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
/** Envuelve un handler: exige sesión (y rol), verifica origen en métodos que escriben, maneja errores. */
export function handler(fn, { role = 'any', auth = true } = {}) {
  return async (req, ctx) => {
    try {
      if (req.method !== 'GET') {
        const h = headers(); const origin = h.get('origin'); const host = h.get('x-forwarded-host') || h.get('host');
        if (origin && host && new URL(origin).host !== host) throw new HttpError(403, 'Origen no permitido');
      }
      let user = null;
      if (auth) {
        user = await currentUser();
        if (!user) throw new HttpError(401, 'Sesión expirada. Vuelve a ingresar.');
        if (role === 'admin' && user.role !== 'admin') throw new HttpError(403, 'Solo administradores');
      }
      return await fn(req, { ...ctx, user });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Error interno: ' + (e.message || 'desconocido') }, 500);
    }
  };
}
export async function body(req) { try { return await req.json(); } catch { throw new HttpError(400, 'JSON inválido'); } }
export const clean = (v, max = 120) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
export function csv(rows, cols, filename) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const out = '\ufeff' + [cols.map((c) => c[1]).join(','), ...rows.map((r) => cols.map((c) => esc(r[c[0]])).join(','))].join('\r\n');
  return new NextResponse(out, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
}
