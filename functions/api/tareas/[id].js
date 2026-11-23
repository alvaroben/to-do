// Una tarea.
//   GET    /api/tareas/:id  -> 200 tarea | 404
//   PUT    /api/tareas/:id  -> 200 tarea | 404 | 400   reemplaza la tarea completa (lo que no venga vuelve a su valor por defecto)
//   PATCH  /api/tareas/:id  -> 200 tarea | 404 | 400   actualiza solo los campos enviados
//   DELETE /api/tareas/:id  -> 204 | 404

import { aTarea, error, idDe, json, leerJson, metodoNoPermitido, noEncontrada, origenValido, sinContenido, validar } from '../../../lib/tareas.js';

export async function onRequestGet({ params, env }) {
  const id = idDe(params.id);
  if (id === null) return noEncontrada();
  const fila = await env.DB.prepare('SELECT * FROM tareas WHERE id = ?').bind(id).first();
  return fila ? json(aTarea(fila)) : noEncontrada();
}

async function actualizar({ request, params, env }, completa) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const id = idDe(params.id);
  if (id === null) return noEncontrada();
  const { body, fallo } = await leerJson(request);
  if (fallo) return fallo;
  const { datos, fallo: invalido } = validar(body, completa);
  if (invalido) return invalido;

  // Columnas a escribir (el JSON de "pasos" se guarda como texto y "hecha" sigue a "estado").
  const cols = { ...datos };
  if (cols.pasos !== undefined) cols.pasos = JSON.stringify(cols.pasos);
  if (cols.estado !== undefined) cols.hecha = cols.estado === 'hecho' ? 1 : 0;

  const nombres = Object.keys(cols);
  const fila = await env.DB
    .prepare(`UPDATE tareas SET ${nombres.map((c) => `${c} = ?`).join(', ')} WHERE id = ? RETURNING *`)
    .bind(...nombres.map((c) => cols[c]), id)
    .first();
  return fila ? json(aTarea(fila)) : noEncontrada();
}

export const onRequestPut = (ctx) => actualizar(ctx, true);
export const onRequestPatch = (ctx) => actualizar(ctx, false);

export async function onRequestDelete({ request, params, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const id = idDe(params.id);
  if (id === null) return noEncontrada();
  const fila = await env.DB.prepare('DELETE FROM tareas WHERE id = ? RETURNING id').bind(id).first();
  return fila ? sinContenido() : noEncontrada();
}

export const onRequest = () => metodoNoPermitido(['GET', 'PUT', 'PATCH', 'DELETE']);
