-- Estado del tablero (pendiente | curso | hecho) y persona responsable de cada tarea.
-- El responsable de cada paso vive dentro del JSON de "pasos" ({ t, ok, a }), así que no necesita columna.
ALTER TABLE tareas ADD COLUMN estado   TEXT NOT NULL DEFAULT '';
ALTER TABLE tareas ADD COLUMN asignado TEXT NOT NULL DEFAULT '';
UPDATE tareas SET estado = CASE WHEN hecha = 1 THEN 'hecho' ELSE 'pendiente' END WHERE estado = '';
