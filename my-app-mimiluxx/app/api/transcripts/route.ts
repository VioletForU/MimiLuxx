import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectIdeas } from "@/lib/ideaDetection";
import {
  canSubmitTranscript,
  hasAllowedExtension,
  MAX_TRANSCRIPT_BYTES,
  MIN_TRANSCRIPT_CHARS,
} from "@/lib/transcriptAccess";

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const slug = form.get("slug");
  if (typeof slug !== "string" || !slug) {
    return NextResponse.json({ error: "Organization is required" }, { status: 400 });
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  // The role is read from the database, never trusted from the browser.
  const [{ data: membership }, { data: profile }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", org.id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  const allowed = canSubmitTranscript({
    isAdmin: profile?.role === "Admin",
    role: (membership?.role as string | undefined) ?? null,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Only committee heads and the president can submit transcripts" },
      { status: 403 }
    );
  }

  let text = "";
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use a .txt or .md file." },
        { status: 400 }
      );
    }
    if (file.size > MAX_TRANSCRIPT_BYTES) {
      return NextResponse.json(
        { error: "File is too large. The limit is 200 KB." },
        { status: 413 }
      );
    }
    text = await file.text();
  } else {
    const pasted = form.get("text");
    text = typeof pasted === "string" ? pasted : "";
  }

  text = text.trim();
  if (text.length < MIN_TRANSCRIPT_CHARS) {
    return NextResponse.json(
      { error: "The transcript is too short or empty." },
      { status: 400 }
    );
  }
  if (text.length > MAX_TRANSCRIPT_BYTES) {
    return NextResponse.json(
      { error: "The transcript is too long. The limit is about 200,000 characters." },
      { status: 413 }
    );
  }

  const [{ data: committees }, { data: roster }] = await Promise.all([
    supabase.from("committees").select("name").eq("organization_id", org.id),
    supabase.rpc("get_org_members", { p_org: org.id }),
  ]);

  const committeeNames = (committees ?? []).map((c) => c.name as string);
  // Names only. Never send emails or IDs to the AI.
  const memberNames = ((roster ?? []) as { full_name: string | null; username: string | null }[])
    .map((m) => m.full_name || m.username)
    .filter((n): n is string => !!n && !n.includes("@"));

  const { items, error } = await detectIdeas({ text, committeeNames, memberNames });
  if (error) {
    return NextResponse.json({ error }, { status: 502 });
  }

  return NextResponse.json({ items });
}