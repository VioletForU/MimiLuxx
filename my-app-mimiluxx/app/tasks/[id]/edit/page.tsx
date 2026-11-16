import PageFrame from "@/components/app_navigation/PageFrame";
import EditTaskForm from "./EditTaskForm";

export const metadata = { title: "Edit Task · MimiLuxx" };

export default function EditTaskPage() {
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