// API de tareas para Cloudflare Pages Functions + D1 (binding: DB).
// GET  /api/tareas  -> { inicializado, tareas: [...] }
// PUT  /api/tareas  -> reemplaza todas las tareas con { tareas: [...] }
//
// Tarea: { titulo, proyecto, prioridad, fecha, estado, asignado, hecha, pasos: [{ t, ok, a }] }
//   estado:  'pendiente' | 'curso' | 'revision' | 'hecho'   ("hecha" se mantiene como 0/1 por compatibilidad)
//   asignado / a: nombre de la persona responsable de la tarea / del paso

const PRIORIDADES = ['alta', 'media', 'baja'];
const ESTADOS = ['pendiente', 'curso', 'revision', 'hecho'];
const MAX_TAREAS = 500;
const MAX_PASOS = 100;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Si el cliente no manda estado (versión anterior de la página) se deduce de "hecha" y de los pasos.
function estadoDe(t, pasos) {
  if (ESTADOS.includes(t.estado)) return t.estado;
  if (t.hecha) return 'hecho';
  return pasos.some((p) => p.ok) ? 'curso' : 'pendiente';
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB
    .prepare('SELECT titulo, proyecto, prioridad, fecha, hecha, pasos, estado, asignado FROM tareas ORDER BY orden')
    .all();
  const meta = await env.DB.prepare("SELECT v FROM meta WHERE k = 'inicializado'").first();
  return json({
    inicializado: Boolean(meta),
    tareas: results.map((r) => {
      const pasos = JSON.parse(r.pasos || '[]');
      const estado = estadoDe(r, pasos);
      return { ...r, estado, hecha: estado === 'hecho' ? 1 : 0, pasos };
    }),
  });
}

export async function onRequestPut({ request, env }) {
  // Solo acepta escrituras que vengan de la propia página.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ error: 'origen no permitido' }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, 400);
  }
  if (!body || !Array.isArray(body.tareas) || body.tareas.length > MAX_TAREAS) {
    return json({ error: 'tareas inválidas' }, 400);
  }

  const insert = env.DB.prepare(
    'INSERT INTO tareas (orden, hecha, titulo, proyecto, prioridad, fecha, pasos, estado, asignado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const stmts = [env.DB.prepare('DELETE FROM tareas')];

  body.tareas.forEach((t, i) => {
    const pasos = (Array.isArray(t.pasos) ? t.pasos : []).slice(0, MAX_PASOS).map((p) => ({
      t: texto(p && p.t, 160),
      ok: Boolean(p && p.ok),
      a: texto(p && p.a, 60),
    }));
    const fecha = /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) ? t.fecha : '';
    const estado = estadoDe(t, pasos);
    stmts.push(
      insert.bind(
        i,
        estado === 'hecho' ? 1 : 0,
        texto(t.titulo, 140) || '(sin título)',
        texto(t.proyecto, 60),
        PRIORIDADES.includes(t.prioridad) ? t.prioridad : 'media',
        fecha,
        JSON.stringify(pasos),
        estado,
        texto(t.asignado, 60)
      )
    );
  });
  stmts.push(env.DB.prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('inicializado', '1')"));

  await env.DB.batch(stmts);
  return json({ ok: true, total: body.tareas.length });
}
