"use client";

import { useEffect, useRef } from "react";

export type ConfirmRequest = { title: string; body: string; ok: string; onOk: () => void };

/** Native <dialog>: focus trap, Escape to cancel, and screen-reader semantics come for free. */
export default function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (request && !d.open) d.showModal();
    if (!request && d.open) d.close();
  }, [request]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-body"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-ink/15 bg-white p-6 text-ink shadow-xl backdrop:bg-black/40"
    >
      <h2 id="confirm-title" className="text-lg font-extrabold">{request?.title}</h2>
      <p id="confirm-body" className="mt-2 text-sm text-ink/70">{request?.body}</p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" autoFocus onClick={onClose} className="h-10 rounded-full border border-ink px-5 text-sm font-extrabold hover:bg-neutral-100">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            const go = request?.onOk;
            onClose();
            go?.();
          }}
          className="h-10 rounded-full bg-brand px-5 text-sm font-extrabold text-white"
        >
          {request?.ok}
        </button>
      </div>
    </dialog>
  );
}
