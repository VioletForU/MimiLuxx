import type { ActivityItem } from "@/lib/types/admin";
import { badge, card, emptyText, errorText, formatDateTime, heading, hint, SETUP_HINT, TONES, type Tone } from "../ui";

const KINDS: Record<string, { label: string; tone: Tone }> = {
  signup: { label: "Joined", tone: "blue" },
  sign_in: { label: "Sign-in", tone: "neutral" },
  task: { label: "Task", tone: "yellow" },
  proposal: { label: "Proposal", tone: "purple" },
  approval: { label: "Approved", tone: "green" },
  rejection: { label: "Rejected", tone: "red" },
  organization: { label: "Organization", tone: "orange" },
  committee: { label: "Committee", tone: "orange" },
};

export default function ActivityTab({
  activity,
  error,
}: {
  activity: ActivityItem[];
  error: string | null;
}) {
  return (
    <section className={card} aria-labelledby="activity-heading">
      <h2 id="activity-heading" className={heading}>
        Recent activity
      </h2>
      <p className={hint}>
        The latest 50 things people have done, newest first. Times are in UTC. A person&apos;s
        sign-in shows only their most recent one.
      </p>

      {error && (
        <p role="alert" className={errorText}>
          Could not load activity: {error}. {SETUP_HINT}
        </p>
      )}

      <ul className="mt-5 space-y-2.5">
        {activity.map((item, i) => {
          const kind = KINDS[item.kind] ?? { label: item.kind, tone: "neutral" as Tone };
          return (
            <li
              key={`${item.occurred_at}-${i}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-neutral-200 px-4 py-3 transition-colors hover:bg-neutral-50"
            >
              <span className={`${badge} w-28 justify-center ${TONES[kind.tone]}`}>{kind.label}</span>
              <span className="text-sm font-semibold text-neutral-900">{item.actor ?? "Someone"}</span>
              <span className="text-sm text-neutral-600">{item.detail}</span>
              <time
                dateTime={item.occurred_at}
                className="ml-auto text-xs font-medium text-neutral-500"
              >
                {formatDateTime(item.occurred_at)}
              </time>
            </li>
          );
        })}
      </ul>
      {activity.length === 0 && !error && <p className={emptyText}>Nothing has happened yet.</p>}
    </section>
  );
}
