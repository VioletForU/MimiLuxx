import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { routeStages } from "@/lib/stageRouting";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { data: proposal, error: proposalError } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const { data: stages, error: stagesError } = await supabase
    .from("approval_stages")
    .select("*")
    .eq("proposal_id", id)
    .order("stage_order", { ascending: true });

  if (stagesError) {
    return NextResponse.json({ error: stagesError.message }, { status: 500 });
  }

  const routedStages = routeStages(proposal, stages ?? []);

  return NextResponse.json({ proposal, stages: routedStages });
}
