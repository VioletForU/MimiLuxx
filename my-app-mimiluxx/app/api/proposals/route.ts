import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APPROVAL_CHAIN } from "@/lib/types/roles";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const title = String(body.title ?? "").trim();

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .insert({
      title,
      description: body.description || null,
      submitted_by: user.id,
    })
    .select()
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json(
      { error: proposalError?.message || "Could not create proposal" },
      { status: 500 }
    );
  }

  // Auto-generate the approval chain (see APPROVAL_CHAIN in lib/types/roles.ts).
  const { error: stagesError } = await supabase.from("approval_stages").insert(
    APPROVAL_CHAIN.map((stage) => ({ proposal_id: proposal.id, ...stage }))
  );

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 });
  }

  return NextResponse.json({ proposal });
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ proposals: data });
}
