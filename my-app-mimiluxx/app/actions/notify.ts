"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/siteUrl";
import { folderFilesEmail, isEmailConfigured, sendEmail } from "@/lib/email";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 20;
const RECENT_MS = 15 * 60 * 1000;

export type EmailResult = { sent: boolean; reason?: string };

/**
 * Emails a member that someone else just added files to their folder.
 * Called by the browser right after an upload, but it trusts nothing the browser says:
 * it re-reads the files as the signed-in person (so the database's access rules apply),
 * only counts files they themselves uploaded into someone else's folder in the last
 * 15 minutes, and marks each file so it can only ever be announced once.
 * Failures never affect the upload itself.
 */
export async function emailFolderUpload(fileIds: string[]): Promise<EmailResult> {
  try {
    if (!isEmailConfigured()) return { sent: false, reason: "not-configured" };
    if (!Array.isArray(fileIds) || fileIds.length === 0 || fileIds.length > MAX_IDS || !fileIds.every((id) => UUID_RE.test(id))) {
      return { sent: false, reason: "bad-request" };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { sent: false, reason: "unauthorized" };

    const { data: rows } = await supabase
      .from("member_files")
      .select("id, organization_id, owner_id, uploaded_by, file_name, folder_id, created_at, email_notified_at")
      .in("id", fileIds);

    const mine = (rows ?? []).filter(
      (r) =>
        r.uploaded_by === user.id &&
        r.owner_id !== user.id &&
        !r.email_notified_at &&
        Date.now() - new Date(r.created_at as string).getTime() < RECENT_MS
    );
    if (mine.length === 0) return { sent: false, reason: "nothing-to-send" };

    // One email is about one folder.
    const { owner_id: ownerId, organization_id: orgId, folder_id: folderId } = mine[0];
    const batch = mine.filter((r) => r.owner_id === ownerId && r.organization_id === orgId && r.folder_id === folderId);

    const admin = createAdminClient();

    // Claim the files first, so two simultaneous requests cannot both send.
    const { data: claimed } = await admin
      .from("member_files")
      .update({ email_notified_at: new Date().toISOString() })
      .in("id", batch.map((r) => r.id as string))
      .is("email_notified_at", null)
      .select("id, file_name");
    if (!claimed || claimed.length === 0) return { sent: false, reason: "already-sent" };
    const unclaim = () =>
      admin.from("member_files").update({ email_notified_at: null }).in("id", claimed.map((c) => c.id as string));

    const [{ data: ownerProfile }, { data: leadProfile }, { data: org }, { data: membership }, authUser] = await Promise.all([
      admin.from("profiles").select("notif_prefs").eq("id", ownerId).maybeSingle(),
      admin.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle(),
      admin.from("organizations").select("name, slug").eq("id", orgId).maybeSingle(),
      admin.from("organization_members").select("committee_id").eq("organization_id", orgId).eq("user_id", ownerId).maybeSingle(),
      admin.auth.admin.getUserById(ownerId as string),
    ]);

    // Respect the Email switch under Settings > Notifications > Folder activity (on by default).
    const prefs = (ownerProfile?.notif_prefs ?? {}) as Record<string, boolean>;
    const to = authUser.data.user?.email;
    if (prefs.folder_files_email === false || !to || !org) {
      if (!to || !org) await unclaim();
      return { sent: false, reason: prefs.folder_files_email === false ? "opted-out" : "no-recipient" };
    }

    let committeeName: string | null = null;
    if (membership?.committee_id) {
      const { data: c } = await admin.from("committees").select("name").eq("id", membership.committee_id).maybeSingle();
      committeeName = (c?.name as string | undefined) ?? null;
    }

    const link =
      membership?.committee_id
        ? `${await siteUrl()}/orgs/${org.slug}/folders/${membership.committee_id}/${ownerId}${folderId ? `?folder=${folderId}` : ""}`
        : null;

    const mail = folderFilesEmail({
      leadName: leadProfile?.full_name?.trim() || leadProfile?.username || "A committee lead",
      orgName: org.name as string,
      committeeName,
      fileNames: claimed.map((c) => c.file_name as string),
      url: link,
    });

    try {
      await sendEmail({ to, ...mail });
    } catch (e) {
      // Visible in Vercel > Logs. Typical cause: wrong SMTP login or app password.
      console.error("[email] could not send folder notification:", e instanceof Error ? e.message : e);
      await unclaim(); // not sent, so allow a later retry
      return { sent: false, reason: "send-failed" };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] folder notification failed:", e instanceof Error ? e.message : e);
    return { sent: false, reason: "error" };
  }
}
