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

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const { stageId, action } = body;

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'approve' or 'reject'" },
      { status: 400 }
    );
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

  if (stagesError || !stages) {
    return NextResponse.json({ error: "Could not load stages" }, { status: 500 });
  }

  const routedStages = routeStages(proposal, stages);
  const targetStage = routedStages.find((s) => s.id === stageId);

  if (!targetStage) {
    return NextResponse.json({ error: "Stage not found" }, { status: 404 });
  }

  if (!targetStage.isActive) {
    return NextResponse.json(
      { error: "This stage is not currently active — earlier stages must be resolved first" },
      { status: 400 }
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const { error: updateStageError } = await supabase
    .from("approval_stages")
    .update({
      status: newStatus,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
    })
    .eq("id", stageId);

  if (updateStageError) {
    return NextResponse.json({ error: updateStageError.message }, { status: 500 });
  }

  // Rejecting any stage immediately rejects the whole proposal.
  // Approving advances to the next stage, or marks the proposal fully
  // approved if this was the last one.
  if (action === "reject") {
    await supabase.from("proposals").update({ status: "rejected" }).eq("id", id);
  } else {
    const isLastStage = targetStage.stage_order === stages.length;
    await supabase
      .from("proposals")
      .update({
        status: isLastStage ? "approved" : "pending",
        current_stage: isLastStage ? targetStage.stage_order : targetStage.stage_order + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return NextResponse.json({ success: true });
}
