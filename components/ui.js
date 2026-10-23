'use client';
import { useState, useEffect } from 'react';
export async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, body: opts.body && typeof opts.body !== 'string' ? JSON.stringify(opts.body) : opts.body, cache: 'no-store' });
  let d = {}; try { d = await r.json(); } catch {}
  if (r.status === 401 && !url.includes('/auth/login') && typeof window !== 'undefined') { window.location.href = '/login'; }
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
}
export function Stat({ label, value, tone = 'slate', sub }) {
  const t = { slate: 'text-slate-800', green: 'text-emerald-600', red: 'text-rose-600', amber: 'text-amber-600', indigo: 'text-indigo-600' }[tone];
  return <div className="card !p-4"><p className="text-xs text-slate-500 font-medium">{label}</p><p className={`text-3xl font-bold ${t}`}>{value}</p>{sub && <p className="text-[11px] text-slate-400">{sub}</p>}</div>;
}
export function Msg({ m }) {
  if (!m) return null;
  const err = m.startsWith('❌');
  return <div className={`text-sm rounded-lg px-3 py-2 ${err ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>{m}</div>;
}
export const todayLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
export const daysAgo = (n) => { const d = new Date(todayLima() + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
export function AulaSelect({ aulas, value, onChange, all = 'Todas las aulas' }) {
  return <select className="inp" value={value} onChange={(e) => onChange(e.target.value)}><option value="">{all}</option>{aulas.map((a) => <option key={a}>{a}</option>)}</select>;
}
export function useAulas() {
  const [a, set] = useState([]);
  useEffect(() => { api('/api/students?q=').then((d) => set(d.aulas)).catch(() => {}); }, []);
  return a;
}
