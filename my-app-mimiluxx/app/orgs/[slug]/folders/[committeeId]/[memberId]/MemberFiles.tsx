"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ACCEPT, LIMITS_HINT } from "@/lib/attachments";
import {
  MAX_FOLDER_NAME,
  createMemberFolder,
  formatBytes,
  openMemberFile,
  removeMemberFile,
  removeMemberFolder,
  subtreeIds,
  uploadMemberFile,
  type MemberFile,
  type MemberFolder,
} from "@/lib/memberFiles";
import { card, darkButton, emptyText, errorText, heading, hint, inputClass, label, linkDanger, panel, rowItem } from "@/app/admin/ui";

type Notice = { type: "success" | "error"; text: string } | null;

function FolderIcon() {
  return (
    <svg className="size-5 shrink-0 text-[#E5252A]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  );
}

export default function MemberFiles({
  organizationId,
  ownerId,
  currentUserId,
  basePath,
  rootLabel,
  folders,
  currentFolderId,
  files,
  names,
  loadError,
}: {
  organizationId: string;
  ownerId: string;
  currentUserId: string;
  /** This page's own path, used for breadcrumb and folder links. */
  basePath: string;
  rootLabel: string;
  /** Every sub-folder in this person's folder. */
  folders: MemberFolder[];
  currentFolderId: string | null;
  /** Files in the folder being viewed. */
  files: MemberFile[];
  /** user id → display name, for "added by". */
  names: Record<string, string>;
  loadError: string | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [folderName, setFolderName] = useState("");

  // Breadcrumb: root → … → current folder.
  const trail: MemberFolder[] = [];
  for (let f = folders.find((x) => x.id === currentFolderId); f; f = folders.find((x) => x.id === f!.parent_id)) {
    trail.unshift(f);
  }
  const children = folders.filter((f) => f.parent_id === currentFolderId);
  const hrefFor = (id: string | null) => (id ? `${basePath}?folder=${id}` : basePath);

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
        await uploadMemberFile(supabase, {
          organizationId,
          ownerId,
          uploadedBy: currentUserId,
          folderId: currentFolderId,
          file,
        });
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

  async function onCreateFolder(e: FormEvent) {
    e.preventDefault();
    setBusy("new-folder");
    setNotice(null);
    try {
      await createMemberFolder(createClient(), {
        organizationId,
        ownerId,
        parentId: currentFolderId,
        createdBy: currentUserId,
        name: folderName,
      });
      setFolderName("");
      setNotice({ type: "success", text: "Folder created." });
      router.refresh();
    } catch (err) {
      setNotice({ type: "error", text: err instanceof Error ? err.message : "Could not create the folder." });
    }
    setBusy(null);
  }

  async function onDeleteFolder(f: MemberFolder) {
    const inside = subtreeIds(f.id, folders).length - 1;
    const extra = inside > 0 ? ` It also contains ${inside} sub-folder${inside === 1 ? "" : "s"}.` : "";
    if (!window.confirm(`Delete the folder "${f.name}" and every file inside it?${extra} This can't be undone.`)) return;
    setBusy(`delf-${f.id}`);
    try {
      await removeMemberFolder(createClient(), f, folders);
      setNotice({ type: "success", text: "Folder deleted." });
      router.refresh();
    } catch (e) {
      setNotice({ type: "error", text: e instanceof Error ? e.message : "Could not delete this folder." });
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
          Could not load everything: {loadError}. If this is a new setup, run 010_member_files.sql and
          012_subfolders_notifications.sql in the Supabase SQL Editor.
        </p>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1.5 text-sm">
        {trail.length === 0 ? (
          <span className="font-bold text-neutral-900">{rootLabel}</span>
        ) : (
          <Link href={hrefFor(null)} className="font-semibold underline-offset-4 hover:underline">
            {rootLabel}
          </Link>
        )}
        {trail.map((f, i) => (
          <span key={f.id} className="flex items-center gap-1.5">
            <span className="text-neutral-400" aria-hidden="true">/</span>
            {i === trail.length - 1 ? (
              <span className="font-bold text-neutral-900" aria-current="page">{f.name}</span>
            ) : (
              <Link href={hrefFor(f.id)} className="font-semibold underline-offset-4 hover:underline">
                {f.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      {/* Sub-folders */}
      <section className={card}>
        <h2 className={heading}>Folders ({children.length})</h2>
        <p className={hint}>Organise files into sub-folders, up to 5 levels deep.</p>

        {children.length > 0 && (
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {children.map((f) => (
              <li key={f.id} className={`${rowItem} text-sm`}>
                <Link href={hrefFor(f.id)} className="flex min-w-0 items-center gap-2.5 font-semibold text-neutral-900 hover:text-[#E5252A]">
                  <FolderIcon />
                  <span className="truncate">{f.name}</span>
                </Link>
                <button type="button" disabled={busy === `delf-${f.id}`} onClick={() => onDeleteFolder(f)} className={linkDanger}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onCreateFolder} className={`${panel} mt-5 flex flex-wrap items-end gap-3`}>
          <div>
            <label className={label} htmlFor="new-folder-name">New folder{trail.length > 0 ? ` in ${trail[trail.length - 1].name}` : ""}</label>
            <input
              id="new-folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              maxLength={MAX_FOLDER_NAME}
              placeholder="Folder name"
              className={`${inputClass} mt-1 block w-full sm:w-64`}
            />
          </div>
          <button type="submit" disabled={busy === "new-folder" || !folderName.trim()} className={darkButton}>
            Create folder
          </button>
        </form>
      </section>

      {/* Files in this folder */}
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
                    <button type="button" disabled={busy === `del-${f.id}`} onClick={() => onDelete(f)} className={linkDanger}>
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
