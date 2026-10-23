# AsistenciaQR — I.E. 1140 Aurelio Miró Quesada (La Molina)
Sistema de control de ingreso y salida con carnet QR, historial, tardanzas y correo al apoderado.
Hecho con Next.js, Postgres (Neon) y Resend, y alojado en Vercel.

## 1. Lo que necesitas (todo tiene plan gratuito)
- Una cuenta de **GitHub** (https://github.com).
- Una cuenta de **Vercel** (https://vercel.com); entra con tu GitHub.
- Una cuenta de **Resend** (https://resend.com) para enviar los correos.

## 2. Subir el código a GitHub
1. Descomprime `ei1140-asistencia.zip`.
2. En GitHub crea un repositorio privado llamado `ei1140-asistencia`. Usa *Add file → Upload files*, arrastra el contenido de la carpeta y pulsa *Commit*.
   - Si usas la terminal, ejecuta `git init && git add . && git commit -m inicial && git remote add origin <url> && git push -u origin main`.

## 3. Crear el proyecto en Vercel
1. Ve a Vercel → **Add New → Project** e importa el repositorio. El framework *Next.js* se detecta solo.
2. **No pulses Deploy todavía.** Primero crea la base de datos (paso 4) y las variables (paso 6).
   - Otra opción es la CLI: `npm i -g vercel && vercel` dentro de la carpeta.

## 4. Base de datos (Neon)
1. En el proyecto de Vercel ve a **Storage → Create Database → Neon (Postgres)**, región *Washington (iad1)* u otra cercana, y conéctala al proyecto.
2. Esto crea la variable `DATABASE_URL` automáticamente. Si Neon la llamó `POSTGRES_URL`, copia ese valor en una variable nueva llamada `DATABASE_URL`.
3. Las tablas se crean solas en el primer uso, así que no hay que ejecutar ningún SQL.

## 5. Correos (Resend)
1. En Resend ve a **API Keys → Create API Key** y copia la clave (`re_...`).
2. **Dominio:** sin dominio propio, Resend solo envía desde `onboarding@resend.dev` y **solo a tu propio correo**, lo que sirve para probar.
   - Para enviar a los apoderados ve a **Domains → Add domain** (por ejemplo `ie1140.edu.pe` o un dominio barato) y agrega los registros DNS que te muestra (SPF/DKIM).
   - Cuando el dominio aparezca *Verified*, usa por ejemplo `MAIL_FROM=Colegio 1140 <asistencia@tudominio.pe>`.
3. Otra opción es usar SMTP (por ejemplo una cuenta de Gmail con "contraseña de aplicación") con las variables `SMTP_*`. Resend tiene prioridad si están ambos.

## 6. Variables de entorno (Vercel → Settings → Environment Variables)
| Variable | Valor |
|---|---|
| `DATABASE_URL` | La crea Neon |
| `APP_SECRET` | Texto aleatorio largo (32 o más caracteres). Puedes generarlo en https://generate-secret.vercel.app/32. **No lo cambies nunca después de imprimir los carnets**, porque los QR dejarían de valer. |
| `ADMIN_SETUP_KEY` | Una clave que inventas, solo para crear el primer administrador |
| `RESEND_API_KEY` | `re_...` |
| `MAIL_FROM` | `I.E. 1140 <asistencia@tudominio.pe>` (o `onboarding@resend.dev` para probar) |
| `MAIL_REPLY_TO` | Opcional. Correo que recibe las respuestas de los apoderados, p. ej. `ieaureliomiroquesada1140@gmail.com` |
| `CRON_SECRET` | Otro texto aleatorio (protege el aviso automático de faltas) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Opcionales, solo para usar SMTP |

Después pulsa **Deploy** (o, en *Deployments*, **Redeploy** si ya se había desplegado).

## 7. Primer ingreso
1. Abre `https://tu-proyecto.vercel.app/setup`.
2. Escribe la `ADMIN_SETUP_KEY`, tu nombre, un usuario y una contraseña (mínimo 8 caracteres). Esta página solo funciona una vez.
3. Entra y ve a **Ajustes**:
   - revisa el nombre del colegio, la hora de entrada, la tolerancia y la hora de salida;
   - activa o desactiva los correos;
   - carga los feriados del Perú;
   - crea usuarios **auxiliar** para la puerta (pueden escanear y ver datos, pero no editar estudiantes ni ajustes).
4. En Ajustes → Correos usa **Enviar prueba** para comprobar que llegan.

## 8. Cargar estudiantes
- Uno por uno: **Estudiantes → Nuevo**. Puedes poner una foto desde el celular.
- Masivo: **Estudiantes → Importar CSV**. Descarga la plantilla y llénala en Excel. Guárdala como CSV; acepta coma o punto y coma.
  - Columnas: `dni, nombres, apellidos, grado, seccion, aula, apoderado_nombre, apoderado_email, apoderado_telefono, hora_entrada, hora_salida`.
  - Si un DNI ya existe, ese estudiante se actualiza.

## 9. Carnets
En **Estudiantes**, selecciona los que quieras (o todos) y pulsa **Carnets → Imprimir**.
- Imprime al 100 % en cartulina. El tamaño es el de una tarjeta (8.5 × 5.4 cm).
- Si un carnet se pierde, usa **Nuevo QR** en la ficha del estudiante: el carnet anterior deja de funcionar.

## 10. Uso diario en la puerta
- Abre **Escáner** en el celular (Chrome o Safari) y permite el uso de la cámara. Funciona porque Vercel usa HTTPS.
- En modo **Automático**, la primera lectura del día es INGRESO y la siguiente es SALIDA. Suena un pitido y el celular vibra.
  - Si el mismo carnet se lee de nuevo en menos de 3 minutos, no se registra dos veces.
- **Búsqueda manual:** sirve cuando el alumno olvidó su carnet, o para un retiro anticipado indicando quién lo recoge.
- El apoderado recibe un correo con la hora (hora de Lima) de ingreso y de salida.
  - Si un envío falla, se reintenta solo. El estado se ve en Historial y en Ajustes → Correos.
- **Hoy** muestra presentes, ausentes, tardanzas y quién no ha salido aún.
- **Historial** se puede filtrar y exportar a CSV o a PDF (con Imprimir → Guardar como PDF).
- **Reportes** tiene las tardanzas por alumno, aula y día, las faltas y las justificaciones.

## 11. Aviso de faltas (opcional)
Actívalo en Ajustes. Vercel ejecuta `/api/cron` de lunes a viernes a las 10:30 (hora de Lima) y envía un correo a los apoderados de los alumnos sin ingreso, excepto en feriados y faltas justificadas.
- En el plan gratuito (Hobby), Vercel solo permite un cron al día.
- Los correos pendientes también se reintentan cada vez que alguien tiene abierta la pantalla **Hoy**.

## 12. Pruebas locales (opcional, para técnicos)
```
npm install
cp .env.example .env.local   # pon DATABASE_URL de un Postgres local y MAIL_MODE=log
npm run build && npm start
node scripts/smoke.mjs        # 37 pruebas automáticas (con la BD vacía)
```
Con `MAIL_MODE=log` los correos no se envían; solo quedan registrados.
