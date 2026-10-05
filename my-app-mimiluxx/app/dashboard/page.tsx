import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

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

  // Sorted by deadline: earliest due date first. Tasks with no due date
  // go last (nullsFirst: false), since they're not time-pressured yet.
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Next Actions</h1>
        <Link href="/tasks/new" className="rounded bg-black px-3 py-2 text-white">
          New Task
        </Link>
      </div>

      {error && <p>Could not load tasks: {error.message}</p>}
      {tasks && tasks.length === 0 && <p>Nothing due — you're all caught up.</p>}

      <ul className="flex flex-col gap-3">
        {tasks?.map((task) => (
          <li key={task.id} className="rounded border p-3">
            <p className="font-semibold">{task.title}</p>
            {task.description && <p className="text-sm text-gray-600">{task.description}</p>}
            <p className="text-sm">
              Status: {task.status}
              {task.due_date && ` · Due: ${task.due_date}`}
              {!task.due_date && " · No due date"}
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
