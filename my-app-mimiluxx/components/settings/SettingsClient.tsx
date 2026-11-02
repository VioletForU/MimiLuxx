"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Factor, UserIdentity } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import type { UserRole } from "@/lib/types/roles";

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export type SettingsProfile = {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  contactEmail: string;
  memberId: string;
  bio: string;
  avatarUrl: string;
  language: string;
  timeZone: string;
  defaultView: "dashboard" | "tasks";
  notifPrefs: Record<string, boolean>;
};

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "preferences", label: "Preferences" },
  { id: "connections", label: "Connections" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const NOTIF_ROWS = [
  { key: "task_updates", label: "Task updates", hint: "Assigned, due soon, approved or returned" },
  { key: "org_announcements", label: "Organization announcements", hint: "News from your organizations" },
] as const;
const NOTIF_CHANNELS = [
  { key: "email", label: "Email" },
  { key: "workspace", label: "In-app" },
  { key: "push", label: "Push" },
] as const;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fil", label: "Filipino" },
  { code: "ceb", label: "Cebuano" },
];

/* ------------------------------------------------------------------ */
/* Shared class names (same look as the HTML demo)                    */
/* ------------------------------------------------------------------ */

const card =
  "rounded-2xl border border-ink/15 bg-white p-5 shadow-[0_2px_0_rgba(6,8,10,0.06)] sm:p-7";
const input =
  "h-11 w-full rounded-lg border border-ink/25 bg-white px-3 text-sm outline-none transition focus:border-ink focus:ring-4 focus:ring-brand/20 aria-[invalid=true]:border-brand disabled:bg-ink/5 disabled:text-ink/60";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink/70";
const btnPrimary =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-[13px] font-bold text-white transition duration-200 hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink";
const btnGhost =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-ink/25 bg-white px-5 text-[13px] font-bold text-ink transition duration-200 hover:border-ink hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink";
const switchCls =
  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-ink/25 transition-colors after:absolute after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition-transform aria-checked:bg-brand aria-checked:after:translate-x-5 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-ink";

/* ------------------------------------------------------------------ */
/* Small pieces                                                       */
/* ------------------------------------------------------------------ */

