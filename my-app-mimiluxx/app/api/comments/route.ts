import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetType = searchParams.get("target_type");
  const targetId = searchParams.get("target_id");

  if (!targetType || !targetId) {
    return NextResponse.json(
      { error: "target_type and target_id are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comments: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  const body = await request.json();
  const text = String(body.body ?? "").trim();

  if (!["task", "flag"].includes(body.target_type) || !body.target_id) {
    return NextResponse.json({ error: "Invalid target" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      target_type: body.target_type,
      target_id: body.target_id,
      parent_id: body.parent_id || null,
      author_id: user.id,
      body: text,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ comment: data }, { status: 201 });
}