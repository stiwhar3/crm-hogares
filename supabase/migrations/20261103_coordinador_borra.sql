-- Stiwhar (03/11): Daniel (coordinador) puede borrar sin su autorización en lo que gestiona:
-- compradores, visitas, captaciones, encargos y avisos. Siempre queda copia en borrados
-- (el coordinador puede guardar la copia, pero no leer ni tocar el registro de borrados).
alter policy borrar on public.compradores using (es_responsable() or es_coordinador());
alter policy borrar on public.visitas     using (es_responsable() or es_coordinador());
alter policy borrar on public.captaciones using (es_responsable() or es_coordinador());
alter policy borrar on public.encargos    using (es_responsable() or es_coordinador());
alter policy borrar on public.avisos      using (es_responsable() or es_coordinador());
create policy coordinador_copia on public.borrados for insert with check (es_coordinador());

-- La app guarda la copia con upsert (INSERT ... ON CONFLICT), que exige poder leer la fila nueva.
-- Daniel solo ve las copias que ha hecho él.
create policy coordinador_ve_suyos on public.borrados for select using (es_coordinador() and d->>'por' = mi_nombre());
