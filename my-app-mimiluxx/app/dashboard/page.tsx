import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTaskPriority } from "@/lib/priority";

const BADGE_STYLES: Record<string, string> = {
  "Overdue": "bg-red-100 text-red-700",
  "Due Today": "bg-orange-100 text-orange-700",
  "Due Soon": "bg-yellow-100 text-yellow-700",
  "Upcoming": "bg-blue-100 text-blue-700",
  "No Deadline": "bg-gray-100 text-gray-600",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p>Not logged in</p>
      </main>
    );
  }

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "done");

  // Compute priority score per task, then sort by score descending
  // (most urgent first) — this replaces the plain date sort from before.
  const rankedTasks = (tasks ?? [])
    .map((task) => ({ ...task, priority: getTaskPriority(task.due_date) }))
    .sort((a, b) => b.priority.score - a.priority.score);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Next Actions</h1>
        <Link href="/tasks/new" className="rounded bg-black px-3 py-2 text-white">
          New Task
        </Link>
      </div>

      {error && <p>Could not load tasks: {error.message}</p>}
      {rankedTasks.length === 0 && <p>Nothing due — you're all caught up.</p>}

      <ul className="flex flex-col gap-3">
        {rankedTasks.map((task) => (
          <li key={task.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{task.title}</p>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${BADGE_STYLES[task.priority.label]}`}
              >
                {task.priority.label}
              </span>
            </div>
            {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
            <p className="text-sm">
              Status: {task.status}
              {task.due_date && ` · Due: ${task.due_date}`}
            </p>
            <Link href={`/tasks/${task.id}/edit`} className="text-sm underline">
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
