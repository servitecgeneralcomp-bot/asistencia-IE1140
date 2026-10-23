// Prueba de humo contra un servidor local: node scripts/smoke.mjs  (BASE, APP_SECRET por env)
import crypto from 'crypto';
const BASE = process.env.BASE || 'http://localhost:3100';
const SECRET = process.env.APP_SECRET; let cookie = ''; let pass = 0, fail = 0;
async function call(method, path, body, raw) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: BASE }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  return raw ? { status: r.status, text: await r.text() } : { status: r.status, ...(await r.json().catch(() => ({}))) };
}
const ok = (c, m) => { c ? pass++ : fail++; console.log(c ? '  ✓' : '  ✗', m); };
const tok = (id, nonce) => `EI1140.${id}.` + crypto.createHmac('sha256', SECRET).update(`qr:${id}:${nonce}`).digest('base64url').slice(0, 22);

ok((await call('GET', '/api/dashboard')).status === 401, 'API protegida sin sesión');
ok((await call('POST', '/api/setup', { setupKey: 'mala', username: 'admin', password: 'Admin12345' })).status === 403, 'setup rechaza clave incorrecta');
ok((await call('POST', '/api/setup', { setupKey: 'clave-instalacion', nombre: 'Directora', username: 'admin', password: 'Admin12345' })).ok, 'crea primer admin');
ok((await call('POST', '/api/setup', { setupKey: 'clave-instalacion', username: 'otro', password: 'Admin12345' })).status === 409, 'setup no se repite');
ok((await call('PUT', '/api/settings', { hora_entrada: '07:30', tolerancia: 10, hora_salida: '23:30', dedupe_min: 3, min_entre_ingreso_salida: 0 })).hora_entrada === '07:30', 'guarda ajustes');
ok((await call('POST', '/api/users', { nombre: 'Auxiliar Puerta', username: 'auxiliar1', password: 'Puerta2026', role: 'auxiliar' })).ok, 'crea auxiliar');
const imp = await call('POST', '/api/students/import', { rows: [
  { dni: '71234567', nombres: 'Ana Lucía', apellidos: 'Quispe Rojas', grado: '1ro Primaria', seccion: 'A', apoderado_nombre: 'Rosa Rojas', apoderado_email: 'rosa@example.com', apoderado_telefono: '987654321' },
  { dni: '72345678', nombres: 'Mateo', apellidos: 'Huamán Torres', grado: '1ro Primaria', seccion: 'A', apoderado_nombre: 'Luis Huamán', apoderado_email: 'luis@example.com' },
  { dni: '73456789', nombres: 'Valentina', apellidos: 'Flores Díaz', grado: '2do Primaria', seccion: 'B', apoderado_email: 'vale.mama@example.com' },
  { dni: '12', nombres: 'Mal', apellidos: 'Dato' }] });
