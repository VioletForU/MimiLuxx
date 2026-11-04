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

  // RBAC guard: only the user whose role matches this stage's assigned
  // signatory role can act on it — a Committee Head can't approve a
  // stage that belongs to the President, and vice versa.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== targetStage.approver_role) {
    return NextResponse.json(
      {
        error: `Only a ${targetStage.approver_role} can act on this stage. You are a ${profile?.role ?? "Member"}.`,
      },
      { status: 403 }
    );
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  const reason =
    action === "reject" && typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";
  if (action === "reject" && reason.length < 10) {
    return NextResponse.json(
      { error: "Please give a reason of at least 10 characters." },
      { status: 400 }
    );
  }

  const stageUpdate = {
    status: newStatus,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  };

  // rejection_reason comes from supabase/migrations/003_integration_tables.sql.
  // If that column has not been added yet, fall back to saving without it.
  let { error: updateStageError } = await supabase
    .from("approval_stages")
    .update(action === "reject" ? { ...stageUpdate, rejection_reason: reason } : stageUpdate)
    .eq("id", stageId);

  if (updateStageError && action === "reject" && /rejection_reason/.test(updateStageError.message)) {
    ({ error: updateStageError } = await supabase
      .from("approval_stages")
      .update(stageUpdate)
      .eq("id", stageId));
  }

  if (updateStageError) {
    return NextResponse.json({ error: updateStageError.message }, { status: 500 });
  }

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
