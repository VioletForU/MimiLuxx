"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT, LIMITS_HINT } from "@/lib/attachments";
import { formatBytes, openMemberFile, removeMemberFile, uploadMemberFile, type MemberFile } from "@/lib/memberFiles";
import { card, darkButton, emptyText, errorText, heading, hint, linkDanger, rowItem } from "@/app/admin/ui";

type Notice = { type: "success" | "error"; text: string } | null;

export default function MemberFiles({
  organizationId,
  ownerId,
  currentUserId,
  files,
  names,
  loadError,
}: {
  organizationId: string;
  ownerId: string;
  currentUserId: string;
  files: MemberFile[];
  /** user id → display name, for "added by". */
  names: Record<string, string>;
  loadError: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  async function onPick(list: FileList | null) {
    if (!list || list.length === 0) return;
    const picked = Array.from(list);
    if (input.current) input.current.value = "";

    setBusy("upload");
    setNotice(null);
    const supabase = createClient();
    const failures: string[] = [];
    let added = 0;

    for (const file of picked) {
      try {
        await uploadMemberFile(supabase, { organizationId, ownerId, uploadedBy: currentUserId, file });
        added += 1;
      } catch (e) {
        failures.push(e instanceof Error ? e.message : `${file.name}: could not upload.`);
      }
    }

    setBusy(null);
    if (failures.length > 0) {
      setNotice({ type: "error", text: failures.join(" ") });
    } else {
      setNotice({ type: "success", text: added === 1 ? "File added." : `${added} files added.` });
    }
    if (added > 0) router.refresh();
  }

  async function onOpen(f: MemberFile) {
    setBusy(`open-${f.id}`);
    try {
      await openMemberFile(createClient(), f);
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Could not open this file." });
    }
    setBusy(null);
  }

  async function onDelete(f: MemberFile) {
    if (!window.confirm(`Delete "${f.file_name}"? This can't be undone.`)) return;
    setBusy(`del-${f.id}`);
    try {
      await removeMemberFile(createClient(), f);
      setNotice({ type: "success", text: "File deleted." });
      router.refresh();
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Could not delete this file." });
    }
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={
            notice.type === "error"
              ? errorText
              : "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          }
        >
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className={errorText}>
          Could not load files: {loadError}. If this is a new setup, run 010_member_files.sql in the Supabase SQL Editor.
        </p>
      )}

      <section className={card}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className={heading}>Files &amp; attachments ({files.length})</h2>
            <p className={hint}>{LIMITS_HINT.replace(/ · \d+ files per task/, "")}</p>
          </div>
          <div>
            <input
              ref={input}
              id="folder-upload"
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              onChange={(e) => onPick(e.target.files)}
            />
            <button type="button" disabled={busy === "upload"} onClick={() => input.current?.click()} className={darkButton}>
              {busy === "upload" ? "Uploading…" : "Add files"}
            </button>
          </div>
        </div>

        {files.length === 0 && !loadError ? (
          <p className={`${emptyText} mt-6`}>No files in this folder yet.</p>
        ) : (
          <ul className="mt-6 space-y-2">
            {files.map((f) => {
              const byOwner = f.uploaded_by === f.owner_id;
              const by = f.uploaded_by ? (names[f.uploaded_by] ?? "a committee lead") : "unknown";
              return (
                <li key={f.id} className={`${rowItem} flex-wrap text-sm`}>
                  <span className="min-w-0">
                    <button
                      type="button"
                      disabled={busy === `open-${f.id}`}
                      onClick={() => onOpen(f)}
                      className="block max-w-full truncate text-left font-semibold text-neutral-900 underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      {f.file_name}
                    </button>
                    <span className="block text-xs text-neutral-500">
                      {formatBytes(f.size_bytes)} · {new Date(f.created_at).toLocaleDateString()}
                      {byOwner ? "" : ` · added by ${by}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-4">
                    <button
                      type="button"
                      disabled={busy === `open-${f.id}`}
                      onClick={() => onOpen(f)}
                      className="text-xs font-semibold underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      disabled={busy === `del-${f.id}`}
                      onClick={() => onDelete(f)}
                      className={linkDanger}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
