-- Daniel (coordinador) puede crear y editar operaciones y encargos. Borrar operaciones sigue siendo solo de Stiwhar.
drop policy if exists crear on public.operaciones;
create policy crear on public.operaciones for insert with check (ve_todo());
drop policy if exists editar on public.operaciones;
create policy editar on public.operaciones for update using (ve_todo()) with check (ve_todo());
drop policy if exists crear on public.encargos;
create policy crear on public.encargos for insert with check (ve_todo() or asesor = mi_nombre());
