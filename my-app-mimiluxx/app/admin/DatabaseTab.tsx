import type { DatabaseHealth } from "@/lib/types/admin";
import { card, emptyText, errorText, heading, hint, label, SETUP_HINT, th, tableWrap, tr } from "../ui";

export default function DatabaseTab({
  health,
  error,
}: {
  health: DatabaseHealth | null;
  error: string | null;
}) {
  if (!health) {
    return (
      <p role="alert" className={errorText}>
        Could not load database health{error ? `: ${error}` : ""}. {SETUP_HINT}
      </p>
    );
  }

  const usedPct = Math.round((health.active_connections / Math.max(1, health.max_connections)) * 100);
  const high = usedPct >= 80;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-sm font-medium text-neutral-600">Database size</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-neutral-900">{health.db_size}</p>
        </div>
        <div className={card}>
          <p className="text-sm font-medium text-neutral-600">Open connections</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-neutral-900">
            {health.active_connections}
            <span className="text-base font-semibold text-neutral-500"> of {health.max_connections}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-neutral-100" aria-hidden="true">
            <div
              className={`h-2 rounded-full ${high ? "bg-[#EA2323]" : "bg-[#1f1f1f]"}`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
          </div>
          <p className={`mt-2 text-xs font-medium ${high ? "text-red-700" : "text-neutral-500"}`}>
            {usedPct}% of the limit
          </p>
        </div>
        <div className={card}>
          <p className="text-sm font-medium text-neutral-600">Tables tracked</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight text-neutral-900">{health.tables.length}</p>
        </div>
      </div>

      <section className={card} aria-labelledby="tables-heading">
        <h2 id="tables-heading" className={heading}>
          Tables
        </h2>
        <p className={hint}>Numbers are read when you open or refresh the page.</p>
        <div className={tableWrap}>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th scope="col" className={th}>Table</th>
                <th scope="col" className={th}>Rows</th>
                <th scope="col" className={th}>Size on disk</th>
              </tr>
            </thead>
            <tbody>
              {health.tables.map((t) => (
                <tr key={t.name} className={tr}>
                  <td className="px-4 py-3 font-semibold text-neutral-900">{t.name}</td>
                  <td className="px-4 py-3 text-neutral-700">{t.rows}</td>
                  <td className="px-4 py-3 text-neutral-700">{t.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {health.tables.length === 0 && <p className={emptyText}>No tables to show.</p>}
        </div>
      </section>
    </div>
  );
}