ok(imp.creados === 3 && imp.errores.length === 1, `importa CSV (3 nuevos, 1 error): ${JSON.stringify(imp)}`);
const st = await call('POST', '/api/students', { dni: '74567890', nombres: 'Sebastián', apellidos: 'Ramos Paz', grado: '2do Primaria', seccion: 'B', apoderado_nombre: 'Carla Paz', apoderado_email: 'carla@example.com', hora_entrada: '23:59' });
ok(st.ok, 'crea estudiante con horario propio');
ok((await call('POST', '/api/students', { dni: '74567890', nombres: 'X', apellidos: 'Y' })).status === 409, 'rechaza DNI duplicado');
ok((await call('PUT', '/api/students/' + st.id, { dni: '74567890', nombres: 'Sebastián', apellidos: 'Ramos Paz', grado: '2do Primaria', seccion: 'B', apoderado_email: 'carla@example.com', apoderado_nombre: 'Carla Paz', hora_entrada: '23:59' })).ok, 'edita estudiante');
const list = await call('GET', '/api/students?q=');
const ana = list.students.find((s) => s.dni === '71234567');
// tokens (el nonce no sale por la API; lo leemos de la BD de prueba)
const pg = (await import('pg')).default; const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect();
const nonces = Object.fromEntries((await db.query('SELECT id, qr_nonce FROM students')).rows.map((r) => [r.id, r.qr_nonce]));
ok((await call('GET', '/api/carnets?aula=')).carnets?.length === 4, 'genera carnets con QR');
await call('POST', '/api/auth/logout');
ok((await call('POST', '/api/auth/login', { username: 'auxiliar1', password: 'mal' })).status === 401, 'login incorrecto rechazado');
ok((await call('POST', '/api/auth/login', { username: 'auxiliar1', password: 'Puerta2026' })).ok, 'login auxiliar');
ok((await call('POST', '/api/students', { dni: '79999999', nombres: 'a', apellidos: 'b' })).status === 403, 'auxiliar no puede crear estudiantes');
let r = await call('POST', '/api/scan', { token: tok(ana.id, nonces[ana.id]) });
ok(r.ok && r.tipo === 'INGRESO' && r.tarde, `escaneo → INGRESO con tardanza (${r.minutos_tarde} min) ${r.error || ''}`);
r = await call('POST', '/api/scan', { token: tok(ana.id, nonces[ana.id]) });
ok(!r.ok && r.code === 'DUPLICADO', 'segunda lectura inmediata bloqueada (anti-duplicado): ' + r.error);
r = await call('POST', '/api/scan', { token: tok(ana.id, 'nonce-falso') });
ok(!r.ok && r.code === 'QR_INVALIDO', 'QR falsificado rechazado');
r = await call('POST', '/api/scan', { token: 'https://cualquier-cosa.com' });
ok(!r.ok && r.code === 'QR_INVALIDO', 'QR ajeno rechazado');
r = await call('POST', '/api/scan', { token: tok(st.id, nonces[st.id]) });
ok(r.ok && !r.tarde, 'horario propio: no es tardanza');
const mateo = list.students.find((s) => s.dni === '72345678');
r = await call('POST', '/api/scan', { studentId: mateo.id, tipo: 'INGRESO', nota: 'olvidó su carnet', force: true });
ok(r.ok, 'registro manual de ingreso');
// simular que el ingreso fue hace 5 min para probar salida automática
await db.query("UPDATE attendance SET ts = ts - interval '5 minutes' WHERE student_id=$1", [ana.id]);
r = await call('POST', '/api/scan', { token: tok(ana.id, nonces[ana.id]) });
ok(r.ok && r.tipo === 'SALIDA' && r.anticipado, 'modo automático → SALIDA (anticipada)');
r = await call('POST', '/api/scan', { studentId: mateo.id, tipo: 'SALIDA', recoge_nombre: 'Luis Huamán (DNI 40112233)', force: true });
ok(r.ok && r.anticipado, 'retiro anticipado con persona que recoge');
const d = await call('GET', '/api/dashboard');
ok(d.counts.presentes === 3 && d.counts.ausentes === 1 && d.counts.tarde === 2 && d.counts.sin_salida === 1, 'dashboard: ' + JSON.stringify(d.counts));
const h = await call('GET', '/api/attendance');
ok(h.total === 5 && h.rows.every((x) => x.registrado_por === 'Auxiliar Puerta'), 'historial con auditoría de quién registró');
const c = await call('GET', '/api/attendance?format=csv', null, true);
ok(c.text.includes('Quispe Rojas, Ana Lucía') && c.text.includes('Recogido por'), 'exporta CSV');
const t = await call('GET', '/api/reports/tardanzas');
ok(t.rows.length === 2, 'reporte de tardanzas');
const vale = list.students.find((s) => s.dni === '73456789');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
ok((await call('POST', '/api/justifications', { studentId: ana.id, fecha: today, tipo: 'TARDANZA', motivo: 'Cita médica' })).ok, 'justifica tardanza');
ok((await call('GET', '/api/reports/tardanzas')).rows.find((x) => x.dni === '71234567').justificadas === 1, 'tardanza aparece justificada');
const fa = await call('GET', '/api/reports/faltas');
ok(fa.rows.some((x) => x.dni === vale.dni) || fa.diasLectivos === 0, 'reporte de faltas');
await new Promise((s) => setTimeout(s, 800));
const em = (await db.query("SELECT to_addr, subject, status, html FROM emails ORDER BY id")).rows;
ok(em.length === 5 && em.every((e) => e.status === 'enviado'), `5 correos a apoderados enviados (modo prueba): ${em.map((e) => e.status).join(',')}`);
ok(em.some((e) => e.html.includes('Luis Huamán (DNI 40112233)')), 'correo de retiro incluye quién recoge');
ok(em[0].html.includes('Aurelio Miró Quesada') && /\d\d:\d\d/.test(em[0].subject), 'correo con nombre del colegio y hora: ' + em[0].subject);
ok((await call('GET', '/api/cron')).status === 401, 'cron protegido');
await call('POST', '/api/auth/logout');
for (let i = 0; i < 9; i++) await call('POST', '/api/auth/login', { username: 'admin', password: 'x' + i });
ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Admin12345' })).status === 429, 'límite de intentos de login');
await db.query("DELETE FROM rate_limits");
ok((await call('POST', '/api/auth/login', { username: 'admin', password: 'Admin12345' })).ok, 'login admin');
const au = await call('GET', '/api/audit');
ok(au.rows.some((x) => x.accion === 'qr_rechazado') && au.rows.some((x) => x.accion === 'login_fallido'), 'auditoría registra rechazos');
const x = await fetch(BASE + '/api/students', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: 'https://evil.com' }, body: '{}' });
ok(x.status === 403, 'bloquea peticiones de otro origen (CSRF)');
await db.end();
console.log(`\n${pass} pruebas OK, ${fail} fallidas`); process.exit(fail ? 1 : 0);
