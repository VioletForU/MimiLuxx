"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/tasks/${id}`);
      const result = await res.json();
      if (!res.ok) {
        setMessage(result.error || "Could not load task");
        setLoading(false);
        return;
      }
      const t = result.task;
      setTitle(t.title);
      setDescription(t.description ?? "");
      setStatus(t.status);
      setDueDate(t.due_date ?? "");
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        status,
        due_date: dueDate,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error || "Something went wrong");
      return;
    }

    router.push("/tasks");
    router.refresh();
  }

  if (loading) return <main className="p-6">Loading...</main>;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="mb-4 text-2xl font-bold">Edit Task</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          className="rounded border p-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="rounded border p-2"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          className="rounded border p-2"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="todo">To do</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
        <input
          type="date"
          className="rounded border p-2"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button type="submit" className="rounded bg-black p-2 text-white">
          Save Changes
        </button>
      </form>

      {message && <p className="mt-3">{message}</p>}
    </main>
  );
}