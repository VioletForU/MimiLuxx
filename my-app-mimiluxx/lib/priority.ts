export type TaskPriority = {
  score: number;
  label: "Completed" | "Overdue" | "Due Today" | "Due Soon" | "Upcoming" | "No Deadline";
};

/**
 * Basic priority score based on deadline proximity.
 * Higher score = more urgent. A finished task is never urgent, so a
 * "done" status wins over the deadline and sinks below everything else.
 */
export function getTaskPriority(dueDate: string | null, status?: string | null): TaskPriority {
  if (status === "done") {
    return { score: -1, label: "Completed" };
  }

  if (!dueDate) {
    return { score: 0, label: "No Deadline" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilDue < 0) {
    // Overdue tasks get higher urgency the longer they've been overdue.
    return { score: 100 + Math.abs(daysUntilDue), label: "Overdue" };
  }
  if (daysUntilDue === 0) {
    return { score: 90, label: "Due Today" };
  }
  if (daysUntilDue <= 3) {
    return { score: 70 - daysUntilDue, label: "Due Soon" };
  }
  return { score: Math.max(10, 50 - daysUntilDue), label: "Upcoming" };
}
