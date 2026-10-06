import { createClient } from "@/lib/supabase/server";
import { getTaskPriority } from "@/lib/priority";
import DashboardList from "./DashboardList";

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
    .eq("user_id", user.id);

  const rankedTasks = (tasks ?? [])
    .map((task) => ({ ...task, priority: getTaskPriority(task.due_date) }))
    .sort((a, b) => b.priority.score - a.priority.score);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Next Actions</h1>
        <a href="/tasks/new" className="rounded bg-black px-3 py-2 text-white">
          New Task
        </a>
      </div>

      {error && <p>Could not load tasks: {error.message}</p>}

      <DashboardList initialTasks={rankedTasks} />
    </main>
  );
}
