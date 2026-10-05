import Link from "next/link";
import LogoutButton from "./LogoutButton";
import type { UserRole } from "@/lib/types/roles";

export default function AppNav({ role }: { role: UserRole }) {
  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      borderBottom: "1px solid #e5e5e5",
    }}>
      <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        <Link href="/dashboard" style={{ fontWeight: 700 }}>MimiLuxx</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/tasks">All Tasks</Link>
        {role === "Exec Approver" && <Link href="/admin/users">Admin</Link>}
      </div>
      <LogoutButton />
    </nav>
  );
}
