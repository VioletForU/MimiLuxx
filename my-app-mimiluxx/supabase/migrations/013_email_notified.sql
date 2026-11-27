-- Remembers which uploaded files have already been announced by email, so the
-- same file can never trigger two emails (even if the request is repeated).
-- Run AFTER 012_subfolders_notifications.sql. Safe to re-run.

alter table public.member_files
  add column if not exists email_notified_at timestamptz;
