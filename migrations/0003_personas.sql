-- Equipo: personas que se pueden elegir como responsables aunque todavía no tengan tareas.
-- Las tareas siguen guardando el nombre como texto (tareas.asignado y "a" de cada paso);
-- quitar a alguien del equipo no cambia sus tareas.
CREATE TABLE IF NOT EXISTS personas (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT    NOT NULL UNIQUE COLLATE NOCASE
);
