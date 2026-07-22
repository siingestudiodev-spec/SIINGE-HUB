-- Permite volver a firmar un documento: la segunda firma reemplaza la primera.
-- La política de UPDATE actual bloquea las filas con is_used = true, por eso la
-- segunda firma se "guardaba" sin error pero afectaba 0 filas (RLS la filtraba).
--
-- Revisar antes (opcional):
--   select policyname, cmd, qual, with_check from pg_policies
--   where tablename = 'manufacturer_documents';

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public'
      and tablename = 'manufacturer_documents'
      and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.manufacturer_documents', p.policyname);
  end loop;
end $$;

-- Sigue exigiendo enlace no expirado; ya no exige que esté sin firmar.
create policy "sign or resign while the link is valid"
  on public.manufacturer_documents
  for update to anon
  using (token_expires_at > now())
  with check (token_expires_at > now());

-- Botón "Delete record" del panel: solo usuarios logueados, nunca anon.
drop policy if exists "staff can delete documents" on public.manufacturer_documents;
create policy "staff can delete documents"
  on public.manufacturer_documents
  for delete to authenticated
  using (true);

drop policy if exists "staff can delete signed pdfs" on storage.objects;
create policy "staff can delete signed pdfs"
  on storage.objects
  for delete to authenticated
  using (bucket_id = 'signed_documents');
