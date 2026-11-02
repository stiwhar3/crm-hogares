-- Auditoría del 01/11/2026: cerrar funciones que se podían llamar sin iniciar sesión.
-- geo_paso y geo_publicar eran de la carga de coordenadas del catastro (ya terminada): nadie las usa desde la app.
revoke execute on function public.geo_paso() from public, anon, authenticated;
revoke execute on function public.geo_publicar() from public, anon, authenticated;
-- Funciones de permisos: solo las necesitan los usuarios con sesión.
revoke execute on function public.es_coordinador() from public, anon;
revoke execute on function public.ve_todo() from public, anon;
-- search_path fijo (aviso de seguridad de Supabase)
alter function public.norm_dir(text) set search_path = public;
alter function public.marcar_actualizado() set search_path = public;
