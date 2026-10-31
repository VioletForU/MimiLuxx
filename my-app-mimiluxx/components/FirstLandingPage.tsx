import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import BrandLogo from "@/components/BrandLogo";

const buttonBase =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 focus-visible:ring-offset-2";
const primaryButton = `${buttonBase} bg-[#1f1f1f] text-white hover:bg-black`;
const secondaryButton = `${buttonBase} border border-neutral-900/25 bg-white/50 text-neutral-900 hover:bg-white`;

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const FEATURES = [
  {
    title: "A dashboard that ranks what is next",
    body: "Tasks are scored by how close the deadline is, so overdue and urgent work always sits at the top. Change a status and the list re-sorts instantly.",
    icon: <path d="M4 6h16M4 12h16M4 18h10" />,
  },
  {
    title: "Sign-offs you can actually follow",
    body: "Submit a proposal and watch it move through each approval stage, with who it is waiting on and how long it has been there.",
    icon: (
      <>
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
        <path d="M7 12h3M14 12h3" />
      </>
    ),
  },
  {
    title: "Approvals by the right people",
    body: "Each stage belongs to a specific role. Only that role can approve or reject, and later stages stay locked until earlier ones are done.",
    icon: (
      <>
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
        <path d="M9 12l2 2 4-4" />
      </>
    ),
  },
  {
    title: "Roles that match your organization",
    body: "Members, Committee Leads and Exec Approvers each get what they need. Exec Approvers assign roles from a simple admin page.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 14.2c2.9.3 5 2.6 5 5.8" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Create your account",
    body: "Sign up with your institutional email and confirm it. An Exec Approver can set your role.",
  },
  {
    title: "Add your work",
    body: "Log tasks with deadlines, and submit proposals that need sign-off.",
  },
  {
    title: "Stay on track",
    body: "Your dashboard ranks what is urgent, and every proposal shows its current stage and who is holding it.",
  },
];

const ROLES = [
  {
    name: "Member",
    tag: "Submits",
    body: "Manage your own tasks and submit proposals for approval.",
  },
  {
    name: "Committee Lead",
    tag: "Stage 1 sign-off",
    body: "Reviews proposals first and decides whether they move forward.",
  },
  {
    name: "Exec Approver",
    tag: "Stage 2 sign-off",
    body: "Gives the final sign-off and assigns roles to members.",
  },
];

const PREVIEW_TASKS = [
  { title: "Book the venue", badge: "Overdue", style: "bg-red-100 text-red-700" },
  { title: "Send sponsor emails", badge: "Due Soon", style: "bg-yellow-100 text-yellow-700" },
  { title: "Update member roster", badge: "Upcoming", style: "bg-blue-100 text-blue-700" },
];

