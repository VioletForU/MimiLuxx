"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import AuthShell from "@/components/auth/AuthShell";
import { FormAlert, PasswordField, PasswordStrength, SubmitButton } from "@/components/auth/fields";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [confirmError, setConfirmError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const tooShort = password.length < 8;
    const mismatch = confirmPassword !== password;
    setPasswordError(tooShort ? "Use at least 8 characters." : undefined);
    setConfirmError(mismatch ? "Passwords don't match." : undefined);
    if (tooShort) {
      document.getElementById("password")?.focus();
      return;
    }
    if (mismatch) {
      document.getElementById("confirmPassword")?.focus();
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setFormError(friendlyAuthError(error.message));
      return;
    }

    setDone(true);
  }

  if (done) {
    return (
      <AuthShell title="Password updated" subtitle="You are signed in with your new password.">
        <Link
          href="/dashboard"
          className="flex w-full items-center justify-center rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
        >
          Continue to dashboard
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick something you have not used here before."
      footer={
        <>
          Link not working?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-[#EA2323]"
          >
            Request a new one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />

        <div>
          <PasswordField
            id="password"
            label="New password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(undefined);
            }}
            error={passwordError}
          />
          <PasswordStrength password={password} />
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setConfirmError(undefined);
          }}
          error={confirmError}
        />

        <SubmitButton loading={loading} loadingText="Updating...">
          Update password
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
