import { q } from './db';
export const DEFAULTS = {
  school_name: 'I.E. 1140 Aurelio Miró Quesada',
  school_place: 'La Molina - Lima',
  hora_entrada: '08:00', tolerancia: 10, hora_salida: '13:00',
  dedupe_min: 3, min_entre_ingreso_salida: 10,
  notify_ingreso: true, notify_salida: true, notify_falta: false,
  dias_lectivos: [1, 2, 3, 4, 5],
};
export async function getSettings() {
  const rows = await q('SELECT key, value FROM settings');
  const s = { ...DEFAULTS };
  for (const r of rows) if (r.key in DEFAULTS) s[r.key] = r.value;
  return s;
}
export async function saveSettings(input) {
  const out = {};
  const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
  const hhmm = (v) => { if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new Error('Hora inválida: ' + v); return v; };
  const int = (v, a, b) => { const n = parseInt(v, 10); if (!(n >= a && n <= b)) throw new Error('Número fuera de rango'); return n; };
  for (const [k, v] of Object.entries(input || {})) {
    if (!(k in DEFAULTS)) continue;
    if (k === 'school_name' || k === 'school_place') out[k] = str(v) || DEFAULTS[k];
    else if (k.startsWith('hora_')) out[k] = hhmm(v);
    else if (k === 'tolerancia') out[k] = int(v, 0, 120);
    else if (k === 'dedupe_min') out[k] = int(v, 0, 60);
    else if (k === 'min_entre_ingreso_salida') out[k] = int(v, 0, 600);
    else if (k.startsWith('notify_')) out[k] = !!v;
    else if (k === 'dias_lectivos') out[k] = [...new Set((v || []).map(Number).filter((n) => n >= 0 && n <= 6))];
  }
  for (const [k, v] of Object.entries(out)) await q('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=$2', [k, JSON.stringify(v)]);
  return getSettings();
}
