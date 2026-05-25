insert into storage.buckets (id, name, public, file_size_limit)
values ('post-images', 'post-images', true, 20971520)  -- 20MB
on conflict (id) do update set file_size_limit = 20971520, public = true;

drop policy if exists "post-images: upload own folder" on storage.objects;
create policy "post-images: upload own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "post-images: delete own" on storage.objects;
create policy "post-images: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
