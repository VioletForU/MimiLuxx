"use client";

import { useRouter } from "next/navigation";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this task?")) return;

    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const result = await res.json();
      alert(result.error || "Could not delete task");
      return;
    }

    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="text-sm underline">
      Delete
    </button>
  );
}