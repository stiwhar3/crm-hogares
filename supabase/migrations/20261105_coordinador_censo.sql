-- Daniel (coordinador) ve todo el censo (todas las zonas) y puede apuntar notas y contactos (censo_edits, portales).
-- El censo base sigue siendo solo de Stiwhar. Las noticias (contactos) siguen ocultas para el coordinador.
alter policy leer on public.censo using (ve_todo() or zona = mi_zona());
alter policy leer on public.censo_edits using (ve_todo() or zona = mi_zona());
alter policy crear on public.censo_edits with check (ve_todo() or zona = mi_zona());
alter policy editar on public.censo_edits using (ve_todo() or zona = mi_zona()) with check (ve_todo() or zona = mi_zona());
alter policy leer on public.portales using (ve_todo() or zona = mi_zona());
alter policy crear on public.portales with check (ve_todo() or zona = mi_zona());
alter policy editar on public.portales using (ve_todo() or zona = mi_zona()) with check (ve_todo() or zona = mi_zona());
