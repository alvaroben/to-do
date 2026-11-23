// Colección de tareas.
//   GET  /api/tareas   -> 200 [ tarea, ... ]            (ordenadas por "orden")
//   POST /api/tareas   -> 201 tarea (Location: /api/tareas/:id)   cuerpo: { titulo, proyecto?, prioridad?, fecha?, estado?, asignado?, pasos? }
//
// Una tarea concreta: ver [id].js. Reordenar: ver orden.js.

import { MAX_TAREAS, aTarea, error, json, leerJson, metodoNoPermitido, origenValido, validar } from '../../../lib/tareas.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM tareas ORDER BY orden, id').all();
  return json(results.map(aTarea));
}

export async function onRequestPost({ request, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const { body, fallo } = await leerJson(request);
  if (fallo) return fallo;
  const { datos, fallo: invalido } = validar(body, true);
  if (invalido) return invalido;

  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM tareas').first();
  if (n >= MAX_TAREAS) return error(409, `límite de ${MAX_TAREAS} tareas alcanzado`);

  const fila = await env.DB
    .prepare(
      `INSERT INTO tareas (orden, hecha, titulo, proyecto, prioridad, fecha, pasos, estado, asignado)
       VALUES ((SELECT COALESCE(MAX(orden), -1) + 1 FROM tareas), ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .bind(
      datos.estado === 'hecho' ? 1 : 0,
      datos.titulo,
      datos.proyecto,
      datos.prioridad,
      datos.fecha,
      JSON.stringify(datos.pasos),
      datos.estado,
      datos.asignado
    )
    .first();

  const tarea = aTarea(fila);
  const respuesta = json(tarea, 201);
  respuesta.headers.set('Location', `/api/tareas/${tarea.id}`);
  return respuesta;
}

export const onRequest = () => metodoNoPermitido(['GET', 'POST']);
