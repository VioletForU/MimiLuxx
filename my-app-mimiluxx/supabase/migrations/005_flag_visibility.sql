drop policy if exists "flags readable by signed-in users" on public.flags;

create policy "flags visible to relevant members" on public.flags
  for select to authenticated
  using (
    raised_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (select 1 from public.profiles p
               where p.id = auth.uid() and p.role in ('President','Adviser'))
  );