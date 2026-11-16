"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ACCEPT,
  LIMITS_HINT,
  MAX_FILES_PER_TASK,
  formatBytes,
  friendlyStorageError,
  isImage,
  openAttachment,
  removeAttachment,
  uploadAttachment,
  validateFile,
  type TaskAttachment,
} from "@/lib/attachments";

/* ───────────── shared bits ───────────── */

function FilePickerButton({ onPick, disabled, label = "Choose files" }: { onPick: (files: File[]) => void; disabled?: boolean; label?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        multiple
        accept={ACCEPT}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = ""; // lets the same file be picked again later
          if (files.length) onPick(files);
        }}
      />
      <button type="button" className="btn btn-outline" disabled={disabled} onClick={() => ref.current?.click()}>
        <span aria-hidden="true">📎</span> {label}
      </button>
    </>
  );
}

function Problems({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div role="alert" className="rounded-2xl border-l-8 border-[#E5252A] bg-[#FAFAFA] px-4 py-3">
      <p className="text-sm font-extrabold text-[#111]">{items.length === 1 ? "A file was skipped" : `${items.length} files were skipped`}</p>
      <ul className="mt-1 list-disc pl-4 text-xs text-[#555]">
        {items.map((p, i) => (
          <li key={i} className="break-words">{p}</li>
        ))}
      </ul>
    </div>
  );
}

const fileIcon = (mime: string | null) => (mime?.startsWith("image/") ? "🖼️" : "📄");

/* ───────────── files that are already saved on a task ───────────── */

/**
 * Lists a task's attachments. Unless readOnly, also lets the user add and remove files;
 * uploads happen immediately (the task already exists).
 */
export function SavedAttachments({
  taskId,
  readOnly = false,
  disabled = false,
  onCountChange,
}: {
  taskId: string;
  readOnly?: boolean;
  disabled?: boolean;
  onCountChange?: (count: number) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<TaskAttachment[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [problems, setProblems] = useState<string[]>([]);
  const [status, setStatus] = useState(""); // "Uploading a.pdf (1 of 2)…"
  const [workingId, setWorkingId] = useState<string | null>(null);

  const commit = (next: TaskAttachment[]) => {
    setItems(next);
    onCountChange?.(next.length);
  };

  useEffect(() => {
    let alive = true;
    supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) return setLoadError(friendlyStorageError(error.message));
        const rows = (data ?? []) as TaskAttachment[];
        setItems(rows);
        onCountChange?.(rows.length);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per task
  }, [supabase, taskId]);

  async function addFiles(picked: File[]) {
    const current = items ?? [];
    const problemsNow: string[] = [];
    const ok: File[] = [];
    for (const f of picked) {
      const err = validateFile(f);
      if (err) problemsNow.push(`${f.name}: ${err}`);
      else if (current.length + ok.length >= MAX_FILES_PER_TASK) problemsNow.push(`${f.name}: a task can have at most ${MAX_FILES_PER_TASK} files.`);
      else ok.push(f);
    }
    setProblems(problemsNow);
    if (ok.length === 0) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProblems([...problemsNow, "You are signed out. Please log in again."]);
      return;
    }

    let latest = current;
    for (let i = 0; i < ok.length; i++) {
      setStatus(`Uploading ${ok[i].name} (${i + 1} of ${ok.length})…`);
      try {
        const row = await uploadAttachment(supabase, { taskId, userId: user.id, file: ok[i] });
        latest = [...latest, row];
        commit(latest);
      } catch (e) {
        problemsNow.push(e instanceof Error ? e.message : `${ok[i].name}: upload failed.`);
        setProblems([...problemsNow]);
      }
    }
    setStatus("");
  }

  async function remove(a: TaskAttachment) {
    if (!confirm(`Remove “${a.file_name}”?`)) return;
    setWorkingId(a.id);
    setProblems([]);
    try {
      await removeAttachment(supabase, a);
      commit((items ?? []).filter((x) => x.id !== a.id));
    } catch (e) {
      setProblems([e instanceof Error ? e.message : "Could not remove the file."]);
    } finally {
      setWorkingId(null);
    }
  }

  async function open(a: TaskAttachment) {
    setWorkingId(a.id);
    setProblems([]);
    try {
      await openAttachment(supabase, a);
    } catch (e) {
      setProblems([e instanceof Error ? e.message : "Could not open the file."]);
    } finally {
      setWorkingId(null);
    }
  }

  if (loadError) {
    return readOnly ? null : (
      <p role="alert" className="rounded-2xl border-l-8 border-[#E5252A] bg-[#FAFAFA] px-4 py-3 text-xs text-[#555]">{loadError}</p>
    );
  }
  if (items === null) return readOnly ? null : <div className="h-10 animate-pulse rounded-lg bg-[#F0F0F2]" aria-hidden="true" />;
  if (readOnly && items.length === 0) return null;

  const busy = status !== "" || workingId !== null;
  const full = items.length >= MAX_FILES_PER_TASK;

  return (
    <div className="grid gap-3">
      {readOnly && <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Attachments ({items.length})</p>}

      {items.length > 0 && (
        <ul className="grid gap-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white px-3 py-2">
              <span aria-hidden="true">{fileIcon(a.mime_type)}</span>
              <button
                type="button"
                onClick={() => void open(a)}
                disabled={workingId === a.id}
                title={isImage(a) ? "Open image" : "Open file"}
                className="min-w-0 flex-1 truncate text-left text-sm font-bold underline-offset-2 hover:underline disabled:opacity-50"
              >
                {a.file_name}
              </button>
              <span className="shrink-0 text-xs text-ink/50">{formatBytes(a.size_bytes)}</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => void remove(a)}
                  disabled={disabled || busy}
                  aria-label={`Remove ${a.file_name}`}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-[#C41E1E] hover:bg-red-50 disabled:opacity-40"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
          {items.length === 0 && <p className="text-sm text-ink/50">No files attached yet.</p>}
          <div className="flex flex-wrap items-center gap-3">
            <FilePickerButton onPick={(f) => void addFiles(f)} disabled={disabled || busy || full} label={items.length ? "Add more files" : "Choose files"} />
            <p className="text-xs text-ink/50">{full ? `Limit of ${MAX_FILES_PER_TASK} files reached.` : LIMITS_HINT}</p>
          </div>
          <p className="text-xs text-ink/50">Files are saved as soon as you add or remove them, even if you don&apos;t press Save.</p>
          <p role="status" className="text-xs font-bold text-ink/70">{status}</p>
        </>
      )}
      <Problems items={problems} />
    </div>
  );
}

