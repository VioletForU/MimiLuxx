"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProposalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Could not submit proposal");
      return;
    }

    router.push("/dashboard?tab=proposals");
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Submit Proposal</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && <p className="text-red-600">{error}</p>}
        <input
          className="rounded border p-2"
          placeholder="Proposal title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className="rounded border p-2"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
        />
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Proposal"}
        </button>
      </form>
    </main>
  );
}

