'use client';
import { useEffect, useState } from 'react';
import Shell, { useMe } from '@/components/Shell';
import { api, Msg } from '@/components/ui';
export default function Page() { return <Shell admin><Aj /></Shell>; }
function Aj() {
  const [tab, setTab] = useState('general');
  return (<div className="space-y-4">
    <div className="flex flex-wrap gap-2">{[['general', '🏫 General y horario'], ['feriados', '📅 Feriados'], ['usuarios', '👥 Usuarios'], ['correos', '✉️ Correos'], ['auditoria', '🛡️ Auditoría']].map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`btn ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{l}</button>)}</div>
    {tab === 'general' && <General />}{tab === 'feriados' && <Feriados />}{tab === 'usuarios' && <Usuarios />}{tab === 'correos' && <Correos />}{tab === 'auditoria' && <Auditoria />}
  </div>);
}
function General() {
  const [s, setS] = useState(null); const [msg, setMsg] = useState('');
  useEffect(() => { api('/api/settings').then(setS); }, []);
  if (!s) return null;
  const set = (k, v) => setS({ ...s, [k]: v });
  const save = async (e) => { e.preventDefault(); try { setS(await api('/api/settings', { method: 'PUT', body: s })); setMsg('✅ Ajustes guardados'); } catch (er) { setMsg('❌ ' + er.message); } };
  const D = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return (<form onSubmit={save} className="card space-y-4 max-w-2xl">
    <div className="grid sm:grid-cols-2 gap-3">
      <div><label className="lbl">Nombre de la institución</label><input className="inp" value={s.school_name} onChange={(e) => set('school_name', e.target.value)} /></div>
      <div><label className="lbl">Lugar</label><input className="inp" value={s.school_place} onChange={(e) => set('school_place', e.target.value)} /></div>
      <div><label className="lbl">Hora de entrada</label><input type="time" className="inp" value={s.hora_entrada} onChange={(e) => set('hora_entrada', e.target.value)} /></div>
      <div><label className="lbl">Tolerancia (minutos)</label><input type="number" min="0" max="120" className="inp" value={s.tolerancia} onChange={(e) => set('tolerancia', e.target.value)} /></div>
      <div><label className="lbl">Hora de salida (antes = retiro anticipado)</label><input type="time" className="inp" value={s.hora_salida} onChange={(e) => set('hora_salida', e.target.value)} /></div>
      <div><label className="lbl">Ignorar lectura repetida durante (min)</label><input type="number" min="0" max="60" className="inp" value={s.dedupe_min} onChange={(e) => set('dedupe_min', e.target.value)} /></div>
      <div><label className="lbl">Mínimo entre ingreso y salida (min)</label><input type="number" min="0" max="600" className="inp" value={s.min_entre_ingreso_salida} onChange={(e) => set('min_entre_ingreso_salida', e.target.value)} /></div>
    </div>
    <div><label className="lbl">Días lectivos</label><div className="flex flex-wrap gap-2">{D.map((d, i) => <label key={i} className="text-sm flex items-center gap-1"><input type="checkbox" checked={s.dias_lectivos.includes(i)} onChange={(e) => set('dias_lectivos', e.target.checked ? [...s.dias_lectivos, i] : s.dias_lectivos.filter((x) => x !== i))} />{d}</label>)}</div></div>
    <div className="space-y-1"><label className="lbl">Correos al apoderado</label>
      {[['notify_ingreso', 'Avisar el ingreso (con hora)'], ['notify_salida', 'Avisar la salida (con hora)'], ['notify_falta', 'Avisar inasistencia (se envía una vez al día por el cron, ~10:30 a. m.)']].map(([k, l]) => <label key={k} className="text-sm flex items-center gap-2"><input type="checkbox" checked={s[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>)}</div>
    <Msg m={msg} /><button className="btn-p">Guardar ajustes</button>
  </form>);
}
function Feriados() {
  const [rows, setRows] = useState([]); const [n, setN] = useState({ fecha: '', descripcion: '' });
  const load = () => api('/api/holidays').then((d) => setRows(d.rows)); useEffect(() => { load(); }, []);
  const y = new Date().getFullYear();
  return (<div className="card max-w-2xl space-y-3">
    <div className="flex flex-wrap gap-2 items-end"><div><label className="lbl">Fecha</label><input type="date" className="inp" value={n.fecha} onChange={(e) => setN({ ...n, fecha: e.target.value })} /></div>
      <div className="flex-1"><label className="lbl">Descripción</label><input className="inp" placeholder="Ej. Vacaciones de medio año, Día del Maestro" value={n.descripcion} onChange={(e) => setN({ ...n, descripcion: e.target.value })} /></div>
      <button className="btn-p" onClick={async () => { await api('/api/holidays', { method: 'POST', body: n }); setN({ fecha: '', descripcion: '' }); load(); }}>Agregar</button>
      <button className="btn-s" onClick={async () => { await api('/api/holidays', { method: 'POST', body: { preset: 'peru', year: y } }); load(); }}>＋ Feriados nacionales {y}</button>
      <button className="btn-s" onClick={async () => { await api('/api/holidays', { method: 'POST', body: { preset: 'peru', year: y + 1 } }); load(); }}>{y + 1}</button></div>
    <table className="tbl"><tbody>{rows.map((r) => <tr key={r.fecha}><td className="text-sm">{r.fecha}</td><td className="text-sm">{r.descripcion}</td><td><button className="text-rose-500 text-xs" onClick={async () => { await api('/api/holidays?fecha=' + r.fecha, { method: 'DELETE' }); load(); }}>✕</button></td></tr>)}</tbody></table>
  </div>);
}
function Usuarios() {
  const me = useMe(); const [rows, setRows] = useState([]); const [n, setN] = useState({ nombre: '', username: '', password: '', role: 'auxiliar' }); const [msg, setMsg] = useState('');
  const load = () => api('/api/users').then((d) => setRows(d.rows)); useEffect(() => { load(); }, []);
  const add = async (e) => { e.preventDefault(); try { await api('/api/users', { method: 'POST', body: n }); setMsg('✅ Usuario creado'); setN({ nombre: '', username: '', password: '', role: 'auxiliar' }); load(); } catch (er) { setMsg('❌ ' + er.message); } };
  const upd = async (id, b) => { try { await api('/api/users/' + id, { method: 'PUT', body: b }); setMsg('✅ Actualizado'); load(); } catch (er) { setMsg('❌ ' + er.message); } };
  return (<div className="grid lg:grid-cols-3 gap-4">
    <form onSubmit={add} className="card space-y-2"><h3 className="font-bold text-sm">Nuevo usuario</h3>
      <input className="inp" placeholder="Nombre completo" value={n.nombre} onChange={(e) => setN({ ...n, nombre: e.target.value })} required />
      <input className="inp" placeholder="usuario (sin espacios)" autoCapitalize="none" value={n.username} onChange={(e) => setN({ ...n, username: e.target.value })} required />
      <input className="inp" type="password" placeholder="Contraseña (mín. 8)" value={n.password} onChange={(e) => setN({ ...n, password: e.target.value })} required />
      <select className="inp" value={n.role} onChange={(e) => setN({ ...n, role: e.target.value })}><option value="auxiliar">Auxiliar (escanea, ve reportes, justifica)</option><option value="admin">Administrador (todo)</option></select>
      <Msg m={msg} /><button className="btn-p w-full">Crear</button></form>
    <div className="card !p-0 lg:col-span-2 overflow-x-auto"><table className="tbl"><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      {rows.map((u) => <tr key={u.id}><td>{u.nombre}</td><td className="text-xs">{u.username}</td>
        <td><select className="inp !py-1 !w-auto" value={u.role} disabled={u.id === me.user.id} onChange={(e) => upd(u.id, { role: e.target.value })}><option value="auxiliar">auxiliar</option><option value="admin">admin</option></select></td>
        <td>{u.activo ? <span className="chip bg-emerald-100 text-emerald-700">activo</span> : <span className="chip bg-slate-200">inactivo</span>}</td>
        <td className="whitespace-nowrap"><button className="btn-s !px-2 !py-1 text-xs" onClick={() => { const p = prompt('Nueva contraseña (mín. 8):'); if (p) upd(u.id, { password: p }); }}>🔑</button>
          {u.id !== me.user.id && <button className="btn-s !px-2 !py-1 text-xs ml-1" onClick={() => upd(u.id, { activo: !u.activo })}>{u.activo ? 'Desactivar' : 'Activar'}</button>}</td></tr>)}
    </tbody></table></div></div>);
}
function Correos() {
  const [d, setD] = useState(null); const [to, setTo] = useState(''); const [msg, setMsg] = useState(''); const [st, setSt] = useState('');
  const load = () => api('/api/emails?estado=' + st).then(setD); useEffect(() => { load(); }, [st]);
  const act = async (b) => { try { const r = await api('/api/emails', { method: 'POST', body: b }); setMsg(b.action === 'prueba' ? (r.prueba?.status === 'enviado' ? '✅ Correo de prueba enviado' : '❌ No se pudo enviar: ' + (r.prueba?.last_error || r.prueba?.status)) : `✅ ${r.enviados} enviados`); load(); } catch (er) { setMsg('❌ ' + er.message); } };
  if (!d) return null;
  return (<div className="space-y-3">
    <div className="card flex flex-wrap gap-2 items-end">
      <p className="text-sm w-full">Proveedor: <b>{{ resend: 'Resend', smtp: 'SMTP', log: 'modo prueba (no envía)', none: '⚠️ ninguno configurado' }[d.modo]}</b></p>
      <input className="inp !w-64" type="email" placeholder="tu@correo.com" value={to} onChange={(e) => setTo(e.target.value)} />
      <button className="btn-p" onClick={() => act({ action: 'prueba', to })}>Enviar prueba</button>
      <button className="btn-s" onClick={() => act({ action: 'procesar' })}>Procesar cola</button>
      <button className="btn-s" onClick={() => act({ action: 'reintentar' })}>Reintentar fallidos</button>
      <select className="inp !w-auto" value={st} onChange={(e) => setSt(e.target.value)}><option value="">Todos</option><option>enviado</option><option>pendiente</option><option>fallido</option></select>
      <div className="w-full"><Msg m={msg} /></div></div>
    <div className="card !p-0 overflow-x-auto"><table className="tbl"><thead><tr><th>Creado</th><th>Para</th><th>Asunto</th><th>Estado</th><th>Enviado</th></tr></thead><tbody>
      {d.rows.map((r) => <tr key={r.id}><td className="text-xs whitespace-nowrap">{r.creado}</td><td className="text-xs">{r.to_addr}</td><td className="text-xs">{r.subject}</td>
        <td><span className={`chip ${{ enviado: 'bg-emerald-100 text-emerald-700', fallido: 'bg-rose-100 text-rose-700' }[r.status] || 'bg-amber-100 text-amber-700'}`}>{r.status}</span>{r.last_error && <p className="text-[10px] text-rose-500">{r.last_error}</p>}</td><td className="text-xs">{r.enviado}</td></tr>)}
    </tbody></table></div></div>);
}
function Auditoria() {
  const [rows, setRows] = useState([]); const [qs, setQs] = useState('');
  useEffect(() => { const t = setTimeout(() => api('/api/audit?q=' + encodeURIComponent(qs)).then((d) => setRows(d.rows)), 250); return () => clearTimeout(t); }, [qs]);
  return (<div className="space-y-2"><input className="inp max-w-sm" placeholder="Filtrar (usuario, acción, DNI…)" value={qs} onChange={(e) => setQs(e.target.value)} />
    <div className="card !p-0 overflow-x-auto"><table className="tbl"><thead><tr><th>Fecha (Lima)</th><th>Usuario</th><th>Acción</th><th>Detalle</th><th>IP</th></tr></thead><tbody>
      {rows.map((r) => <tr key={r.id}><td className="text-xs whitespace-nowrap">{r.fecha}</td><td className="text-xs">{r.usuario}</td><td className="text-xs font-semibold">{r.accion}</td><td className="text-xs">{r.detalle}</td><td className="text-[10px] text-slate-400">{r.ip}</td></tr>)}
    </tbody></table></div></div>);
}
