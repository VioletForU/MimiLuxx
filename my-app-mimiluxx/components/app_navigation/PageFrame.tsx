import Link from "next/link";
import AppSidebar, { type SidebarKey } from "./AppSidebar";

/**
 * Page chrome for inner pages (New Task, New Proposal, ...):
 * brand header + the shared AppSidebar + a title block, then the page's content.
 */
export default function PageFrame({
  active,
  eyebrow,
  title,
  subtitle,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
  children,
}: {
  active?: SidebarKey;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#E8EAEF] py-6">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col bg-white px-6 pb-14 pt-8 shadow-[0_25px_60px_rgba(0,0,0,0.12)] lg:px-16">
        {/* Brand header */}
        <header className="mb-10 flex w-full items-center justify-center">
          <Link href="/dashboard" className="relative flex select-none items-center no-underline">
            <span className="text-[44px] font-black leading-none tracking-tight text-[#111111]">Mimi</span>
            <span className="text-[44px] font-black leading-none tracking-tight text-[#E5252A]">Luxx</span>
            <div className="pointer-events-none absolute -top-4 right-0 translate-x-1.5">
              <svg className="h-8 w-8 text-[#111111]" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M5 16C5 10 8.5 6 14 6C19.5 6 23 10 23 16C23 21 19 25 14 25C9 25 5 21 5 16Z" fill="#111111" />
                <polygon points="5,8 10,13 4,14" fill="#E5252A" />
                <polygon points="23,8 18,13 24,14" fill="#E5252A" />
                <circle cx="11" cy="15" r="1.6" fill="#FFFFFF" />
                <circle cx="17" cy="15" r="1.6" fill="#FFFFFF" />
                <polygon points="14,17 12.8,18.8 15.2,18.8" fill="#E5252A" />
                <path d="M12 9.5L13 11.5L14 10.5L15 11.5L16 9.5" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" />
              </svg>
            </div>
          </Link>
        </header>

        <div className="flex w-full flex-col items-start gap-8 lg:flex-row lg:gap-12">
          <AppSidebar active={active} />

          <main className="w-full min-w-0 flex-1 lg:pr-4">
            <Link
              href={backHref}
              className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-bold text-[#111111] no-underline hover:text-[#E5252A]"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {backLabel}
            </Link>

            {eyebrow && (
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#E5252A]">{eyebrow}</p>
            )}
            <h1 className="mt-1 text-[34px] font-black leading-tight tracking-tight text-[#111111]">{title}</h1>
            {subtitle && <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#7A7F87]">{subtitle}</p>}

            <div className="mt-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
