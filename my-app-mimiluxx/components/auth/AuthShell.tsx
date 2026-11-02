import type { ReactNode } from "react";
import BrandLogo from "@/components/BrandLogo";

const HIGHLIGHTS = [
  {
    title: "Know what's next",
    body: "Tasks ranked by urgency, so the right work is always on top.",
  },
  {
    title: "Sign-offs that keep moving",
    body: "Proposals pass through every approval stage with a clear owner.",
  },
  {
    title: "Clear accountability",
    body: "See who is responsible for what, at a glance.",
  },
];

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#d4d4d4] p-4 text-neutral-900 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-xl lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[1fr_1.1fr]">
        {/* Brand panel (desktop only) */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#1f1f1f] p-10 text-white lg:flex">
          <div
            aria-hidden="true"
            className="absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-[#EA2323]/25 blur-3xl"
          />
          <div className="relative">
            <BrandLogo tone="light" />
          </div>

          <div className="relative">
            <p className="text-4xl font-extrabold leading-tight tracking-tight">
              sync your people,
              <br />
              drive your mission.
            </p>
            <ul className="mt-10 space-y-6">
              {HIGHLIGHTS.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#EA2323]"
                  />
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-0.5 text-sm text-neutral-400">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-neutral-500">© MimiLuxx</p>
        </aside>

        {/* Form panel */}
        <main className="flex flex-col justify-center px-6 py-10 sm:px-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <BrandLogo />
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="mt-2 text-sm text-neutral-600">{subtitle}</p>
            )}

            <div className="mt-8">{children}</div>

            {footer && (
              <div className="mt-8 border-t border-neutral-200 pt-6 text-center text-sm text-neutral-600">
                {footer}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
