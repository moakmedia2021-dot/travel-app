-- Avatars bucket: public-read, users can write only to their own folder.
-- Path convention: avatars/<user_id>/<timestamp>.<ext>

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Reads are public via bucket setting; we still need explicit policies for writes.

drop policy if exists "avatars: upload own folder" on storage.objects;
create policy "avatars: upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: update own folder" on storage.objects;
create policy "avatars: update own folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: delete own folder" on storage.objects;
create policy "avatars: delete own folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
