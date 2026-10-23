import { limaDate } from './time';
import { HttpError } from './api';
export function range(u, defDays = 0) {
  const today = limaDate();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  let from = u.searchParams.get('desde') || ''; let to = u.searchParams.get('hasta') || '';
  if (!iso.test(to)) to = today;
  if (!iso.test(from)) { const d = new Date(to + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - defDays); from = d.toISOString().slice(0, 10); }
  if (from > to) throw new HttpError(400, 'La fecha "desde" es mayor que "hasta"');
  if ((new Date(to) - new Date(from)) / 864e5 > 400) throw new HttpError(400, 'Rango máximo: 400 días');
  return { from, to };
}