/** A static picture of the product, built from the same badge styles the real dashboard uses. */
function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the MimiLuxx dashboard: tasks ranked by urgency, and a proposal waiting on its second approval stage"
      className="relative mx-auto w-full max-w-md"
    >
      <div
        aria-hidden="true"
        className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-[#EA2323]/15 blur-2xl"
      />
      <div className="rounded-3xl bg-white p-5 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Next actions
        </p>
        <ul className="mt-3 space-y-2.5">
          {PREVIEW_TASKS.map((task) => (
            <li
              key={task.title}
              className="flex items-center justify-between rounded-xl border border-neutral-200 px-3 py-2.5"
            >
              <span className="text-sm font-medium text-neutral-900">{task.title}</span>
              <span className={`rounded-full px-2 py-1 text-xs font-medium ${task.style}`}>
                {task.badge}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl bg-neutral-100 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Proposal
          </p>
          <p className="mt-1 text-sm font-semibold text-neutral-900">Event budget request</p>
          <ol className="mt-3 space-y-2">
            <li className="flex items-center justify-between rounded-xl border border-green-300 bg-green-100 px-3 py-2 text-xs text-green-700">
              <span className="font-semibold">Stage 1: Committee Lead</span>
              <span className="font-medium uppercase">Approved</span>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-neutral-300 bg-white px-3 py-2 text-xs text-neutral-600 ring-2 ring-neutral-900">
              <span className="font-semibold">Stage 2: Exec Approver</span>
              <span>Pending for 2d 4h</span>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const loggedIn = !!user;

  const cta = loggedIn ? (
    <Link href="/dashboard" className={primaryButton}>
      Go to your dashboard
    </Link>
  ) : (
    <>
      <Link href="/login" className={primaryButton}>
        Hop in!
      </Link>
      <Link href="/signup" className={secondaryButton}>
        Create an account
      </Link>
    </>
  );

  return (
    <div className="bg-[#d4d4d4] text-neutral-900">
      {/* Logged-in visitors already get the app navigation bar from the layout. */}
      {!loggedIn && (
        <header className="sticky top-0 z-30 border-b border-neutral-400/30 bg-[#d4d4d4]/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <BrandLogo />
            <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                How it works
              </a>
              <a href="#roles" className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
                Roles
              </a>
            </nav>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#1f1f1f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 focus-visible:ring-offset-2"
              >
                Sign up
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-neutral-700">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EA2323]" />
            Tasks and approvals, in one place
          </p>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            sync your people, drive your <span className="text-[#EA2323]">mission.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-neutral-700">
            MimiLuxx keeps tasks and sign-offs for your whole organization in one place, so
            everyone knows what to do next and who a proposal is waiting on.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            {cta}
            {!loggedIn && (
              <a
                href="#how-it-works"
                className="px-3 py-3 text-sm font-semibold text-neutral-800 underline-offset-4 hover:underline"
              >
                See how it works
              </a>
            )}
          </div>
        </div>

        <ProductPreview />
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Everything your team needs to keep work moving
        </h2>
        <p className="mt-3 max-w-2xl text-neutral-700">
          Less chasing, fewer lost approvals, and a clear answer to what should happen next.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-3xl bg-white p-7 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1f1f] text-white">
                <FeatureIcon>{feature.icon}</FeatureIcon>
              </div>
              <h3 className="mt-5 text-lg font-bold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
          Up and running in three steps
        </h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="text-4xl font-extrabold text-[#EA2323]">{index + 1}</span>
              <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Roles */}
      <section id="roles" className="scroll-mt-24 bg-[#1f1f1f] text-white">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            One clear approval chain
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-300">
            Every proposal passes through the same stages, in order, and each stage belongs to
            one role.
          </p>

          <ul className="mt-12 grid gap-5 md:grid-cols-3">
            {ROLES.map((role) => (
              <li key={role.name} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="inline-block rounded-full bg-[#EA2323] px-3 py-1 text-xs font-semibold text-white">
                  {role.tag}
                </span>
                <h3 className="mt-4 text-lg font-bold">{role.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-300">{role.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final call to action */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="rounded-[2rem] bg-white px-6 py-14 text-center shadow-xl">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {loggedIn ? "Pick up where you left off" : "Ready to hop in?"}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-neutral-600">
            {loggedIn
              ? "Your tasks and proposals are waiting on your dashboard."
              : "Create your account in a minute and see what is next."}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">{cta}</div>
        </div>
      </section>

      <footer className="border-t border-neutral-400/40">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <BrandLogo />
            <p className="text-xs text-neutral-600">sync your people, drive your mission.</p>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-neutral-700">
            {loggedIn ? (
              <Link href="/dashboard" className="hover:text-neutral-900">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hover:text-neutral-900">
                  Log in
                </Link>
                <Link href="/signup" className="hover:text-neutral-900">
                  Sign up
                </Link>
              </>
            )}
          </div>
          <p className="text-xs text-neutral-600">© MimiLuxx</p>
        </div>
      </footer>
    </div>
  );
}
