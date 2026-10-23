'use client';
import { useState, useEffect } from 'react';
import { api } from '@/components/ui';
export default function Login() {
  const [f, setF] = useState({ username: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/setup').then((d) => d.needed && (location.href = '/setup')).catch(() => {}); }, []);
  const go = async (e) => { e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); location.href = '/'; } catch (e) { setErr(e.message); setBusy(false); } };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-indigo-700 p-4">
      <form onSubmit={go} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center"><div className="text-4xl">🔳</div><h1 className="text-xl font-bold text-indigo-900">AsistenciaQR</h1>
          <p className="text-xs text-slate-500">I.E. 1140 Aurelio Miró Quesada · Acceso del personal</p></div>
        <div><label className="lbl">Usuario</label><input className="inp" autoComplete="username" autoCapitalize="none" value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} required /></div>
        <div><label className="lbl">Contraseña</label><input className="inp" type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required /></div>
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button className="btn-p w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
