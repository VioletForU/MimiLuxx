import PageFrame from "@/components/app_navigation/PageFrame";
import { loadOrgContext } from "@/lib/orgFolders";
import { isLeadership } from "@/lib/orgAccess";
import { loadAccountabilityMatrix } from "@/lib/accountabilityMatrix";

type Params = { params: Promise<{ slug: string }> };

export const metadata = { title: "Accountability matrix · MimiLuxx" };

function formatWhen(iso: string | null) {
  if (!iso) return "No activity yet";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Pill({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F6F6] px-2.5 py-1 text-xs font-bold">
      <span className={`size-2 rounded-full ${dot}`} aria-hidden="true" />
      {value}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export default async function MatrixPage({ params }: Params) {
  const { slug } = await params;
  const { org, access, loadError } = await loadOrgContext(slug);

  const canView = isLeadership(access) || access.role === "Committee Head";

  const { rows, error } = canView
    ? await loadAccountabilityMatrix(org.id)
    : { rows: [], error: null };

  const totals = rows.reduce(
    (sum, r) => ({
      total: sum.total + r.total_tasks,
      todo: sum.todo + r.todo,
      inProgress: sum.inProgress + r.in_progress,
      done: sum.done + r.done,
      overdue: sum.overdue + r.overdue,
    }),
    { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 }
  );

  return (
    <PageFrame
      active="orgs"
      eyebrow="Organization"
      title="Accountability matrix"
      subtitle={`Task progress by committee in ${org.name}.`}
      backHref={`/orgs/${org.slug}/folders`}
      backLabel="Back to folders"
    >
      {(loadError || error) && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Could not load everything: {loadError ?? error}
        </p>
      )}

      {!canView ? (
        <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
          The matrix is for organization leadership and committee heads.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-2xl bg-[#F6F6F6] px-5 py-6 text-sm text-[#6b6b6b]">
          No committees to show yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[#F6F6F6] text-xs uppercase tracking-wide text-[#6b6b6b]">
              <tr>
                <th className="px-4 py-3 font-bold">Committee</th>
                <th className="px-4 py-3 font-bold">Members</th>
                <th className="px-4 py-3 font-bold">Tasks</th>
                <th className="px-4 py-3 font-bold">To do</th>
                <th className="px-4 py-3 font-bold">In progress</th>
                <th className="px-4 py-3 font-bold">Done</th>
                <th className="px-4 py-3 font-bold">Overdue</th>
                <th className="px-4 py-3 font-bold">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.committee_id} className="border-t border-black/10">
                  <td className="px-4 py-3 font-bold">{r.committee_name}</td>
                  <td className="px-4 py-3">{r.member_count}</td>
                  <td className="px-4 py-3 font-bold">{r.total_tasks}</td>
                  <td className="px-4 py-3">
                    <Pill label="To do" value={r.todo} dot="bg-[#8F9499]" />
                  </td>
                  <td className="px-4 py-3">
                    <Pill label="In progress" value={r.in_progress} dot="bg-[#f25c05]" />
                  </td>
                  <td className="px-4 py-3">
                    <Pill label="Done" value={r.done} dot="bg-[#2f9e44]" />
                  </td>
                  <td className="px-4 py-3">
                    <Pill label="Overdue" value={r.overdue} dot="bg-[#E5252A]" />
                  </td>
                  <td className="px-4 py-3 text-[#555]">{formatWhen(r.last_activity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-black/10 bg-[#FAFAFA] font-bold">
              <tr>
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3">{totals.total}</td>
                <td className="px-4 py-3">{totals.todo}</td>
                <td className="px-4 py-3">{totals.inProgress}</td>
                <td className="px-4 py-3">{totals.done}</td>
                <td className="px-4 py-3">{totals.overdue}</td>
                <td className="px-4 py-3" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PageFrame>
  );
}