/* ───────────── files picked before the task exists ───────────── */

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

/** Controlled list of files waiting to be uploaded once the task has been created. */
export function PendingAttachments({
  files,
  onChange,
  disabled = false,
}: {
  files: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [problems, setProblems] = useState<string[]>([]);

  function add(picked: File[]) {
    const next = [...files];
    const probs: string[] = [];
    for (const f of picked) {
      const err = validateFile(f);
      if (err) probs.push(`${f.name}: ${err}`);
      else if (next.some((x) => sameFile(x, f))) continue;
      else if (next.length >= MAX_FILES_PER_TASK) probs.push(`${f.name}: a task can have at most ${MAX_FILES_PER_TASK} files.`);
      else next.push(f);
    }
    setProblems(probs);
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {files.length > 0 && (
        <ul className="grid gap-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-3 rounded-xl border border-ink/15 bg-white px-3 py-2">
              <span aria-hidden="true">{f.type.startsWith("image/") ? "🖼️" : "📄"}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{f.name}</span>
              <span className="shrink-0 text-xs text-ink/50">{formatBytes(f.size)}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${f.name} from the list`}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="shrink-0 rounded-full px-2 py-1 text-xs font-bold text-[#C41E1E] hover:bg-red-50 disabled:opacity-40"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <FilePickerButton onPick={add} disabled={disabled || files.length >= MAX_FILES_PER_TASK} label={files.length ? "Add more files" : "Choose files"} />
        <p className="text-xs text-ink/50">{LIMITS_HINT}</p>
      </div>
      {files.length > 0 && <p className="text-xs text-ink/50">These upload when you press Create task.</p>}
      <Problems items={problems} />
    </div>
  );
}
