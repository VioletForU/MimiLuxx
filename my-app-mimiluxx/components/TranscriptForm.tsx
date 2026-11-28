"use client";

import { useRef, useState } from "react";
import type { DetectedItem } from "@/lib/ideaDetection";
import {
  hasAllowedExtension,
  MAX_TRANSCRIPT_BYTES,
  MIN_TRANSCRIPT_CHARS,
} from "@/lib/transcriptAccess";

export default function TranscriptForm({ slug }: { slug: string }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<DetectedItem[] | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setError(null);
    if (f && !hasAllowedExtension(f.name)) {
      setError("Unsupported file type. Use a .txt or .md file.");
      e.target.value = "";
      setFile(null);
      return;
    }
    if (f && f.size > MAX_TRANSCRIPT_BYTES) {
      setError("File is too large. The limit is 200 KB.");
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function onSubmit() {
    setError(null);
    setItems(null);
    setAiFailed(false);

    if (!file && text.trim().length < MIN_TRANSCRIPT_CHARS) {
      setError("Paste a transcript or choose a file first.");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.append("slug", slug);
      if (file) body.append("file", file);
      else body.append("text", text);

      const res = await fetch("/api/transcripts", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setAiFailed(res.status === 502);
        return;
      }
      setItems(data.items);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-[#F6F6F6] px-5 py-4 text-sm text-[#555]">
        Notice: the transcript text is processed by an external AI service. Do not include
        private information you don&apos;t want shared with it.
      </p>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {items && items.length === 0 && (
        <p className="rounded-xl bg-[#F6F6F6] px-4 py-3 text-sm">No action items were found.</p>
      )}
      {items && items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it, i) => (
            <li key={i} className="rounded-2xl border border-black/10 p-4 text-sm">
              <p className="font-bold">{it.title}</p>
              <p className="mt-1 text-[#555]">{it.description}</p>
              <p className="mt-2 text-xs text-[#6b6b6b]">
                Priority: {it.priority} · Assignee: {it.assignee ?? "Not determined"} · Deadline:{" "}
                {it.deadline ?? "None"}
              </p>
            </li>
          ))}
        </ul>
      )}

      <label className="block text-sm font-bold">
        Paste transcript or minutes
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          disabled={!!file}
          className="mt-2 w-full rounded-2xl border border-black/10 p-4 text-sm font-normal"
          placeholder="Paste the meeting transcript here…"
        />
      </label>

      <div>
        <p className="text-sm font-bold">Or upload a file (.txt or .md, max 200 KB)</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-full border border-black/20 bg-white px-4 py-2 text-sm font-bold hover:bg-[#F6F6F6] focus-within:ring-2 focus-within:ring-[#f25c05]">
            Choose file
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md"
              onChange={onFileChange}
              className="sr-only"
            />
          </label>
          <span className="text-sm text-[#6b6b6b]">{file ? file.name : "No file chosen"}</span>
          {file && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-sm font-bold text-[#E5252A] underline"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="rounded-full bg-[#f25c05] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
      >
        {loading ? "Analyzing…" : aiFailed ? "Retry" : "Submit transcript"}
      </button>
    </div>
  );
}