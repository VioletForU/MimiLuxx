"use client";

import { useState } from "react";
import { updateUserRole } from "@/app/actions/admin";
import { ROLES, ROLE_LABELS, type UserRole } from "@/lib/types/roles";
import type { AdminUser } from "@/lib/types/admin";
import {
  badge,
  card,
  emptyText,
  errorText,
  formatDate,
  heading,
  hint,
  initials,
  inputClass,
  th,
  tableWrap,
  tr,
  TONES,
  type Notify,
} from "../ui";

export default function UsersTab({
  users,
  currentUserId,
  error,
  notify,
}: {
  users: AdminUser[];
  currentUserId: string | null;
  error: string | null;
  notify: Notify;
}) {
  const [overrides, setOverrides] = useState<Record<string, UserRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");

  async function handleRoleChange(userId: string, newRole: UserRole) {
    const previous = overrides[userId];
    // Show the change right away, and put it back if the server says no.
    setOverrides((cur) => ({ ...cur, [userId]: newRole }));
    setBusyId(userId);

    const result = await updateUserRole(userId, newRole);

    setBusyId(null);
    if (!result.ok) {
      setOverrides((cur) => {
        const next = { ...cur };
        if (previous) next[userId] = previous;
        else delete next[userId];
        return next;
      });
      notify("error", `Could not update role: ${result.error}`);
      return;
    }
    notify("success", "Role updated.");
  }

  const roleOf = (u: AdminUser): UserRole => overrides[u.id] ?? u.role;
  const q = query.trim().toLowerCase();
  const visible = users.filter((u) => {
    if (roleFilter !== "all" && roleOf(u) !== roleFilter) return false;
    if (!q) return true;
    return [u.full_name, u.email, u.username].some((v) => v?.toLowerCase().includes(q));
  });

  return (
    <section className={card} aria-labelledby="users-heading">
      <h2 id="users-heading" className={heading}>
        Users and roles
      </h2>
      <p className={hint}>
        Change what someone can do by changing their role. You cannot change your own.
      </p>

      {error && (
        <p role="alert" className={errorText}>
          Could not load users: {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="user-search">
          Search users
        </label>
        <input
          id="user-search"
          type="search"
          placeholder="Search name, email or username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} w-full sm:w-72`}
        />
        <label className="sr-only" htmlFor="role-filter">
          Filter by role
        </label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | UserRole)}
          className={inputClass}
        >
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </div>

      <div className={tableWrap}>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-200">
              <th scope="col" className={th}>Person</th>
              <th scope="col" className={`${th} hidden md:table-cell`}>Joined</th>
              <th scope="col" className={`${th} hidden md:table-cell`}>Last sign-in</th>
              <th scope="col" className={th}>Role</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => {
              const isSelf = u.id === currentUserId;
              return (
                <tr key={u.id} className={tr}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          isSelf ? "bg-[#EA2323] text-white" : "bg-[#1f1f1f] text-white"
                        }`}
                      >
                        {initials(u.full_name || u.email || "?")}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-neutral-900">
                          {u.full_name || u.email || "Unknown"}
                          {isSelf && <span className={`${badge} ml-2 ${TONES.red}`}>You</span>}
                        </p>
                        <p className="truncate text-xs text-neutral-500">
                          {u.email}
                          {u.username ? ` · @${u.username}` : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="hidden px-4 py-3 text-neutral-600 md:table-cell">
                    {u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <label className="sr-only" htmlFor={`role-${u.id}`}>
                      Role for {u.email}
                    </label>
                    <select
                      id={`role-${u.id}`}
                      value={roleOf(u)}
                      disabled={isSelf || busyId === u.id}
                      title={isSelf ? "You cannot change your own role" : undefined}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className={inputClass}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABELS[r]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 && !error && (
          <p className={emptyText}>No one matches that.</p>
        )}
      </div>
    </section>
  );
}
