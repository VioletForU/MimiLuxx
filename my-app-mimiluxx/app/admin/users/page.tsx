import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/requireRole";
import { ROLES, type UserRole } from "@/lib/types/roles";
import { revalidatePath } from "next/cache";

async function updateUserRole(formData: FormData) {
  "use server";

  const userId = formData.get("userId") as string;
  const newRole = formData.get("role") as UserRole;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role: newRole }).eq("id", userId);

  revalidatePath("/admin/users");
}

export default async function AdminUsersPage() {
  await requireRole(["Exec Approver"]);

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, role")
    .order("email");

  return (
    <div>
      <h1>Manage User Roles</h1>
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {profiles?.map((profile) => (
            <tr key={profile.id}>
              <td>{profile.email}</td>
              <td>{profile.role}</td>
              <td>
                <form action={updateUserRole}>
                  <input type="hidden" name="userId" value={profile.id} />
                  <select name="role" defaultValue={profile.role}>
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <button type="submit">Update</button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
