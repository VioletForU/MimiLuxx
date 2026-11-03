import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { routeStages } from "@/lib/stageRouting";
import { isAdminRole } from "@/lib/types/roles";
import type { Proposal, ApprovalStage } from "@/lib/types/proposal";
import { DEFAULT_LIMITS, limitToMs, type ApprovalLimit } from "@/lib/approvalLimits";
import { currentTimeMs, spanText } from "@/lib/time";
import LimitsForm from "./LimitsForm";

export const dynamic = "force-dynamic";

type Row = {
  proposal: Proposal;
  submitter: string;
  role: string;
  elapsed: number;
  limit: number;
  limitLabel: string;
  state: "breach" | "warn" | "ok";
};

export default async function OverdueApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Not logged in</p>
        <Link href="/login" className="underline">Go to login</Link>
      </main>
    );
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  // Saved limits override the defaults per role (table is optional until the migration is run).
  const { data: saved } = await supabase.from("approval_time_limits").select("*");
  const limits: ApprovalLimit[] = DEFAULT_LIMITS.map(
    (d) => ((saved ?? []).find((s) => s.role === d.role) as ApprovalLimit | undefined) ?? d
  );

  const { data: proposals } = await supabase.from("proposals").select("*").eq("status", "pending");
  const list = (proposals ?? []) as Proposal[];

  let rows: Row[] = [];
  if (list.length > 0) {
    const { data: stages } = await supabase.from("approval_stages").select("*").in("proposal_id", list.map((p) => p.id));
    const { data: people } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", [...new Set(list.map((p) => p.submitted_by))]);

    const now = currentTimeMs();
    rows = list.flatMap((proposal) => {
      const active = routeStages(proposal, ((stages ?? []) as ApprovalStage[]).filter((s) => s.proposal_id === proposal.id)).find((s) => s.isActive);
      if (!active || !active.startedAt) return [];
      const limit = limits.find((l) => l.role === active.approver_role);
      if (!limit || !limit.enabled) return [];
      const ms = limitToMs(limit);
      const elapsed = now - new Date(active.startedAt).getTime();
      const person = (people ?? []).find((p) => p.id === proposal.submitted_by);
      return [{
        proposal,
        submitter: person?.full_name || person?.email || "Unknown",
        role: active.approver_role,
        elapsed,
        limit: ms,
        limitLabel: `${limit.amount} ${limit.unit === "days" ? (limit.amount === 1 ? "day" : "days") : (limit.amount === 1 ? "hour" : "hours")}`,
        state: elapsed >= ms ? "breach" : elapsed >= ms * 0.75 ? "warn" : "ok",
      } satisfies Row];
    });
    const rank = { breach: 0, warn: 1, ok: 2 } as const;
    rows.sort((a, b) => rank[a.state] - rank[b.state] || b.elapsed / b.limit - a.elapsed / a.limit);
  }

  const breached = rows.filter((r) => r.state === "breach").length;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-extrabold">Mimi<span className="text-brand">Luxx</span></Link>
          <nav aria-label="Main" className="hidden gap-6 text-sm font-bold sm:flex">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/tasks">All Tasks</Link>
            <Link href="/approvals/overdue" className="text-brand">Approvals</Link>
            <Link href="/announcements">Announcements</Link>
            <Link href="/settings">Settings</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">Overdue approvals</h1>
          <p className="mt-1 text-sm text-ink/60">Sign-offs that have waited longer than their time limit.</p>
        </div>

        <section
          role="alert"
          className={`flex items-center gap-3 rounded-xl border p-4 ${breached ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}
        >
          <span className={`size-3 shrink-0 rounded-full ${breached ? "bg-brand" : "bg-green-600"}`} aria-hidden="true" />
          <p className="min-w-0 flex-1 text-sm font-bold sm:text-base">
            {breached ? `${breached} sign-off${breached === 1 ? " is" : "s are"} past the time limit.` : "No sign-offs are past the time limit."}
          </p>
          {breached > 0 && <a href="#cards" className="rounded-full bg-brand px-4 py-2 text-xs font-extrabold text-white">Review now</a>}
        </section>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <section className="min-w-0 rounded-2xl border border-ink/15 bg-white p-6 shadow-sm lg:self-start" aria-labelledby="cfg-title">
            <h2 id="cfg-title" className="text-lg font-extrabold">Time limits</h2>
            <p className="mt-1 text-sm text-ink/60">Per signatory role. Only a President or Adviser can change these.</p>
            <LimitsForm initial={limits} canEdit={isAdminRole(me?.role)} />
          </section>

          <section id="cards" aria-labelledby="cards-title" className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 id="cards-title" className="text-lg font-extrabold">Waiting for sign-off</h2>
              <p className="text-sm text-ink/60">{rows.length} pending · {breached} breached</p>
            </div>
            {rows.length === 0 ? (
              <p className="rounded-xl border border-ink/15 p-6 text-sm text-ink/60">Nothing is waiting on a monitored role.</p>
            ) : (
              <ul className="grid gap-4 md:grid-cols-2">
                {rows.map((r) => {
                  const pct = Math.min(100, Math.round((r.elapsed / r.limit) * 100));
                  const over = r.elapsed - r.limit;
                  const tone = r.state === "breach" ? "border-red-300" : r.state === "warn" ? "border-yellow-400" : "border-ink/15";
                  const badge = r.state === "breach" ? "bg-red-100 text-red-800" : r.state === "warn" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800";
                  const bar = r.state === "breach" ? "bg-brand" : r.state === "warn" ? "bg-yellow-500" : "bg-green-600";
                  return (
                    <li key={r.proposal.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${tone}`}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="min-w-0 text-base font-extrabold">{r.proposal.title}</h3>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${badge}`}>
                          {r.state === "breach" ? `Breached +${spanText(over)}` : r.state === "warn" ? "Almost due" : "On time"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/60">Requested by {r.submitter}</p>
                      <p className="mt-3 text-sm">
                        <strong>{r.role}</strong> has been asked for {spanText(r.elapsed)} of {r.limitLabel}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Time used">
                        <span className={`block h-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-xs text-ink/50">Limit: {r.limitLabel}</span>
                        <Link href={`/proposals/${r.proposal.id}`} className="rounded-full border border-ink px-4 py-2 text-xs font-extrabold hover:bg-neutral-100">Open proposal</Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
