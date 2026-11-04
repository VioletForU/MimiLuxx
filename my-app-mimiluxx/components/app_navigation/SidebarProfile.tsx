import { ROLE_LABELS, type UserRole } from "@/lib/types/roles";

/**
 * Avatar + name + role at the top of the sidebar.
 * Shows the picture uploaded in Settings (profiles.avatar_url), falling back to initials.
 */
export default function SidebarProfile({
  avatarUrl,
  name,
  initials,
  role,
}: {
  avatarUrl?: string | null;
  name: string;
  initials: string;
  role?: string | null;
}) {
  const roleLabel = role ? (ROLE_LABELS[role as UserRole] ?? role) : "Member";

  return (
    <div className="mb-6 flex w-full items-start gap-3 border-b border-[#EDEDED] pb-6">
      <div className="size-14 shrink-0 overflow-hidden rounded-full bg-[#111111] ring-2 ring-[#E5252A]/40 ring-offset-2 ring-offset-white">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="Your profile picture" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-lg font-extrabold text-white">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <p className="break-words text-[15px] font-extrabold leading-tight text-[#111111]">
          {name}
        </p>
        <p className="mt-0.5 break-words text-xs text-[#7E8288]">{roleLabel}</p>
      </div>
    </div>
  );
}
