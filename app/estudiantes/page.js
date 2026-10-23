'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Shell, { useMe } from '@/components/Shell';
import { api, Msg, AulaSelect } from '@/components/ui';
export default function Page() { return <Shell><Students /></Shell>; }
const EMPTY = { dni: '', nombres: '', apellidos: '', grado: '', seccion: '', aula: '', apoderado_nombre: '', apoderado_email: '', apoderado_telefono: '', hora_entrada: '', hora_salida: '' };

function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift().map((h) => h.replace(/^\ufeff/, '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_'));
  return rows.filter((r) => r.some((x) => x.trim())).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
async function resizePhoto(file) {
  const img = await createImageBitmap(file);
  const s = Math.min(img.width, img.height); const c = document.createElement('canvas'); c.width = c.height = 300;
  c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 300, 300);
  return c.toDataURL('image/jpeg', 0.8);
}

function Students() {
  const me = useMe(); const admin = me.user.role === 'admin';
  const [list, setList] = useState([]); const [aulas, setAulas] = useState([]); const [qs, setQs] = useState(''); const [aula, setAula] = useState(''); const [inact, setInact] = useState(false);
  const [edit, setEdit] = useState(null); const [msg, setMsg] = useState(''); const [detail, setDetail] = useState(null); const [sel, setSel] = useState(new Set());
  const load = () => api(`/api/students?q=${encodeURIComponent(qs)}&aula=${encodeURIComponent(aula)}${inact ? '&inactivos=1' : ''}`).then((d) => { setList(d.students); setAulas(d.aulas); });
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [qs, aula, inact]);
  const importCsv = async (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = '';
    try { const rows = parseCSV(await f.text()); const r = await api('/api/students/import', { method: 'POST', body: { rows } });
      setMsg(`✅ Importación: ${r.creados} nuevos, ${r.actualizados} actualizados${r.errores.length ? `. ❗ ${r.errores.length} con errores: ${r.errores.slice(0, 5).join(' | ')}` : ''}`); load();
    } catch (er) { setMsg('❌ ' + er.message); }
  };
  const tmpl = () => { const b = new Blob(['\ufeffdni,nombres,apellidos,grado,seccion,aula,apoderado_nombre,apoderado_email,apoderado_telefono\n71234567,Ana Lucía,Quispe Rojas,1ro Primaria,A,Aula 3,Rosa Rojas,rosa@gmail.com,987654321\n'], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'plantilla_estudiantes.csv'; a.click(); };
  const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-lg font-bold">Estudiantes <span className="text-sm text-slate-400 font-normal">{list.length}</span></h2>
        {admin && <div className="flex flex-wrap gap-2">
          <button className="btn-p" onClick={() => setEdit({ ...EMPTY })}>＋ Nuevo</button>
          <label className="btn-s cursor-pointer">⬆️ Importar CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={importCsv} /></label>
          <button className="btn-s" onClick={tmpl}>Plantilla CSV</button>
          <Link className="btn-s" href={`/carnets?${sel.size ? 'ids=' + [...sel].join(',') : 'aula=' + encodeURIComponent(aula)}`}>🪪 Carnets QR {sel.size ? `(${sel.size})` : aula ? `(${aula})` : '(todos)'}</Link>
        </div>}
      </div>
      <Msg m={msg} />
      <div className="card !p-3 grid sm:grid-cols-3 gap-2">
        <input className="inp" placeholder="Buscar por DNI o nombre" value={qs} onChange={(e) => setQs(e.target.value)} />
        <AulaSelect aulas={aulas} value={aula} onChange={setAula} />
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={inact} onChange={(e) => setInact(e.target.checked)} /> Mostrar retirados</label>
      </div>
      <div className="card !p-0 overflow-x-auto"><table className="tbl"><thead><tr>{admin && <th></th>}<th>Estudiante</th><th>DNI</th><th>Aula</th><th>Apoderado</th><th></th></tr></thead><tbody>
        {list.map((s) => <tr key={s.id} className={s.activo ? '' : 'opacity-50'}>
          {admin && <td><input type="checkbox" checked={sel.has(s.id)} onChange={() => toggle(s.id)} /></td>}
          <td><button className="font-semibold text-left text-indigo-700 hover:underline" onClick={() => api('/api/students/' + s.id).then(setDetail)}>{s.apellidos}, {s.nombres}</button>{!s.activo && <span className="chip bg-slate-200 ml-1">retirado</span>}</td>
          <td className="text-xs">{s.dni}</td><td className="text-xs">{s.grado} {s.seccion}{s.aula && ` · ${s.aula}`}</td>
          <td className="text-xs">{s.apoderado_nombre}<br /><span className="text-slate-400">{s.apoderado_email}{s.apoderado_telefono && ` · ${s.apoderado_telefono}`}</span></td>
          <td className="whitespace-nowrap">{admin && <button className="btn-s !px-2 !py-1" onClick={() => api('/api/students/' + s.id).then((d) => setEdit(d.student))}>✏️</button>}</td>
        </tr>)}
        {!list.length && <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay estudiantes. {admin && 'Agrega uno o importa un CSV.'}</td></tr>}
      </tbody></table></div>
      {edit && <EditModal s={edit} onClose={() => setEdit(null)} onSaved={(m) => { setEdit(null); setMsg(m); load(); }} />}
      {detail && <Detail d={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
function EditModal({ s, onClose, onSaved }) {
  const [f, setF] = useState({ ...EMPTY, ...s, hora_entrada: s.hora_entrada || '', hora_salida: s.hora_salida || '' }); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const save = async (e) => { e.preventDefault(); setErr('');
    try { const b = { ...f }; if (s.foto === f.foto && s.id) delete b.foto;
      if (s.id) await api('/api/students/' + s.id, { method: 'PUT', body: b }); else await api('/api/students', { method: 'POST', body: b });
      onSaved('✅ Estudiante guardado'); } catch (er) { setErr(er.message); } };
  const fld = (k, l, p = {}) => <div><label className="lbl">{l}</label><input className="inp" value={f[k] || ''} onChange={set(k)} {...p} /></div>;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-2 overflow-y-auto" onClick={onClose}>
      <form onSubmit={save} className="bg-white rounded-xl p-5 w-full max-w-2xl space-y-3 my-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{s.id ? 'Editar estudiante' : 'Nuevo estudiante'}</h3>
        <div className="flex gap-4 items-center">
          {f.foto ? <img src={f.foto} alt="" className="w-20 h-20 rounded-lg object-cover" /> : <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-3xl">👤</div>}
          <div className="space-x-2"><label className="btn-s cursor-pointer">📸 Foto<input type="file" accept="image/*" capture="user" className="hidden" onChange={async (e) => { const fl = e.target.files?.[0]; if (fl) setF({ ...f, foto: await resizePhoto(fl) }); }} /></label>
            {f.foto && <button type="button" className="btn-s" onClick={() => setF({ ...f, foto: null })}>Quitar</button>}</div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {fld('dni', 'DNI / CE *', { required: true, inputMode: 'numeric' })}{fld('nombres', 'Nombres *', { required: true })}{fld('apellidos', 'Apellidos *', { required: true })}
          {fld('grado', 'Grado / nivel', { placeholder: 'Ej. 3 años, 1ro Primaria' })}{fld('seccion', 'Sección', { placeholder: 'A' })}{fld('aula', 'Aula / turno', { placeholder: 'Opcional' })}
        </div>
        <p className="text-xs font-bold text-slate-500 pt-2">APODERADO</p>
        <div className="grid sm:grid-cols-3 gap-3">{fld('apoderado_nombre', 'Nombre')}{fld('apoderado_email', 'Correo (recibe avisos)', { type: 'email' })}{fld('apoderado_telefono', 'Celular', { inputMode: 'tel' })}</div>
        <p className="text-xs font-bold text-slate-500 pt-2">HORARIO PROPIO (opcional; si se deja vacío usa el general)</p>
        <div className="grid grid-cols-2 gap-3">{fld('hora_entrada', 'Entrada', { type: 'time' })}{fld('hora_salida', 'Salida', { type: 'time' })}</div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex flex-wrap gap-2 justify-between pt-2">
          <div className="flex gap-2">{s.id && <>
            <button type="button" className="btn-s" onClick={async () => { await api('/api/students/' + s.id, { method: 'PUT', body: { activo: !s.activo } }); onSaved(s.activo ? '✅ Marcado como retirado' : '✅ Reactivado'); }}>{s.activo ? 'Marcar retirado' : 'Reactivar'}</button>
            <button type="button" className="btn-s" onClick={async () => { if (confirm('¿Anular el QR actual y generar uno nuevo? El carnet impreso anterior dejará de funcionar.')) { await api(`/api/students/${s.id}/qr`, { method: 'POST' }); onSaved('✅ Nuevo QR generado. Reimprima el carnet.'); } }}>🔄 Nuevo QR</button>
            <button type="button" className="btn-d" onClick={async () => { if (confirm('¿Eliminar definitivamente al estudiante y TODO su historial?')) { await api('/api/students/' + s.id, { method: 'DELETE' }); onSaved('✅ Eliminado'); } }}>Eliminar</button></>}</div>
          <div className="flex gap-2"><button type="button" className="btn-s" onClick={onClose}>Cancelar</button><button className="btn-p">Guardar</button></div>
        </div>
      </form>
    </div>
  );
}
function Detail({ d, onClose }) {
  const s = d.student;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start sm:items-center justify-center p-2 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-xl my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-4 items-center mb-3">{s.foto ? <img src={s.foto} alt="" className="w-16 h-16 rounded-lg object-cover" /> : <div className="text-4xl">👤</div>}
          <div><h3 className="font-bold">{s.apellidos}, {s.nombres}</h3><p className="text-xs text-slate-500">{s.dni} · {s.grado} {s.seccion} · {s.apoderado_nombre} {s.apoderado_telefono}</p></div></div>
        <h4 className="text-xs font-bold text-slate-500 mb-1">ÚLTIMAS MARCAS</h4>
        <div className="max-h-80 overflow-y-auto"><table className="tbl"><tbody>{d.historial.map((h) => <tr key={h.id}><td className="text-xs">{new Date(h.ts).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</td>
          <td className={h.tipo === 'INGRESO' ? 'text-emerald-600 text-xs font-bold' : 'text-sky-600 text-xs font-bold'}>{h.tipo}</td><td className="text-xs">{h.tarde && `⏰ ${h.minutos_tarde} min`}{h.anticipado && `🚸 ${h.recoge_nombre || 'anticipada'}`}</td></tr>)}
          {!d.historial.length && <tr><td className="text-slate-400 text-xs">Sin registros</td></tr>}</tbody></table></div>
        <div className="text-right mt-3"><button className="btn-s" onClick={onClose}>Cerrar</button></div>
      </div>
    </div>
  );
}
