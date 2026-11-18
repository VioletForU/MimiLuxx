"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addCommittee,
  inviteMember,
  removeCommittee,
  removeMember,
  revokeInvite,
  updateMember,
} from "@/app/actions/org";
import { MAX_COMMITTEES_PER_ORGANIZATION, ORG_ASSIGNABLE_ROLES, type UserRole } from "@/lib/types/roles";
import type { AdminCommittee, OrgActionResult, OrgInvite, OrgMember } from "@/lib/types/admin";
import { card, darkButton, emptyText, errorText, heading, hint, inputClass, label, linkDanger, panel, rowItem } from "@/app/admin/ui";

type Notice = { type: "success" | "error"; text: string } | null;

export default function ManageOrg({
  organizationId,
  committees,
  members,
  invites,
  currentUserId,
  loadError,
}: {
  organizationId: string;
  committees: AdminCommittee[];
  members: OrgMember[];
  invites: OrgInvite[];
  currentUserId: string;
  loadError: string | null;
}) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [committeeName, setCommitteeName] = useState("");
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("Member");
  const [inviteCommittee, setInviteCommittee] = useState("");

  const committeeLabel = (id: string | null) => committees.find((c) => c.id === id)?.name ?? "—";

  async function run(key: string, action: () => Promise<OrgActionResult>, success: string, after?: () => void) {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.ok) {
      setNotice({ type: "error", text: result.error });
      return;
    }
    setNotice({ type: "success", text: result.message ?? success });
    after?.();
    router.refresh();
  }

  function onAddCommittee(e: FormEvent) {
    e.preventDefault();
    run("committee", () => addCommittee(organizationId, committeeName), "Committee added.", () =>
      setCommitteeName("")
    );
  }

  function onInvite(e: FormEvent) {
    e.preventDefault();
    run(
      "invite",
      () => inviteMember(organizationId, email, inviteRole, inviteCommittee || null),
      "Invite sent.",
      () => {
        setEmail("");
        setInviteCommittee("");
      }
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p role={notice.type === "error" ? "alert" : "status"} className={notice.type === "error" ? errorText : "rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"}>
          {notice.text}
        </p>
      )}
      {loadError && (
        <p role="alert" className={errorText}>
          Could not load everything: {loadError}. If this is a new setup, run 008_org_members.sql in the Supabase SQL Editor.
        </p>
      )}

      {/* ---- Committees ---- */}
      <section className={card}>
        <h2 className={heading}>Committees</h2>
        <p className={hint}>
          {committees.length} of {MAX_COMMITTEES_PER_ORGANIZATION} used.
        </p>
        <div className={`${panel} mt-5`}>
          <ul className="space-y-2">
            {committees.map((c) => (
              <li key={c.id} className={`${rowItem} text-sm`}>
                <span className="font-medium text-neutral-900">{c.name}</span>
                <button
                  type="button"
                  disabled={busy === `c-${c.id}`}
                  onClick={() => {
                    if (window.confirm(`Delete the committee "${c.name}"? Its members stay in the organization.`)) {
                      run(`c-${c.id}`, () => removeCommittee(organizationId, c.id), "Committee deleted.");
                    }
                  }}
                  className={linkDanger}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
          {committees.length === 0 && <p className="text-sm text-neutral-500">No committees yet.</p>}
        </div>
        <form onSubmit={onAddCommittee} className="mt-4 flex flex-wrap gap-3">
          <label className="sr-only" htmlFor="committee-name">New committee name</label>
          <input
            id="committee-name"
            value={committeeName}
            onChange={(e) => setCommitteeName(e.target.value)}
            placeholder="New committee name"
            maxLength={60}
            className={`${inputClass} w-full sm:w-64`}
          />
          <button
            type="submit"
            disabled={busy === "committee" || !committeeName.trim() || committees.length >= MAX_COMMITTEES_PER_ORGANIZATION}
            className={darkButton}
          >
            Add committee
          </button>
        </form>
      </section>

      {/* ---- Invite ---- */}
      <section className={card}>
        <h2 className={heading}>Invite someone</h2>
        <p className={hint}>
          New people get an email to set up their account and join automatically. If the email already has an
          account, they are added straight away.
        </p>
        <form onSubmit={onInvite} className="mt-5 flex flex-wrap items-end gap-3">
          <div>
            <label className={label} htmlFor="invite-email">Email</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className={`${inputClass} mt-1 block w-full sm:w-64`}
            />
          </div>
          <div>
            <label className={label} htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className={`${inputClass} mt-1 block`}
            >
              {ORG_ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label} htmlFor="invite-committee">Committee</label>
            <select
              id="invite-committee"
              value={inviteCommittee}
              onChange={(e) => setInviteCommittee(e.target.value)}
              className={`${inputClass} mt-1 block`}
            >
              <option value="">None</option>
              {committees.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={busy === "invite" || !email.trim()} className={darkButton}>
            {busy === "invite" ? "Sending…" : "Send invite"}
          </button>
        </form>

        {invites.length > 0 && (
          <div className={`${panel} mt-6`}>
            <h3 className={label}>Pending invites</h3>
            <ul className="mt-3 space-y-2">
              {invites.map((i) => (
                <li key={i.id} className={`${rowItem} text-sm`}>
                  <span>
                    <span className="font-medium text-neutral-900">{i.email}</span>
                    <span className="ml-2 text-neutral-500">
                      {i.role}
                      {i.committee_id ? ` · ${committeeLabel(i.committee_id)}` : ""}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={busy === `i-${i.id}`}
                    onClick={() => run(`i-${i.id}`, () => revokeInvite(organizationId, i.id), "Invite cancelled.")}
                    className={linkDanger}
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ---- Members ---- */}
      <section className={card}>
        <h2 className={heading}>Members ({members.length})</h2>
        <p className={hint}>Roles here apply to this organization only.</p>
        <ul className="mt-5 space-y-2">
          {members.map((m) => {
            const isPresident = m.role === "President";
            const name = m.full_name || m.username || m.email || "Unknown";
            return (
              <li key={m.id} className={`${rowItem} flex-wrap text-sm`}>
                <span className="min-w-0">
                  <span className="font-semibold text-neutral-900">{name}</span>
                  {m.user_id === currentUserId && <span className="ml-1 text-neutral-500">(you)</span>}
                  {m.email && <span className="block truncate text-xs text-neutral-500">{m.email}</span>}
                </span>
                {isPresident ? (
                  <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-semibold text-white">President</span>
                ) : (
                  <span className="flex flex-wrap items-center gap-2">
                    <label className="sr-only" htmlFor={`role-${m.id}`}>Role for {name}</label>
                    <select
                      id={`role-${m.id}`}
                      value={m.role}
                      disabled={busy === `m-${m.id}`}
                      onChange={(e) =>
                        run(`m-${m.id}`, () => updateMember(organizationId, m.id, { role: e.target.value as UserRole }), "Role updated.")
                      }
                      className={inputClass}
                    >
                      {ORG_ASSIGNABLE_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`committee-${m.id}`}>Committee for {name}</label>
                    <select
                      id={`committee-${m.id}`}
                      value={m.committee_id ?? ""}
                      disabled={busy === `m-${m.id}`}
                      onChange={(e) =>
                        run(`m-${m.id}`, () => updateMember(organizationId, m.id, { committeeId: e.target.value || null }), "Committee updated.")
                      }
                      className={inputClass}
                    >
                      <option value="">No committee</option>
                      {committees.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busy === `m-${m.id}`}
                      onClick={() => {
                        if (window.confirm(`Remove ${name} from this organization?`)) {
                          run(`m-${m.id}`, () => removeMember(organizationId, m.id), "Member removed.");
                        }
                      }}
                      className={linkDanger}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
        {members.length === 0 && !loadError && <p className={emptyText}>No members yet.</p>}
      </section>
    </div>
  );
}
