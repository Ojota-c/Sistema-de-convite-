-- =============================================================================
-- 0003_storage.sql
-- Bucket privado para a imagem do convite.
--
-- O bucket e PRIVADO de proposito. A imagem chega ao navegador do convidado
-- pela rota /c/[token]/imagem, que le o arquivo no servidor com a service role
-- e o devolve com cache. Assim nenhuma URL publica do Storage e exposta e a
-- previa do WhatsApp continua funcionando.
--
-- Como aplicar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- Se preferir a interface: Storage > New bucket > nome "convite" > deixe
-- "Public bucket" DESLIGADO > limite de 5 MB > tipos image/jpeg, image/png,
-- image/webp.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'convite',
  'convite',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
   set public             = excluded.public,
       file_size_limit    = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

-- Nenhuma policy em storage.objects para este bucket: somente a service role
-- (que ignora RLS) consegue ler e gravar.
