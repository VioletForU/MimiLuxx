import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TasksPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-md p-6">
        <p>Not logged in</p>
      </main>
    );
  }
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-md p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <Link href="/tasks/new" className="rounded bg-black px-3 py-2 text-white">
          New Task
        </Link>
      </div>

      {error && <p>Could not load tasks: {error.message}</p>}

      {tasks && tasks.length === 0 && <p>No tasks yet.</p>}

      <ul className="flex flex-col gap-3">
        {tasks?.map((task) => (
          <li key={task.id} className="rounded border p-3">
            <p className="font-semibold">{task.title}</p>
            {task.description && <p>{task.description}</p>}
            <p className="text-sm">
              Status: {task.status}
              {task.due_date && ` · Due: ${task.due_date}`}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}