"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import AuthShell from "@/components/auth/AuthShell";
import { FormAlert, PasswordField, SubmitButton, TextField } from "@/components/auth/fields";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const id = identifier.trim();
    if (!id || !password) {
      setError("Enter your email or username and your password.");
      return;
    }

    setLoading(true);
    let email = id;

    // A username was typed instead of an email: look up the email it belongs to.
    if (!id.includes("@")) {
      const { data: profile, error: lookupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", id)
        .maybeSingle();

      if (lookupError) {
        setError(friendlyAuthError(lookupError.message));
        setLoading(false);
        return;
      }
      if (!profile?.email) {
        // Same wording as a wrong password, so this form can't be used to
        // discover which usernames exist.
        setError(friendlyAuthError("Invalid login credentials"));
        setLoading(false);
        return;
      }
      email = profile.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(friendlyAuthError(signInError.message));
      setLoading(false);
      return;
    }

    // Stay in the loading state until the navigation completes.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to pick up where you left off."
      footer={
        <>
          New to MimiLuxx?{" "}
          <Link
            href="/signup"
            className="font-semibold text-neutral-900 underline underline-offset-4 hover:text-[#EA2323]"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormAlert message={error} />

        <TextField
          id="identifier"
          label="Email or username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <SubmitButton loading={loading} loadingText="Logging in...">
          Log in
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
