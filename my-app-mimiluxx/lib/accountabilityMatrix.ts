import { createClient } from "@/lib/supabase/server";

export type MatrixRow = {
  committee_id: string;
  committee_name: string;
  member_count: number;
  total_tasks: number;
  todo: number;
  in_progress: number;
  done: number;
  overdue: number;
  last_activity: string | null;
};

/** Per-committee task counts for one organization (what the signed-in person may see). */
export async function loadAccountabilityMatrix(
  orgId: string
): Promise<{ rows: MatrixRow[]; error: string | null }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_accountability_matrix", {
    p_org: orgId,
  });

  if (error) return { rows: [], error: error.message };

  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    committee_id: String(r.committee_id),
    committee_name: String(r.committee_name),
    member_count: Number(r.member_count),
    total_tasks: Number(r.total_tasks),
    todo: Number(r.todo),
    in_progress: Number(r.in_progress),
    done: Number(r.done),
    overdue: Number(r.overdue),
    last_activity: (r.last_activity as string | null) ?? null,
  }));

  return { rows, error: null };
}