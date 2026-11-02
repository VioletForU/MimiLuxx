"use client";

import { useState } from "react";
import type {
  ActivityItem,
  AdminOrg,
  AdminOverview,
  AdminProposal,
  AdminTask,
  AdminUser,
  DatabaseHealth,
  LoadErrors,
} from "@/lib/types/admin";
import { segment, segmented, type Notify } from "./ui";
import OverviewTab from "./tabs/OverviewTab";
import UsersTab from "./tabs/UsersTab";
import ContentTab from "./tabs/ContentTab";
import ActivityTab from "./tabs/ActivityTab";
import DatabaseTab from "./tabs/DatabaseTab";

type Tab = "overview" | "users" | "content" | "activity" | "database";
type Notice = { type: "success" | "error"; text: string } | null;

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "users", label: "Users & roles" },
  { key: "content", label: "Content" },
  { key: "activity", label: "Activity" },
  { key: "database", label: "Database" },
];

export default function AdminPanel({
  users,
  overview,
  health,
  activity,
  organizations,
  proposals,
  tasks,
  loadErrors,
  currentUserId,
  myOrgCount,
}: {
  users: AdminUser[];
  overview: AdminOverview | null;
  health: DatabaseHealth | null;
  activity: ActivityItem[];
  organizations: AdminOrg[];
  proposals: AdminProposal[];
  tasks: AdminTask[];
  loadErrors: LoadErrors;
  currentUserId: string | null;
  myOrgCount: number;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState<Notice>(null);

  const notify: Notify = (type, text) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4500);
  };

  return (
    <div>
      <header className="mb-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-700">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EA2323]" />
          Presidents and Advisers only
        </p>
        <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-900 sm:text-5xl">
          Admin panel
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-700">
          Manage roles, review what people create, and keep an eye on the system.
        </p>
      </header>

      {notice && (
        <div
          role={notice.type === "error" ? "alert" : "status"}
          className={`fixed bottom-6 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-xl ${
            notice.type === "success" ? "bg-[#1f1f1f] text-white" : "bg-[#EA2323] text-white"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-full ${
              notice.type === "success" ? "bg-green-400" : "bg-white"
            }`}
          />
          {notice.text}
        </div>
      )}

      <nav aria-label="Admin sections" className={`mb-8 ${segmented}`}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            aria-pressed={tab === t.key}
            className={segment(tab === t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab overview={overview} error={loadErrors.overview} />}
      {tab === "users" && (
        <UsersTab
          users={users}
          currentUserId={currentUserId}
          error={loadErrors.users}
          notify={notify}
        />
      )}
      {tab === "content" && (
        <ContentTab
          organizations={organizations}
          proposals={proposals}
          tasks={tasks}
          myOrgCount={myOrgCount}
          error={loadErrors.content}
          notify={notify}
        />
      )}
      {tab === "activity" && <ActivityTab activity={activity} error={loadErrors.activity} />}
      {tab === "database" && <DatabaseTab health={health} error={loadErrors.health} />}
    </div>
  );
}
