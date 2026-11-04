import { requireRole } from "@/lib/supabase/requireRole";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_ROLES } from "@/lib/types/roles";
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

export default async function AdminPage() {
  // Sends signed-out visitors to /login, and anyone who is not a President or Adviser to /unauthorized.
  await requireRole(ADMIN_ROLES);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return (
      <div className="min-h-screen bg-[#d4d4d4] text-neutral-900">
        <main className="mx-auto max-w-2xl px-6 py-12">
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
        </main>
      </div>
    );
  }

  const [usersRes, overviewRes, healthRes, activityRes, orgsRes, committeesRes, proposalsRes, tasksRes] =
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
    ]);

  const users = (usersRes.data ?? []) as AdminUser[];
  const nameById = new Map<string, string>(
    users.map((u) => [u.id, u.full_name || u.email || "Unknown"] as [string, string])
  );
  const nameOf = (id: string) => nameById.get(id) ?? "Unknown";

  const committees = (committeesRes.data ?? []) as AdminCommittee[];
  const organizations: AdminOrg[] = ((orgsRes.data ?? []) as OrgRow[]).map((o) => ({
    ...o,
    owner_name: nameOf(o.created_by),
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
      proposalsRes.error?.message ??
      tasksRes.error?.message ??
      null,
    activity: activityRes.error?.message ?? null,
    health: healthRes.error?.message ?? null,
  };

  return (
    <div className="min-h-screen bg-[#d4d4d4] text-neutral-900">
    <main className="mx-auto max-w-6xl px-6 pb-24 pt-10 sm:pt-14">
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
        myOrgCount={organizations.filter((o) => o.created_by === user?.id).length}
      />
    </main>
    </div>
  );
}
