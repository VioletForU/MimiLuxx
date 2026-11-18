import Link from "next/link";

/** The folder tile used on the dashboard, reused for committees and members. */
export default function FolderCard({
  name,
  caption,
  href,
  lockedReason,
  highlight,
}: {
  name: string;
  caption?: string;
  /** Where the folder opens. Leave out (or pass lockedReason) for a folder the person can't open. */
  href?: string;
  lockedReason?: string;
  highlight?: boolean;
}) {
  const locked = !href;

  const body = (
    <>
      <div className="absolute right-0 top-0 h-3.5 w-[52%] rounded-bl-[10px] bg-[#E5252A]" />
      <div className="p-3" />
      <div className="flex items-center justify-between gap-2 rounded-b-[18px] bg-[#111111] px-4 py-3">
        <div className="min-w-0">
          <h4 className="truncate text-[13px] font-bold leading-tight text-white">{name}</h4>
          {caption && <p className="mt-0.5 truncate text-[10px] leading-tight text-[#888888]">{caption}</p>}
        </div>
        {locked ? (
          <svg className="size-4 shrink-0 text-[#888888]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
        ) : (
          <div className="flex shrink-0 items-center -space-x-1.5" aria-hidden="true">
            <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
            <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
            <div className="h-4 w-4 rounded-full border border-[#111] bg-white" />
          </div>
        )}
      </div>
    </>
  );

  const base = `relative flex h-[138px] flex-col justify-between overflow-hidden rounded-[18px] bg-[#C2C5C8] shadow-xs ${
    highlight ? "ring-2 ring-[#E5252A] ring-offset-2" : ""
  }`;

  if (locked) {
    return (
      <div className={`${base} cursor-not-allowed opacity-60`} title={lockedReason} aria-disabled="true" aria-label={`${name} (locked)`}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      aria-label={name}
      className={`${base} transition duration-200 hover:-translate-y-[3px] hover:shadow-[0_10px_20px_-4px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5252A] focus-visible:ring-offset-2`}
    >
      {body}
    </Link>
  );
}
