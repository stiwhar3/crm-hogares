Esquema aplicado en el proyecto Supabase `crm-hogares` (migraciones `esquema_crm` e `invitados_y_realtime`):
tablas contactos, captaciones, encargos, operaciones (columna jsonb `d`, asesor/zona generados),
censo, censo_edits, borrados, ajustes, perfiles e invitados, con RLS: el responsable ve todo,
cada asesor solo sus fichas y el censo de su zona; solo el responsable borra.
