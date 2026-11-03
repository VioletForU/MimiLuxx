"use client";

import { useState, useTransition } from "react";
import type { ApprovalLimit } from "@/lib/approvalLimits";
import { runCheckNow, saveLimits } from "./actions";

export default function LimitsForm({ initial, canEdit }: { initial: ApprovalLimit[]; canEdit: boolean }) {
  const [limits, setLimits] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const patch = (role: string, p: Partial<ApprovalLimit>) =>
    setLimits((prev) => prev.map((l) => (l.role === role ? { ...l, ...p } : l)));

  return (
    <form
      className="mt-5 grid gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveLimits(limits);
          setMsg(r.ok ? { ok: true, text: "Time limits saved." } : { ok: false, text: r.error });
        });
      }}
    >
      {limits.map((l) => (
        <fieldset key={l.role} disabled={!canEdit} className="grid gap-3 rounded-xl border border-ink/15 p-4">
          <legend className="px-1 text-sm font-extrabold">{l.role}</legend>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Check this role</span>
            <button
              type="button"
              role="switch"
              aria-checked={l.enabled}
              aria-label={`Check ${l.role}`}
              onClick={() => patch(l.role, { enabled: !l.enabled })}
              className={`relative h-6 w-11 rounded-full transition ${l.enabled ? "bg-brand" : "bg-neutral-300"}`}
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${l.enabled ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Alert after</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                value={l.amount}
                onChange={(e) => patch(l.role, { amount: Number(e.target.value) })}
                className="h-10 w-full rounded-lg border border-ink/25 px-3 text-sm"
              />
              <select
                value={l.unit}
                onChange={(e) => patch(l.role, { unit: e.target.value as "days" | "hours" })}
                aria-label={`Unit for ${l.role} limit`}
                className="h-10 w-28 shrink-0 rounded-lg border border-ink/25 px-2 text-sm"
              >
                <option value="days">days</option>
                <option value="hours">hours</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70">Remind again every (hours, 0 = never)</label>
            <input
              type="number"
              min={0}
              value={l.repeat_hours}
              onChange={(e) => patch(l.role, { repeat_hours: Number(e.target.value) })}
              className="h-10 w-full rounded-lg border border-ink/25 px-3 text-sm"
            />
          </div>
        </fieldset>
      ))}

      {msg && (
        <p role="status" className={`text-sm font-bold ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!canEdit || pending} className="h-10 rounded-full bg-brand px-5 text-sm font-extrabold text-white disabled:opacity-40">
          {pending ? "Saving…" : "Save limits"}
        </button>
        <button
          type="button"
          onClick={() => start(async () => { await runCheckNow(); setMsg({ ok: true, text: "Checked just now." }); })}
          className="h-10 rounded-full border border-ink px-5 text-sm font-extrabold hover:bg-neutral-100"
        >
          Run check now
        </button>
      </div>
      {!canEdit && <p className="text-xs text-ink/60">Only a President or Adviser can change these.</p>}
    </form>
  );
}