function Switch({
  checked,
  onChange,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={name}
      onClick={() => onChange(!checked)}
      className={switchCls}
    />
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={card}>
      <h2 className="text-lg font-extrabold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-ink/60">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Initials({ name, email }: { name: string; email: string }) {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const text =
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : source.slice(0, 2);
  return <>{text.toUpperCase()}</>;
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */

export default function SettingsClient({ profile }: { profile: SettingsProfile }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  /* ---- tabs (read from the URL hash after load, so server HTML matches) ---- */
  const [tab, setTab] = useState<TabId>("profile");
  useEffect(() => {
    const fromHash = window.location.hash.replace("#", "") as TabId;
    if (TABS.some((t) => t.id === fromHash)) setTab(fromHash);
  }, []);
  function pickTab(id: TabId) {
    setTab(id);
    window.history.replaceState(null, "", `#${id}`);
  }

  /* ---- toast ---- */
  const [toast, setToast] = useState<{ msg: string; bad: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const say = useCallback((msg: string, bad = false) => {
    setToast({ msg, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  /* ================= PROFILE ================= */
  const [fullName, setFullName] = useState(profile.fullName);
  const [contactEmail, setContactEmail] = useState(profile.contactEmail);
  const [memberId, setMemberId] = useState(profile.memberId);
  const [bio, setBio] = useState(profile.bio);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [busy, setBusy] = useState<string | null>(null);
  const [nameError, setNameError] = useState("");
  const [contactError, setContactError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const nameBad = fullName.trim().length < 2;
    const mailBad = contactEmail.trim() !== "" && !/^\S+@\S+\.\S+$/.test(contactEmail.trim());
    setNameError(nameBad ? "Please enter your full name." : "");
    setContactError(mailBad ? "That email doesn't look right." : "");
    if (nameBad || mailBad) return;

    setBusy("profile");
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        contact_email: contactEmail.trim() || null,
        member_id: memberId.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile.id);
    setBusy(null);
    if (error) return say("Couldn't save your profile. Please try again.", true);
    say("Profile saved.");
    router.refresh();
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
      return say("Please choose a PNG, JPG or WEBP picture.", true);
    if (file.size > 2 * 1024 * 1024) return say("That picture is over 2 MB.", true);

    setBusy("avatar");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${profile.id}/avatar-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(null);
      return say("Upload failed. Has the Supabase setup (SQL file) been run?", true);
    }
    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", profile.id);
    setBusy(null);
    if (error) return say("Picture uploaded but couldn't be saved to your profile.", true);
    setAvatarUrl(url);
    say("Profile picture updated.");
    router.refresh();
  }

  async function removeAvatar() {
    setBusy("avatar");
    const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", profile.id);
    setBusy(null);
    if (error) return say("Couldn't remove the picture.", true);
    setAvatarUrl("");
    say("Profile picture removed.");
    router.refresh();
  }

  /* ================= SECURITY ================= */
  // Sign-in email
  const [newEmail, setNewEmail] = useState("");
  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(newEmail.trim())) return say("Enter a valid email address.", true);
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setBusy(null);
    if (error) return say(friendlyAuthError(error.message), true);
    setNewEmail("");
    say("Check your inbox. Click the link we sent to confirm the new email.");
  }

  // Password
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwError, setPwError] = useState("");
  const pwScore = useMemo(() => {
    let s = 0;
    if (newPw.length >= 8) s++;
    if (/[A-Z]/.test(newPw) && /[a-z]/.test(newPw)) s++;
    if (/\d/.test(newPw)) s++;
    if (/[^A-Za-z0-9]/.test(newPw) || newPw.length >= 14) s++;
    return s;
  }, [newPw]);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    if (!curPw) return setPwError("Enter your current password.");
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters.");
    if (newPw !== newPw2) return setPwError("The two new passwords don't match.");
    setBusy("password");
    // Re-check the current password first, so a borrowed laptop can't change it.
    const check = await supabase.auth.signInWithPassword({ email: profile.email, password: curPw });
    if (check.error) {
      setBusy(null);
      return setPwError("Your current password is not correct.");
    }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setBusy(null);
    if (error) return setPwError(friendlyAuthError(error.message));
    setCurPw(""); setNewPw(""); setNewPw2("");
    say("Password updated.");
  }

  // Two-factor (authenticator app)
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const loadFactors = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []); // only verified factors are listed here
  }, [supabase]);
  useEffect(() => { void loadFactors(); }, [loadFactors]);

  async function startEnroll() {
    setBusy("mfa");
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(null);
    if (error || !data) return say("Couldn't start 2FA. Is MFA enabled in Supabase (Auth settings)?", true);
    setEnroll({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  }
  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    if (!/^\d{6}$/.test(code)) return say("Type the 6-digit code from your app.", true);
    setBusy("mfa");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enroll.id, code });
    setBusy(null);
    if (error) return say("That code didn't work. Try the newest one.", true);
    setEnroll(null);
    await loadFactors();
    say("Two-factor authentication is on.");
  }
  async function cancelEnroll() {
    if (enroll) await supabase.auth.mfa.unenroll({ factorId: enroll.id });
    setEnroll(null);
  }
  async function turnOffMfa(id: string) {
    if (!window.confirm("Turn off two-factor authentication?")) return;
    setBusy("mfa");
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(null);
    if (error) return say("Couldn't turn off 2FA. You may need to sign in again first.", true);
    await loadFactors();
    say("Two-factor authentication is off.");
  }

  // Sessions (only this device can be described; others can be signed out)
  const [device, setDevice] = useState("This device");
  useEffect(() => {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome"
      : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
    const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android"
      : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
    setDevice(`${browser}${os ? " on " + os : ""}`);
  }, []);
  async function signOutOthers() {
    setBusy("sessions");
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(null);
    if (error) return say("Couldn't sign out other devices.", true);
    say("Signed out of all other devices.");
  }

  /* ================= NOTIFICATIONS ================= */
  const [prefs, setPrefs] = useState<Record<string, boolean>>(profile.notifPrefs);
  const prefKey = (row: string, ch: string) => `${row}_${ch}`;
  // Default: everything on except push
  const isOn = (row: string, ch: string) => prefs[prefKey(row, ch)] ?? ch !== "push";
  async function saveNotifs() {
    const full: Record<string, boolean> = {};
    for (const r of NOTIF_ROWS) for (const c of NOTIF_CHANNELS) full[prefKey(r.key, c.key)] = isOn(r.key, c.key);
    setBusy("notifs");
    const { error } = await supabase.from("profiles").update({ notif_prefs: full }).eq("id", profile.id);
    setBusy(null);
    if (error) return say("Couldn't save notification settings.", true);
    say("Notification settings saved.");
  }

  /* ================= PREFERENCES ================= */
  const [language, setLanguage] = useState(profile.language);
  const [timeZone, setTimeZone] = useState(profile.timeZone);
  const [defaultView, setDefaultView] = useState(profile.defaultView);
  const [zones, setZones] = useState<string[]>([]);
  useEffect(() => {
    // Computed after load: the list depends on the browser, so it can't be in server HTML.
    let list: string[] = [];
    try { list = Intl.supportedValuesOf("timeZone"); } catch { list = ["Asia/Manila", "UTC"]; }
    setZones(list);
    if (!profile.timeZone) setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [profile.timeZone]);

  async function savePrefs(e: React.FormEvent) {
    e.preventDefault();
    setBusy("prefs");
    const { error } = await supabase
      .from("profiles")
      .update({ language, time_zone: timeZone || null, default_view: defaultView })
      .eq("id", profile.id);
    setBusy(null);
    if (error) return say("Couldn't save preferences.", true);
    say("Preferences saved.");
  }

  /* ================= CONNECTIONS ================= */
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const loadIdentities = useCallback(async () => {
    const { data } = await supabase.auth.getUserIdentities();
    setIdentities(data?.identities ?? []);
  }, [supabase]);
  useEffect(() => { void loadIdentities(); }, [loadIdentities]);
  const google = identities.find((i) => i.provider === "google");

  async function linkGoogle() {
    const { error } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/settings#connections` },
    });
    if (error) say("Couldn't link Google. Manual linking must be enabled in Supabase.", true);
  }
  async function unlinkGoogle() {
    if (!google) return;
    if (identities.length < 2) return say("You need another way to sign in before unlinking Google.", true);
    setBusy("google");
    const { error } = await supabase.auth.unlinkIdentity(google);
    setBusy(null);
    if (error) return say("Couldn't unlink Google.", true);
    await loadIdentities();
    say("Google account unlinked.");
  }

  /* ================= RENDER ================= */
  const mfaOn = factors.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold sm:text-3xl">Settings &amp; Account</h1>
        <p className="mt-1 text-sm text-ink/60">Manage your profile, security and preferences.</p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* ---- tab list: sidebar on desktop, scroll strip on phones ---- */}
        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div
            role="tablist"
            aria-label="Settings sections"
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => pickTab(t.id)}
                className="group shrink-0 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-left text-sm font-bold transition hover:border-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-white lg:rounded-xl"
              >
                {t.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          {/* ================= PROFILE ================= */}
          {tab === "profile" && (
            <div role="tabpanel" id="panel-profile" aria-labelledby="tab-profile" className="grid animate-fade-in gap-6">
              <section className={card}>
                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-ink text-3xl font-extrabold text-white">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt="Your profile picture" className="size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center">
                        <Initials name={fullName} email={profile.email} />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xl font-extrabold">{fullName || "Your name"}</p>
                    <p className="truncate text-sm text-ink/60">{profile.email}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">{profile.role}</span>
                      <span className="rounded-full border border-ink/20 px-3 py-1 text-xs font-bold text-ink/70">
                        No organization yet
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={uploadAvatar} />
                      <button type="button" className={btnGhost} disabled={busy === "avatar"} onClick={() => fileRef.current?.click()}>
                        {busy === "avatar" ? "Working…" : "Upload picture"}
                      </button>
                      {avatarUrl && (
                        <button type="button" className={btnGhost} disabled={busy === "avatar"} onClick={removeAvatar}>
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-ink/50">PNG, JPG or WEBP · up to 2 MB</p>
                  </div>
                </div>
              </section>

              <Section title="Personal information" desc="This is how you appear to other members.">
                <form onSubmit={saveProfile} noValidate className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="fullName">Full name</label>
                    <input id="fullName" className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={!!nameError} autoComplete="name" />
                    {nameError && <p className="mt-1 text-xs font-semibold text-brand">{nameError}</p>}
                  </div>
                  <div>
                    <label className={label} htmlFor="contactEmail">Contact email</label>
                    <input id="contactEmail" type="email" className={input} value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} aria-invalid={!!contactError} placeholder={profile.email} autoComplete="email" />
                    {contactError && <p className="mt-1 text-xs font-semibold text-brand">{contactError}</p>}
                  </div>
                  <div>
                    <label className={label} htmlFor="memberId">Student / Member ID</label>
                    <input id="memberId" className={input} value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="e.g. 2024-01234" />
                  </div>
                  <div>
                    <label className={label} htmlFor="roleField">Role</label>
                    <input id="roleField" className={input} value={profile.role} disabled />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={label} htmlFor="bio">Bio</label>
                    <textarea id="bio" rows={4} maxLength={280} className={`${input} h-auto py-2.5`} value={bio} onChange={(e) => setBio(e.target.value)} />
                    <p className="mt-1 text-right text-xs text-ink/50">{bio.length}/280</p>
                  </div>
                  <div className="sm:col-span-2">
                    <button type="submit" className={btnPrimary} disabled={busy === "profile"}>
                      {busy === "profile" ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </form>
              </Section>
            </div>
          )}

          {/* ================= SECURITY ================= */}
          {tab === "security" && (
            <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" className="grid animate-fade-in gap-6">
              <Section title="Sign-in email" desc={`Currently ${profile.email}. We'll email a link to confirm any change.`}>
                <form onSubmit={changeEmail} className="flex flex-col gap-3 sm:flex-row">
                  <input type="email" className={input} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-email@example.com" aria-label="New sign-in email" />
                  <button type="submit" className={`${btnGhost} shrink-0`} disabled={busy === "email"}>
                    {busy === "email" ? "Sending…" : "Change email"}
                  </button>
                </form>
              </Section>

              <Section title="Password" desc="Use at least 8 characters.">
                <form onSubmit={changePassword} noValidate className="grid max-w-md gap-4">
                  <div>
                    <label className={label} htmlFor="curPw">Current password</label>
                    <input id="curPw" type="password" autoComplete="current-password" className={input} value={curPw} onChange={(e) => setCurPw(e.target.value)} />
                  </div>
                  <div>
                    <label className={label} htmlFor="newPw">New password</label>
                    <input id="newPw" type="password" autoComplete="new-password" className={input} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                    <div className="mt-2 flex gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={`h-1.5 flex-1 rounded-full ${i < pwScore ? "bg-brand" : "bg-ink/15"}`} />
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-ink/60">
                      Strength: {["Too short", "Weak", "Okay", "Good", "Strong"][newPw ? pwScore : 0]}
                    </p>
                  </div>
                  <div>
                    <label className={label} htmlFor="newPw2">Confirm new password</label>
                    <input id="newPw2" type="password" autoComplete="new-password" className={input} value={newPw2} onChange={(e) => setNewPw2(e.target.value)} aria-invalid={!!pwError} />
                    {pwError && <p role="alert" className="mt-1 text-xs font-semibold text-brand">{pwError}</p>}
                  </div>
                  <div>
                    <button type="submit" className={btnPrimary} disabled={busy === "password"}>
                      {busy === "password" ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </form>
              </Section>

              <Section title="Two-factor authentication" desc="Use an authenticator app (Google Authenticator, Authy, 1Password…) for a second step.">
                {!enroll && (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold">{mfaOn ? "On" : "Off"}</p>
                      <p className="text-xs text-ink/60">
                        {mfaOn ? "Your account has an authenticator app linked." : "Add an extra layer of protection."}
                      </p>
                    </div>
                    {mfaOn ? (
                      <button type="button" className={btnGhost} disabled={busy === "mfa"} onClick={() => turnOffMfa(factors[0].id)}>
                        Turn off
                      </button>
                    ) : (
                      <button type="button" className={btnPrimary} disabled={busy === "mfa"} onClick={startEnroll}>
                        Set up
                      </button>
                    )}
                  </div>
                )}
                {enroll && (
                  <form onSubmit={confirmEnroll} className="grid gap-4 sm:max-w-md">
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
                      <li>Open your authenticator app and scan this code.</li>
                      <li>Type the 6-digit number it shows.</li>
                    </ol>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={enroll.qr} alt="QR code to scan with your authenticator app" className="size-44 rounded-lg border border-ink/15 bg-white p-2" />
                    <p className="break-all text-xs text-ink/60">
                      Can&apos;t scan? Type this key instead: <code className="font-mono font-bold text-ink">{enroll.secret}</code>
                    </p>
                    <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={`${input} max-w-[10rem] text-center font-mono text-lg tracking-widest`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} aria-label="6-digit code" placeholder="000000" />
                    <div className="flex gap-2">
                      <button type="submit" className={btnPrimary} disabled={busy === "mfa"}>Turn on</button>
                      <button type="button" className={btnGhost} onClick={cancelEnroll}>Cancel</button>
                    </div>
                  </form>
                )}
              </Section>

              <Section title="Active sessions" desc="Where you're signed in.">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-ink/15 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{device}</p>
                    <p className="text-xs text-ink/60">This device · active now</p>
                  </div>
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-bold text-white">Current</span>
                </div>
                <button type="button" className={`${btnGhost} mt-4`} disabled={busy === "sessions"} onClick={signOutOthers}>
                  {busy === "sessions" ? "Working…" : "Sign out of all other devices"}
                </button>
              </Section>
            </div>
          )}

          {/* ================= NOTIFICATIONS ================= */}
          {tab === "notifications" && (
            <div role="tabpanel" id="panel-notifications" aria-labelledby="tab-notifications" className="animate-fade-in">
              <Section title="Notifications" desc="Choose how you hear about things.">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-ink/60">
                        <th className="pb-3 pr-3 font-bold">Type</th>
                        {NOTIF_CHANNELS.map((c) => (
                          <th key={c.key} className="pb-3 text-center font-bold">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {NOTIF_ROWS.map((r) => (
                        <tr key={r.key} className="border-t border-ink/10">
                          <td className="py-4 pr-3">
                            <p className="font-bold">{r.label}</p>
                            <p className="text-xs text-ink/60">{r.hint}</p>
                          </td>
                          {NOTIF_CHANNELS.map((c) => (
                            <td key={c.key} className="py-4 text-center">
                              <div className="flex justify-center">
                                <Switch
                                  name={`${r.label} by ${c.label}`}
                                  checked={isOn(r.key, c.key)}
                                  onChange={(v) => setPrefs((p) => ({ ...p, [prefKey(r.key, c.key)]: v }))}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className={`${btnPrimary} mt-5`} disabled={busy === "notifs"} onClick={saveNotifs}>
                  {busy === "notifs" ? "Saving…" : "Save notification settings"}
                </button>
              </Section>
            </div>
          )}

          {/* ================= PREFERENCES ================= */}
          {tab === "preferences" && (
            <div role="tabpanel" id="panel-preferences" aria-labelledby="tab-preferences" className="animate-fade-in">
              <Section title="Preferences">
                <form onSubmit={savePrefs} className="grid max-w-xl gap-4 sm:grid-cols-2">
                  <div>
                    <label className={label} htmlFor="language">Language</label>
                    <select id="language" className={input} value={language} onChange={(e) => setLanguage(e.target.value)}>
                      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={label} htmlFor="tz">Time zone</label>
                    <select id="tz" className={input} value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
                      {timeZone && !zones.includes(timeZone) && <option value={timeZone}>{timeZone}</option>}
                      {zones.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <fieldset className="sm:col-span-2">
                    <legend className={label}>Open this page after sign-in</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {([
                        ["dashboard", "Dashboard", "Your overview"],
                        ["tasks", "All Tasks", "Straight to your task list"],
                      ] as const).map(([val, title, hint]) => (
                        <label key={val} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/20 p-4 transition has-[:checked]:border-ink has-[:checked]:bg-ink/5">
                          <input type="radio" name="defaultView" value={val} checked={defaultView === val} onChange={() => setDefaultView(val)} className="mt-1 accent-[#ED1C24]" />
                          <span>
                            <span className="block text-sm font-bold">{title}</span>
                            <span className="block text-xs text-ink/60">{hint}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <div className="sm:col-span-2">
                    <button type="submit" className={btnPrimary} disabled={busy === "prefs"}>
                      {busy === "prefs" ? "Saving…" : "Save preferences"}
                    </button>
                  </div>
                </form>
              </Section>
            </div>
          )}

          {/* ================= CONNECTIONS ================= */}
          {tab === "connections" && (
            <div role="tabpanel" id="panel-connections" aria-labelledby="tab-connections" className="grid animate-fade-in gap-6">
              <Section title="Connected accounts" desc="Sign in faster with an account you already have.">
                <div className="flex items-center justify-between gap-4 rounded-xl border border-ink/15 p-4">
                  <div>
                    <p className="text-sm font-bold">Google</p>
                    <p className="text-xs text-ink/60">
                      {google ? "Connected" : "Not connected"}
                    </p>
                  </div>
                  {google ? (
                    <button type="button" className={btnGhost} disabled={busy === "google"} onClick={unlinkGoogle}>Disconnect</button>
                  ) : (
                    <button type="button" className={btnPrimary} onClick={linkGoogle}>Connect</button>
                  )}
                </div>
              </Section>
              <Section title="Organization memberships" desc="Organizations you belong to.">
                <p className="rounded-xl border border-dashed border-ink/25 p-6 text-center text-sm text-ink/60">
                  You aren&apos;t a member of any organization yet.
                </p>
              </Section>
            </div>
          )}
        </div>
      </div>

      {/* ---- toast ---- */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
        {toast && (
          <div
            key={toast.msg}
            className={`pointer-events-auto max-w-md animate-toast-in rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg ${toast.bad ? "bg-brand" : "bg-ink"}`}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
