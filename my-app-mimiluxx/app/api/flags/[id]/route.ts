import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { action } = await request.json();

  if (!["acknowledge", "resolve"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const now = new Date().toISOString();

  const updates =
    action === "acknowledge"
      ? {
          status: "acknowledged",
          acknowledged_by: user.id,
          acknowledged_at: now,
        }
      : {
          status: "resolved",
          resolved_by: user.id,
          resolved_at: now,
        };

  const base = supabase.from("flags").update(updates).eq("id", id);

  const { data, error } =
    action === "acknowledge"
      ? await base.eq("status", "open").select().maybeSingle()
      : await base.neq("status", "resolved").select().maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Flag not found, not allowed, or already in that state" },
      { status: 409 }
    );
  }

  return NextResponse.json({ flag: data });
}