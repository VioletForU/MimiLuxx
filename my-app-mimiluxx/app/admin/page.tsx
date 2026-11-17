import { requireRole } from "@/lib/supabase/requireRole";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PANEL_ROLES } from "@/lib/types/roles";
import type { ProposalStatus } from "@/lib/types/proposal";
import type {
  ActivityItem,
  AdminCommittee,
  AdminOrg,
  AdminOverview,
  AdminProposal,
  AdminTask,
  AdminUser,
  DatabaseHealth,
  LoadErrors,
} from "@/lib/types/admin";
import AdminPanel from "./AdminPanel";
import AppSidebar from "@/components/app_navigation/AppSidebar";

type OrgRow = { id: string; name: string; slug: string; created_by: string; created_at: string };
type ProposalRow = {
  id: string;
  title: string;
  status: ProposalStatus;
  current_stage: number;
  submitted_by: string;
  created_at: string;
};
type TaskRow = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  user_id: string;
  created_at: string;
};

/** Grey admin canvas with the shared AppSidebar on the left so admins can navigate away. */
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#d4d4d4] text-neutral-900">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-start gap-8 px-6 pb-24 pt-10 sm:pt-14 lg:flex-row lg:gap-12 lg:px-10">
        <AppSidebar active="admin" />
        <main className="w-full min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

export default async function AdminPage() {
  // Sends signed-out visitors to /login, and anyone who is not an Admin to /unauthorized.
  await requireRole(PANEL_ROLES);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <AdminShell>
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold tracking-tight">Admin panel</h1>
          <div className="mt-6 rounded-3xl bg-white p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Setup needed</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">
              The admin panel needs the{" "}
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[0.85em] font-semibold">
                SUPABASE_SERVICE_ROLE_KEY
              </code>{" "}
              environment variable on the server. Add it to{" "}
              <code className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[0.85em] font-semibold">.env.local</code>{" "}
              (and to Vercel for deployed sites), then restart.
            </p>
          </div>
        </div>
      </AdminShell>
    );
  }

  const [usersRes, overviewRes, healthRes, activityRes, orgsRes, committeesRes, proposalsRes, tasksRes, presidentsRes] =
    await Promise.all([
      admin.rpc("get_admin_users"),
      admin.rpc("get_admin_overview"),
      admin.rpc("get_database_health"),
      admin.rpc("get_recent_activity", { p_limit: 50 }),
      admin
        .from("organizations")
        .select("id, name, slug, created_by, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("committees")
        .select("id, organization_id, name, created_at")
        .order("created_at", { ascending: true }),
      admin
        .from("proposals")
        .select("id, title, status, current_stage, submitted_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      admin
        .from("tasks")
        .select("id, title, status, due_date, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      admin.from("organization_members").select("organization_id, user_id").eq("role", "President"),
    ]);

  const users = (usersRes.data ?? []) as AdminUser[];
  const nameById = new Map<string, string>(
    users.map((u) => [u.id, u.full_name || u.email || "Unknown"] as [string, string])
  );
  const nameOf = (id: string) => nameById.get(id) ?? "Unknown";

  // Before 008_org_members.sql is run this query errors; presidents are simply blank then.
  const presidentByOrg = new Map<string, string>(
    ((presidentsRes.data ?? []) as { organization_id: string; user_id: string }[]).map(
      (m) => [m.organization_id, m.user_id] as [string, string]
    )
  );

  const committees = (committeesRes.data ?? []) as AdminCommittee[];
  const organizations: AdminOrg[] = ((orgsRes.data ?? []) as OrgRow[]).map((o) => ({
    ...o,
    owner_name: nameOf(o.created_by),
    president_id: presidentByOrg.get(o.id) ?? null,
    president_name: presidentByOrg.has(o.id) ? nameOf(presidentByOrg.get(o.id)!) : null,
    committees: committees.filter((c) => c.organization_id === o.id),
  }));

  const proposals: AdminProposal[] = ((proposalsRes.data ?? []) as ProposalRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    status: p.status,
    current_stage: p.current_stage,
    submitter_name: nameOf(p.submitted_by),
    created_at: p.created_at,
  }));

  const tasks: AdminTask[] = ((tasksRes.data ?? []) as TaskRow[]).map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    due_date: t.due_date,
    owner_name: nameOf(t.user_id),
    created_at: t.created_at,
  }));

  const loadErrors: LoadErrors = {
    users: usersRes.error?.message ?? null,
    overview: overviewRes.error?.message ?? null,
    content:
      orgsRes.error?.message ??
      committeesRes.error?.message ??
      presidentsRes.error?.message ??
      proposalsRes.error?.message ??
      tasksRes.error?.message ??
      null,
    activity: activityRes.error?.message ?? null,
    health: healthRes.error?.message ?? null,
  };

  return (
    <AdminShell>
      <AdminPanel
        users={users}
        overview={(overviewRes.data ?? null) as AdminOverview | null}
        health={(healthRes.data ?? null) as DatabaseHealth | null}
        activity={(activityRes.data ?? []) as ActivityItem[]}
        organizations={organizations}
        proposals={proposals}
        tasks={tasks}
        loadErrors={loadErrors}
        currentUserId={user?.id ?? null}
      />
    </AdminShell>
  );
}
