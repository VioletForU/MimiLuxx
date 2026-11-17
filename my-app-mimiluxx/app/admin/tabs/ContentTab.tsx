"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createCommittee, createOrganization, deleteContent, setOrgPresident } from "@/app/actions/admin";
import { MAX_COMMITTEES_PER_ORGANIZATION } from "@/lib/types/roles";
import type { AdminOrg, AdminProposal, AdminTask, AdminUser, DeletableKind } from "@/lib/types/admin";
import {
  badge,
  card,
  dangerButton,
  darkButton,
  emptyText,
  errorText,
  formatDate,
  heading,
  hint,
  inputClass,
  label,
  linkDanger,
  panel,
  rowItem,
  segment,
  segmented,
  SETUP_HINT,
  tableWrap,
  th,
  tr,
  TONES,
  type Notify,
  type Tone,
} from "../ui";

type Section = "organizations" | "proposals" | "tasks";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "organizations", label: "Organizations" },
  { key: "proposals", label: "Proposals" },
  { key: "tasks", label: "Tasks" },
];

const STATUS_TONE: Record<string, Tone> = {
  pending: "yellow",
  approved: "green",
  rejected: "red",
  todo: "neutral",
  in_progress: "blue",
  blocked: "red",
  done: "green",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${badge} capitalize ${TONES[STATUS_TONE[status] ?? "neutral"]}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ContentTab({
  organizations,
  users,
  proposals,
  tasks,
  error,
  notify,
}: {
  organizations: AdminOrg[];
  users: AdminUser[];
  proposals: AdminProposal[];
  tasks: AdminTask[];
  error: string | null;
  notify: Notify;
}) {
  const [section, setSection] = useState<Section>("organizations");
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [presidentId, setPresidentId] = useState("");
  const [presidentPick, setPresidentPick] = useState<Record<string, string>>({});
  const [committeeNames, setCommitteeNames] = useState<Record<string, string>>({});

  async function handleDelete(kind: DeletableKind, id: string, label: string, warning = "") {
    if (!window.confirm(`Delete ${label}? ${warning} This cannot be undone.`.replace("  ", " "))) return;

    setBusyId(id);
    const result = await deleteContent(kind, id);
    setBusyId(null);

    if (!result.ok) {
      notify("error", `Could not delete: ${result.error}`);
      return;
    }
    setRemoved((prev) => new Set(prev).add(id));
    notify("success", "Deleted.");
  }

  async function handleCreateOrg(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusyId("new-org");
    const result = await createOrganization(orgName, presidentId);
    setBusyId(null);

    if (!result.ok) {
      notify("error", result.error);
      return;
    }
    setOrgName("");
    setPresidentId("");
    notify("success", "Organization created.");
  }

  async function handleSetPresident(orgId: string) {
    const userId = presidentPick[orgId];
    if (!userId) return;
    setBusyId(`president-${orgId}`);
    const result = await setOrgPresident(orgId, userId);
    setBusyId(null);

    if (!result.ok) {
      notify("error", result.error);
      return;
    }
    setPresidentPick((cur) => ({ ...cur, [orgId]: "" }));
    notify("success", "President updated.");
  }

  const userOptions = users.map((u) => ({
    id: u.id,
    text: `${u.full_name || u.username || "Unnamed"}${u.email ? ` (${u.email})` : ""}`,
  }));

  async function handleCreateCommittee(e: FormEvent<HTMLFormElement>, orgId: string) {
    e.preventDefault();
    setBusyId(`new-committee-${orgId}`);
    const result = await createCommittee(orgId, committeeNames[orgId] ?? "");
    setBusyId(null);

    if (!result.ok) {
      notify("error", result.error);
      return;
    }
    setCommitteeNames((cur) => ({ ...cur, [orgId]: "" }));
    notify("success", "Committee added.");
  }

  const orgs = organizations.filter((o) => !removed.has(o.id));
  const visibleProposals = proposals.filter((p) => !removed.has(p.id));
  const visibleTasks = tasks.filter((t) => !removed.has(t.id));

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className={errorText}>
          Could not load some content: {error}. {SETUP_HINT}
        </p>
      )}

      <div className={segmented} role="group" aria-label="Kinds of content">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            aria-pressed={section === s.key}
            className={segment(section === s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "organizations" && (
        <div className="space-y-4">
          <form onSubmit={handleCreateOrg} className={card}>
            <h2 className={heading}>New organization</h2>
            <p className={hint}>
              Pick who will be the president. They then create the committees, invite members by email
              and set their roles. Each organization can have up to {MAX_COMMITTEES_PER_ORGANIZATION} committees.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <label className="sr-only" htmlFor="org-name">
                Organization name
              </label>
              <input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name"
                maxLength={60}
                className={`${inputClass} w-full sm:w-72`}
              />
              <label className="sr-only" htmlFor="org-president">
                President
              </label>
              <select
                id="org-president"
                value={presidentId}
                onChange={(e) => setPresidentId(e.target.value)}
                className={`${inputClass} w-full sm:w-80`}
              >
                <option value="">Choose a president…</option>
                {userOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.text}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={busyId === "new-org" || !orgName.trim() || !presidentId}
                className={darkButton}
              >
                Create
              </button>
            </div>
          </form>

          {orgs.map((org) => (
            <article key={org.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#1f1f1f] text-lg font-extrabold text-white"
                  >
                    {org.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <h2 className={heading}>{org.name}</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {org.slug} · created by {org.owner_name} on {formatDate(org.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busyId === org.id}
                  onClick={() =>
                    handleDelete(
                      "organization",
                      org.id,
                      `the organization "${org.name}"`,
                      org.committees.length > 0
                        ? `This also deletes its ${org.committees.length} committee(s).`
                        : ""
                    )
                  }
                  className={dangerButton}
                >
                  Delete organization
                </button>
              </div>

              <div className={`${panel} mt-6`}>
                <h3 className={label}>President</h3>
                <p className="mt-2 text-sm font-medium text-neutral-900">
                  {org.president_name ?? "No president yet"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="sr-only" htmlFor={`president-${org.id}`}>
                    New president for {org.name}
                  </label>
                  <select
                    id={`president-${org.id}`}
                    value={presidentPick[org.id] ?? ""}
                    onChange={(e) => setPresidentPick((cur) => ({ ...cur, [org.id]: e.target.value }))}
                    className={`${inputClass} w-full sm:w-80`}
                  >
                    <option value="">{org.president_id ? "Change president…" : "Choose a president…"}</option>
                    {userOptions
                      .filter((u) => u.id !== org.president_id)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.text}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={busyId === `president-${org.id}` || !presidentPick[org.id]}
                    onClick={() => handleSetPresident(org.id)}
                    className={darkButton}
                  >
                    Set president
                  </button>
                  <Link href={`/orgs/${org.slug}/manage`} className="text-sm font-semibold underline underline-offset-4">
                    Manage members
                  </Link>
                </div>
              </div>

              <div className={`${panel} mt-4`}>
                <h3 className={label}>
                  Committees ({org.committees.filter((c) => !removed.has(c.id)).length} of{" "}
                  {MAX_COMMITTEES_PER_ORGANIZATION})
                </h3>
                <ul className="mt-3 space-y-2">
                  {org.committees
                    .filter((c) => !removed.has(c.id))
                    .map((c) => (
                      <li key={c.id} className={`${rowItem} text-sm`}>
                        <span className="font-medium text-neutral-900">{c.name}</span>
                        <button
                          type="button"
                          disabled={busyId === c.id}
                          onClick={() => handleDelete("committee", c.id, `the committee "${c.name}"`)}
                          className={linkDanger}
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                </ul>
                {org.committees.filter((c) => !removed.has(c.id)).length === 0 && (
                  <p className="text-sm text-neutral-500">No committees yet.</p>
                )}
              </div>

              <form onSubmit={(e) => handleCreateCommittee(e, org.id)} className="mt-4 flex flex-wrap gap-3">
                <label className="sr-only" htmlFor={`committee-${org.id}`}>
                  New committee name for {org.name}
                </label>
                <input
                  id={`committee-${org.id}`}
                  value={committeeNames[org.id] ?? ""}
                  onChange={(e) => setCommitteeNames((cur) => ({ ...cur, [org.id]: e.target.value }))}
                  placeholder="New committee name"
                  maxLength={60}
                  className={`${inputClass} w-full sm:w-64`}
                />
                <button
                  type="submit"
                  disabled={
                    busyId === `new-committee-${org.id}` ||
                    !(committeeNames[org.id] ?? "").trim() ||
                    org.committees.filter((c) => !removed.has(c.id)).length >= MAX_COMMITTEES_PER_ORGANIZATION
                  }
                  className={darkButton}
                >
                  Add committee
                </button>
              </form>
            </article>
          ))}
          {orgs.length === 0 && !error && (
            <p className={emptyText}>No organizations yet.</p>
          )}
        </div>
      )}

      {section === "proposals" && (
        <section className={card} aria-labelledby="proposals-heading">
          <h2 id="proposals-heading" className={heading}>
            Proposals
          </h2>
          <p className={hint}>Showing the latest 200. Deleting one also removes its approval history.</p>
          <div className={tableWrap}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className={th}>Title</th>
                  <th scope="col" className={th}>Submitted by</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={`${th} hidden md:table-cell`}>Stage</th>
                  <th scope="col" className={`${th} hidden md:table-cell`}>Submitted</th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleProposals.map((p) => (
                  <tr key={p.id} className={tr}>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{p.title}</td>
                    <td className="px-4 py-3 text-neutral-700">{p.submitter_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <span className={`${badge} ${TONES.neutral}`}>Stage {p.current_stage}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{formatDate(p.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() =>
                          handleDelete("proposal", p.id, `the proposal "${p.title}"`, "This also deletes its approval history.")
                        }
                        className={dangerButton}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleProposals.length === 0 && !error && (
              <p className={emptyText}>No proposals yet.</p>
            )}
          </div>
        </section>
      )}

      {section === "tasks" && (
        <section className={card} aria-labelledby="tasks-heading">
          <h2 id="tasks-heading" className={heading}>
            Tasks
          </h2>
          <p className={hint}>Showing the latest 200.</p>
          <div className={tableWrap}>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th scope="col" className={th}>Title</th>
                  <th scope="col" className={th}>Owner</th>
                  <th scope="col" className={th}>Status</th>
                  <th scope="col" className={`${th} hidden md:table-cell`}>Due</th>
                  <th scope="col" className={`${th} hidden md:table-cell`}>Created</th>
                  <th scope="col" className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleTasks.map((t) => (
                  <tr key={t.id} className={tr}>
                    <td className="px-4 py-3 font-semibold text-neutral-900">{t.title}</td>
                    <td className="px-4 py-3 text-neutral-700">{t.owner_name}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                      {t.due_date ? formatDate(t.due_date) : "None"}
                    </td>
                    <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">{formatDate(t.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busyId === t.id}
                        onClick={() => handleDelete("task", t.id, `the task "${t.title}"`)}
                        className={dangerButton}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleTasks.length === 0 && !error && (
              <p className={emptyText}>No tasks yet.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
