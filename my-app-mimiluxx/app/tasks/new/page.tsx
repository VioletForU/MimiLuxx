import PageFrame from "@/components/app_navigation/PageFrame";
import NewTaskForm from "./NewTaskForm";
import { requireUser } from "@/lib/supabase/requireUser";

export const metadata = { title: "New Task · MimiLuxx" };

export default async function NewTaskPage() {
  await requireUser("/tasks/new");
  return (
    <PageFrame
      active="tasks"
      eyebrow="Tasks"
      title="Create a task"
      subtitle="Add what needs doing and when it is due. Your dashboard ranks tasks by deadline automatically."
    >
      <NewTaskForm />
    </PageFrame>
  );
}
