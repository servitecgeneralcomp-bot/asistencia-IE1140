export const TZ = 'America/Lima';
const parts = (d) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
export function limaDate(d = new Date()) { const p = parts(d); return `${p.year}-${p.month}-${p.day}`; }
export function limaTime(d = new Date()) { const p = parts(d); return `${p.hour}:${p.minute}:${p.second}`; }
export function limaMinutes(d = new Date()) { const p = parts(d); return +p.hour * 60 + +p.minute; }
export function hhmmToMin(s) { const [h, m] = String(s || '0:0').split(':').map(Number); return h * 60 + (m || 0); }
export function fmtDateLong(iso) {
  return new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00Z'));
}
export function weekday(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }
export function addDays(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
