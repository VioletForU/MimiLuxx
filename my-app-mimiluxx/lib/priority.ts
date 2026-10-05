export type TaskPriority = {
  score: number;
  label: "Overdue" | "Due Today" | "Due Soon" | "Upcoming" | "No Deadline";
};

/**
 * Basic priority score based on deadline proximity.
 * Higher score = more urgent. Status isn't factored in yet —
 * that comes later with US-05's live re-ranking.
 */
export function getTaskPriority(dueDate: string | null): TaskPriority {
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
