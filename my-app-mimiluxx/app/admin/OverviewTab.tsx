import type { AdminOverview } from "@/lib/types/admin";
import { ROLES, ROLE_LABELS } from "@/lib/types/roles";
import { card, errorText, heading, label, SETUP_HINT } from "../ui";

function Stat({
  label: text,
  value,
  className = "",
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div className={`${card} ${className}`}>
      <p className="text-sm font-medium text-neutral-600">{text}</p>
      <p className="mt-2 text-4xl font-extrabold tracking-tight text-neutral-900">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; bar: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className={card}>
      <h3 className={label}>{title}</h3>
      <ul className="mt-5 space-y-4">
        {rows.map((row) => (
          <li key={row.label}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-700">{row.label}</span>
              <span className="font-bold text-neutral-900">{row.count}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-full bg-neutral-100" aria-hidden="true">
              <div
                className={`h-2 rounded-full ${row.bar}`}
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PROPOSAL_ROWS = [
  { key: "pending", label: "Pending", bar: "bg-yellow-400" },
  { key: "approved", label: "Approved", bar: "bg-green-500" },
  { key: "rejected", label: "Rejected", bar: "bg-[#EA2323]" },
];

const TASK_ROWS = [
  { key: "todo", label: "To do", bar: "bg-neutral-400" },
  { key: "in_progress", label: "In progress", bar: "bg-blue-500" },
  { key: "blocked", label: "Blocked", bar: "bg-[#EA2323]" },
  { key: "done", label: "Done", bar: "bg-green-500" },
];

export default function OverviewTab({
  overview,
  error,
}: {
  overview: AdminOverview | null;
  error: string | null;
}) {
  if (!overview) {
    return (
      <p role="alert" className={errorText}>
        Could not load statistics{error ? `: ${error}` : ""}. {SETUP_HINT}
      </p>
    );
  }

  const pending = overview.proposals.pending ?? 0;
  const openTasks =
    (overview.tasks.todo ?? 0) + (overview.tasks.in_progress ?? 0) + (overview.tasks.blocked ?? 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="col-span-2 flex flex-col justify-between rounded-3xl bg-[#1f1f1f] p-7 text-white shadow-xl lg:row-span-2">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-neutral-200">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EA2323]" />
            Registered users
          </p>
          <div className="mt-10">
            <p className="text-7xl font-extrabold leading-none tracking-tight sm:text-8xl">
              {overview.users_total}
            </p>
            <p className="mt-4 text-sm text-neutral-300">
              <span className="font-semibold text-white">{overview.active_users_7d}</span> signed in
              this week, <span className="font-semibold text-white">{overview.new_users_30d}</span>{" "}
              joined this month.
            </p>
          </div>
        </div>

        <Stat label="Signed in this week" value={overview.active_users_7d} />
        <Stat label="New this week" value={overview.new_users_7d} />
        <Stat label="New this month" value={overview.new_users_30d} />
        <Stat label="Organizations" value={overview.organizations} />
        <Stat label="Committees" value={overview.committees} />
        <Stat label="Open tasks" value={openTasks} />
        <div className={`${card} col-span-2 flex items-center justify-between gap-4`}>
          <div>
            <p className="text-sm font-medium text-neutral-600">Proposals pending</p>
            <p className="mt-2 text-4xl font-extrabold tracking-tight text-[#EA2323]">{pending}</p>
          </div>
          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
            Waiting on approvers
          </span>
        </div>
      </div>

      <div>
        <h2 className={`${heading} mb-4`}>Breakdowns</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Breakdown
            title="People by role"
            rows={ROLES.map((r) => ({
              label: ROLE_LABELS[r],
              count: overview.users_by_role[r] ?? 0,
              bar: "bg-[#1f1f1f]",
            }))}
          />
          <Breakdown
            title="Proposals by status"
            rows={PROPOSAL_ROWS.map((r) => ({
              label: r.label,
              count: overview.proposals[r.key] ?? 0,
              bar: r.bar,
            }))}
          />
          <Breakdown
            title="Tasks by status"
            rows={TASK_ROWS.map((r) => ({
              label: r.label,
              count: overview.tasks[r.key] ?? 0,
              bar: r.bar,
            }))}
          />
        </div>
      </div>
    </div>
  );
}
