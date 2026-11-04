"use client";

import { useCallback, useEffect, useState } from "react";

type Comment = {
  id: string;
  parent_id: string | null;
  author_id: string;
  body: string;
  created_at: string;
};

type Props = {
  targetType: "task" | "flag";
  targetId: string;
};

export default function CommentThread({ targetType, targetId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/comments?target_type=${targetType}&target_id=${targetId}`
    );
    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error || "Could not load comments");
    } else {
      setComments(result.comments);
    }
    setLoading(false);
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: targetType,
        target_id: targetId,
        parent_id: replyTo,
        body,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      setMessage(result.error || "Could not post comment");
      return;
    }

    setBody("");
    setReplyTo(null);
    load();
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function CommentItem({ comment }: { comment: Comment }) {
    return (
      <div className="rounded border p-2">
        <p className="text-xs">
          {comment.author_id.slice(0, 8)} ·{" "}
          {new Date(comment.created_at).toLocaleString()}
        </p>
        <p>{comment.body}</p>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => setReplyTo(comment.id)}
        >
          Reply
        </button>
      </div>
    );
  }

  if (loading) return <p>Loading comments...</p>;

  return (
    <section className="mt-4">
      <h2 className="mb-2 font-semibold">Comments</h2>

      {message && <p className="mb-2">{message}</p>}
      {topLevel.length === 0 && !message && <p>No comments yet.</p>}

      <div className="flex flex-col gap-3">
        {topLevel.map((c) => (
          <div key={c.id} className="flex flex-col gap-2">
            <CommentItem comment={c} />
            <div className="ml-6 flex flex-col gap-2">
              {repliesOf(c.id).map((r) => (
                <CommentItem key={r.id} comment={r} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
        {replyTo && (
          <p className="text-xs">
            Replying to a comment.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => setReplyTo(null)}
            >
              Cancel
            </button>
          </p>
        )}
        <textarea
          className="rounded border p-2"
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <button type="submit" className="rounded bg-black p-2 text-white">
          Post
        </button>
      </form>
    </section>
  );
}