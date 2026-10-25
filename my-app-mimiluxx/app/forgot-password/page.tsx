"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import AuthShell from "@/components/auth/AuthShell";
import { FormAlert, SubmitButton, TextField } from "@/components/auth/fields";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const address = email.trim();
    if (!EMAIL_PATTERN.test(address)) {
      setFieldError("Enter a valid email address.");
      document.getElementById("email")?.focus();
      return;
    }
    setFieldError(undefined);

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    setLoading(false);

    if (error) {
      setFormError(friendlyAuthError(error.message));
      return;
    }

    setSentTo(address);
  }

  if (sentTo) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`If an account exists for ${sentTo}, we've sent a link to reset your password.`}
      >
        <div className="space-y-5">
          <p className="text-sm text-neutral-700">
            The link works for a limited time, so use it soon. Nothing after a few minutes? Check
            your spam folder or try again.
          </p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Back to log in
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="w-full text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Use a different email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-[#EA2323]"
          >
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormAlert message={formError} />

        <TextField
          id="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setFieldError(undefined);
          }}
          error={fieldError}
        />

        <SubmitButton loading={loading} loadingText="Sending...">
          Send reset link
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
