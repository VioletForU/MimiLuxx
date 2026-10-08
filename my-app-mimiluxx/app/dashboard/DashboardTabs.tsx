import Link from "next/link";

const TABS = [
  { key: "tasks", label: "Tasks", href: "/dashboard" },
  { key: "proposals", label: "Proposals", href: "/dashboard?tab=proposals" },
] as const;

export default function DashboardTabs({
  active,
}: {
  active: "tasks" | "proposals";
}) {
  return (
    <div className="mb-6 flex gap-1 border-b">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            active === tab.key
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
