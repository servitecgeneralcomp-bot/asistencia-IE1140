'use client';
import { useEffect, useRef, useState } from 'react';
import Shell from '@/components/Shell';
import { api } from '@/components/ui';
export default function Page() { return <Shell><Scanner /></Shell>; }

function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.value = ok ? 1046 : 220; o.type = ok ? 'sine' : 'square'; g.gain.value = 0.15; o.connect(g); g.connect(ctx.destination); o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, ok ? 160 : 450);
  } catch {}
  try { navigator.vibrate?.(ok ? 120 : [100, 60, 100, 60, 200]); } catch {}
}

function Scanner() {
  const [mode, setMode] = useState('AUTO'); const modeRef = useRef('AUTO'); modeRef.current = mode;
  const [cam, setCam] = useState('off'); const [res, setRes] = useState(null); const [lock, setLock] = useState(0);
  const [recent, setRecent] = useState([]); const [qs, setQs] = useState(''); const [found, setFound] = useState([]);
  const [manual, setManual] = useState(null);
  const scanner = useRef(null); const busy = useRef(false); const lastTok = useRef({ t: '', at: 0 });

  const send = async (payload) => {
    try {
      const r = await api('/api/scan', { method: 'POST', body: payload });
      setRes(r); beep(r.ok);
      if (r.ok) setRecent((x) => [{ ...r, k: Date.now() }, ...x].slice(0, 15));
      return r;
    } catch (e) { const r = { ok: false, error: e.message }; setRes(r); beep(false); return r; }
  };
  const onScan = async (text) => {
    const now = Date.now();
    if (busy.current) return;
    if (lastTok.current.t === text && now - lastTok.current.at < 8000) return; // mismo QR frente a la cámara
    busy.current = true; lastTok.current = { t: text, at: now };
    await send({ token: text, tipo: modeRef.current });
    let n = 3; setLock(n);
    const t = setInterval(() => { n--; setLock(n); if (n <= 0) { clearInterval(t); busy.current = false; } }, 1000);
  };
  const start = async () => {
    setCam('starting');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      scanner.current = new Html5Qrcode('reader');
      await scanner.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: (w, h) => { const s = Math.floor(Math.min(w, h) * 0.7); return { width: s, height: s }; } }, onScan, () => {});
      setCam('on');
    } catch (e) { setCam('off'); setRes({ ok: false, error: 'No se pudo abrir la cámara: ' + (e?.message || e) + '. Revisa los permisos del navegador (se requiere HTTPS).' }); }
  };
  const stop = async () => { try { await scanner.current?.stop(); } catch {} setCam('off'); };
  useEffect(() => () => { scanner.current?.stop().catch(() => {}); }, []);
  useEffect(() => {
    if (qs.trim().length < 2) { setFound([]); return; }
    const t = setTimeout(() => api('/api/students?q=' + encodeURIComponent(qs)).then((d) => setFound(d.students.filter((s) => s.activo).slice(0, 8))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [qs]);
  const fromFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const { Html5Qrcode } = await import('html5-qrcode');
    const h = new Html5Qrcode('file-reader');
    try { const txt = await h.scanFile(file, false); await send({ token: txt, tipo: mode }); } catch { setRes({ ok: false, error: 'No se encontró un QR en la imagen' }); beep(false); }
    e.target.value = '';
  };

  const ModeBtn = ({ m, label, cls }) => <button onClick={() => setMode(m)} className={`px-3 sm:px-4 py-2 rounded-md text-sm font-semibold ${mode === m ? cls + ' text-white shadow' : 'text-slate-600'}`}>{label}</button>;
  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <div className="card !p-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold">Modo:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg border">
            <ModeBtn m="AUTO" label="🔁 Automático" cls="bg-indigo-600" /><ModeBtn m="INGRESO" label="↘ Ingreso" cls="bg-emerald-600" /><ModeBtn m="SALIDA" label="↗ Salida" cls="bg-sky-600" />
          </div>
        </div>
        <div className="card text-center">
          <div className="relative bg-slate-900 rounded-xl overflow-hidden min-h-[300px] flex items-center justify-center">
            <div id="reader" className="w-full" />
            {cam !== 'on' && <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 p-6"><div className="text-5xl mb-2">📷</div><p className="text-sm">Presiona “Encender cámara” y apunta al QR del carnet</p></div>}
            {lock > 0 && res && <div className={`absolute inset-0 flex flex-col items-center justify-center text-white z-20 ${res.ok ? 'bg-emerald-900/85' : 'bg-rose-900/85'}`}>
              <div className="text-5xl">{res.ok ? '✅' : '⛔'}</div><p className="text-xl font-bold mt-2">{res.ok ? res.tipo : 'No registrado'}</p>
              <p className="text-sm">{res.student?.nombre || ''}</p><p className="text-xs mt-2 opacity-80">Siguiente en {lock}s…</p></div>}
          </div>
          <div id="file-reader" className="hidden" />
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            {cam === 'on' ? <button className="btn-s" onClick={stop}>⏹ Apagar cámara</button> : <button className="btn-p" onClick={start} disabled={cam === 'starting'}>🎥 {cam === 'starting' ? 'Abriendo…' : 'Encender cámara'}</button>}
            <label className="btn-s cursor-pointer">🖼️ Leer QR de foto<input type="file" accept="image/*" className="hidden" onChange={fromFile} /></label>
          </div>
        </div>
        <ResultCard res={res} />
      </div>
      <div className="space-y-4">
        <div className="card">
          <h3 className="font-bold text-sm mb-2">🔎 Registro manual (sin carnet)</h3>
          <input className="inp" placeholder="DNI o nombre del estudiante" value={qs} onChange={(e) => setQs(e.target.value)} />
          <div className="mt-2 space-y-1">{found.map((s) => <button key={s.id} onClick={() => setManual(s)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 border border-slate-100 text-sm"><b>{s.apellidos}, {s.nombres}</b><br /><span className="text-xs text-slate-500">{s.dni} · {s.grado} {s.seccion}</span></button>)}</div>
        </div>
        <div className="card"><h3 className="font-bold text-sm mb-2">Lecturas de esta sesión</h3>
          {recent.map((r) => <div key={r.k} className="flex justify-between text-xs py-1 border-b border-slate-100"><span><b className={r.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-sky-600'}>{r.tipo}</b> {r.student.nombre}</span><span>{r.hora}{r.tarde && ' ⏰'}</span></div>)}
          {!recent.length && <p className="text-xs text-slate-400">Nada aún</p>}
        </div>
      </div>
      {manual && <ManualModal s={manual} onClose={() => setManual(null)} onSend={async (p) => { const r = await send({ studentId: manual.id, ...p }); if (r.ok) { setManual(null); setQs(''); } return r; }} />}
    </div>
  );
}
function ResultCard({ res }) {
  if (!res) return <div className="card text-sm text-slate-400 text-center">Coloque el carnet QR frente a la cámara</div>;
  return (
    <div className={`card flex items-center gap-4 border-l-8 ${res.ok ? (res.tipo === 'INGRESO' ? 'border-l-emerald-500' : 'border-l-sky-500') : 'border-l-rose-500'}`}>
      {res.student?.foto ? <img src={res.student.foto} alt="" className="w-20 h-20 rounded-lg object-cover" /> : <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-3xl">{res.ok ? '🙂' : '⚠️'}</div>}
      <div className="min-w-0">
        <p className={`text-xs font-bold ${res.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{res.ok ? `${res.tipo} REGISTRADO · ${res.hora}` : 'NO REGISTRADO'}</p>
        <p className="text-lg font-bold truncate">{res.student?.nombre || '—'}</p>
        <p className="text-xs text-slate-500">{res.student?.aula} {res.student?.dni && `· ${res.student.dni}`}</p>
        {!res.ok && <p className="text-sm text-rose-600 mt-1">{res.error}</p>}
        {res.ok && res.tarde && <p className="text-sm text-amber-600 font-semibold">⏰ Tardanza: {res.minutos_tarde} min</p>}
        {res.ok && res.anticipado && <p className="text-sm text-amber-600">🚸 Salida antes de la hora</p>}
        {res.ok && <p className="text-[11px] text-slate-400">{res.student?.email ? '✉️ Aviso enviado al apoderado' : 'Sin correo de apoderado'}</p>}
      </div>
    </div>
  );
}
function ManualModal({ s, onClose, onSend }) {
  const [tipo, setTipo] = useState('INGRESO'); const [recoge, setRecoge] = useState(''); const [nota, setNota] = useState(''); const [err, setErr] = useState('');
  const go = async () => { setErr(''); const r = await onSend({ tipo, recoge_nombre: recoge, nota, force: true }); if (!r.ok) setErr(r.error); };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-2" onClick={onClose}>
      <div className="bg-white rounded-xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold">{s.apellidos}, {s.nombres}</h3><p className="text-xs text-slate-500">{s.dni} · {s.grado} {s.seccion} · Apoderado: {s.apoderado_nombre || '—'}</p>
        <div className="flex gap-2">{['INGRESO', 'SALIDA'].map((t) => <button key={t} onClick={() => setTipo(t)} className={`btn flex-1 ${tipo === t ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>{t}</button>)}</div>
        {tipo === 'SALIDA' && <div><label className="lbl">Persona que recoge (retiro anticipado)</label><input className="inp" value={recoge} onChange={(e) => setRecoge(e.target.value)} placeholder="Nombre y DNI de quien recoge" /></div>}
        <div><label className="lbl">Observación (opcional)</label><input className="inp" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. olvidó su carnet" /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <div className="flex gap-2 justify-end"><button className="btn-s" onClick={onClose}>Cancelar</button><button className="btn-p" onClick={go}>Registrar {tipo.toLowerCase()}</button></div>
      </div>
    </div>
  );
}
