import { redirect } from "next/navigation";

// Role management now lives in the Users & Roles tab of the admin panel.
export default function AdminUsersRedirect() {
  redirect("/admin");
}
