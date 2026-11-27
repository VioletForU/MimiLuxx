import PageFrame from "@/components/app_navigation/PageFrame";
import EditTaskForm from "./EditTaskForm";
import { requireUser } from "@/lib/supabase/requireUser";

export const metadata = { title: "Edit Task · MimiLuxx" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(`/tasks/${id}/edit`);
  return (
    <PageFrame
      active="tasks"
      eyebrow="Tasks"
      title="Edit task"
      subtitle="Update the details, status or deadline. Your dashboard re-ranks tasks by due date automatically."
      backHref="/tasks"
      backLabel="Back to tasks"
    >
      <EditTaskForm />
    </PageFrame>
  );
}