"use client";

import { useState } from "react";
import Link from "next/link";

const BADGE_STYLES: Record<string, string> = {
  "Overdue": "bg-red-100 text-red-700",
  "Due Today": "bg-orange-100 text-orange-700",
  "Due Soon": "bg-yellow-100 text-yellow-700",
  "Upcoming": "bg-blue-100 text-blue-700",
  "No Deadline": "bg-gray-100 text-gray-600",
};

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Completed" },
];

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
};

type RankedTask = Task & { priority: { score: number; label: string } };

export default function DashboardList({ initialTasks }: { initialTasks: RankedTask[] }) {
  const [tasks, setTasks] = useState<RankedTask[]>(initialTasks);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(taskId: string, newStatus: string) {
    setUpdatingId(taskId);

    setTasks((prev) => {
      const updated = prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus } : t
      );
      return [...updated].sort((a, b) => b.priority.score - a.priority.score);
    });

    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    setUpdatingId(null);

    if (!res.ok) {
      window.location.reload();
    }
  }

  const visibleTasks = tasks.filter((t) => t.status !== "done");

  if (visibleTasks.length === 0) {
    return <p>Nothing due — you're all caught up.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {visibleTasks.map((task) => (
        <li key={task.id} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{task.title}</p>
            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${BADGE_STYLES[task.priority.label]}`}
            >
              {task.priority.label}
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-gray-600">{task.description}</p>
          )}
          {task.due_date && <p className="text-sm">Due: {task.due_date}</p>}

          <div className="mt-2 flex items-center gap-2">
            <select
              className="rounded border p-1 text-sm"
              value={task.status}
              disabled={updatingId === task.id}
              onChange={(e) => handleStatusChange(task.id, e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {updatingId === task.id && (
              <span className="text-xs text-gray-400">Saving...</span>
            )}
            <Link href={`/tasks/${task.id}/edit`} className="text-sm underline">
              Edit
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
