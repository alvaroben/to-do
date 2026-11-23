// Orden manual de las tareas (el que se ve en el tablero).
//   PUT /api/tareas/orden   cuerpo: { ids: [3, 1, 2, ...] }   -> 200 { ids: [...] } con el orden resultante
//
// Los ids enviados quedan primero y en ese orden; las tareas que no se mencionen (por ejemplo, creadas por otra
// persona mientras tanto) conservan su orden relativo y quedan al final. Los ids que no existan se ignoran.

import { error, json, leerJson, metodoNoPermitido, origenValido } from '../../../lib/tareas.js';

export async function onRequestPut({ request, env }) {
  if (!origenValido(request)) return error(403, 'origen no permitido');
  const { body, fallo } = await leerJson(request);
  if (fallo) return fallo;
  if (!Array.isArray(body.ids) || body.ids.some((x) => !Number.isInteger(x) || x < 1)) {
    return error(400, 'ids debe ser una lista de números enteros');
  }

  const { results } = await env.DB.prepare('SELECT id FROM tareas ORDER BY orden, id').all();
  const existentes = results.map((r) => r.id);
  const conocidas = new Set(existentes);

  const primero = [...new Set(body.ids)].filter((id) => conocidas.has(id));
  const enLista = new Set(primero);
  const ids = [...primero, ...existentes.filter((id) => !enLista.has(id))];

  const actualizar = env.DB.prepare('UPDATE tareas SET orden = ? WHERE id = ?');
  await env.DB.batch(ids.map((id, i) => actualizar.bind(i, id)));
  return json({ ids });
}

export const onRequest = () => metodoNoPermitido(['PUT']);
