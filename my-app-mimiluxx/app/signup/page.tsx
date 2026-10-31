"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyAuthError } from "@/lib/authErrors";
import AuthShell from "@/components/auth/AuthShell";
import {
  CheckboxField,
  FormAlert,
  PasswordField,
  PasswordStrength,
  SubmitButton,
  TextField,
} from "@/components/auth/fields";

type Values = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  detailsConfirmed: boolean;
  termsAgreed: boolean;
};
type FieldKey = keyof Values;
type FieldErrors = Partial<Record<FieldKey, string>>;

// Matches the order of the fields on screen, so focus goes to the first problem.
const FIELD_ORDER: FieldKey[] = [
  "fullName",
  "username",
  "email",
  "password",
  "confirmPassword",
  "detailsConfirmed",
  "termsAgreed",
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_.]{3,20}$/;

function validate(v: Values): FieldErrors {
  const errors: FieldErrors = {};
  if (v.fullName.trim().length < 2) errors.fullName = "Enter your full name.";
  if (!USERNAME_PATTERN.test(v.username.trim())) {
    errors.username = "Use 3 to 20 letters, numbers, dots or underscores.";
  }
  if (!EMAIL_PATTERN.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (v.password.length < 8) errors.password = "Use at least 8 characters.";
  if (v.confirmPassword !== v.password) errors.confirmPassword = "Passwords don't match.";
  if (!v.detailsConfirmed) errors.detailsConfirmed = "Please confirm your details are correct.";
  if (!v.termsAgreed) errors.termsAgreed = "You need to agree to the Terms and Conditions.";
  return errors;
}

function focusField(key: FieldKey) {
  document.getElementById(key)?.focus();
}

export default function SignupPage() {
  const [values, setValues] = useState<Values>({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    detailsConfirmed: false,
    termsAgreed: false,
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const supabase = createClient();

  function update<K extends FieldKey>(key: K, value: Values[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear a field's error as soon as the person starts fixing it.
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const errors = validate(values);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((key) => errors[key]);
    if (firstInvalid) {
      focusField(firstInvalid);
      return;
    }

    setLoading(true);
    const username = values.username.trim();
    const email = values.email.trim();

    // Usernames are unique, so say so up front instead of failing after submit.
    const { data: existing, error: lookupError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (lookupError) {
      setFormError(friendlyAuthError(lookupError.message));
      setLoading(false);
      return;
    }
    if (existing) {
      setFieldErrors({ username: "That username is already taken." });
      setLoading(false);
      focusField("username");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        data: { full_name: values.fullName.trim(), username },
      },
    });

    setLoading(false);

    if (error) {
      setFormError(friendlyAuthError(error.message));
      return;
    }

    // With email confirmation on, Supabase answers an address that is already
    // registered with a user that has no identities, rather than an error.
    if (data.user && data.user.identities?.length === 0) {
      setFieldErrors({ email: "An account with this email already exists." });
      focusField("email");
      return;
    }

    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox" subtitle={`We sent a confirmation link to ${sentTo}.`}>
        <div className="space-y-5">
          <p className="text-sm text-neutral-700">
            Click the link in that email to confirm your account, then log in. It can take a
            minute to arrive, and it may land in your spam folder.
          </p>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            Go to log in
          </Link>
          <button
            type="button"
            onClick={() => setSentTo(null)}
            className="w-full text-sm font-medium text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Used the wrong email? Start over
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your organization on MimiLuxx."
      footer={
        <>
          Already have an account?{" "}
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

        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="fullName"
            label="Full name"
            autoComplete="name"
            value={values.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            error={fieldErrors.fullName}
          />
          <TextField
            id="username"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={values.username}
            onChange={(e) => update("username", e.target.value)}
            error={fieldErrors.username}
          />
        </div>

        <TextField
          id="email"
          type="email"
          label="Institutional email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update("email", e.target.value)}
          error={fieldErrors.email}
        />

        <div>
          <PasswordField
            id="password"
            label="Password"
            autoComplete="new-password"
            hint="At least 8 characters."
            value={values.password}
            onChange={(e) => update("password", e.target.value)}
            error={fieldErrors.password}
          />
          <PasswordStrength password={values.password} />
        </div>

        <PasswordField
          id="confirmPassword"
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={(e) => update("confirmPassword", e.target.value)}
          error={fieldErrors.confirmPassword}
        />

        <div className="space-y-3">
          <CheckboxField
            id="detailsConfirmed"
            checked={values.detailsConfirmed}
            onChange={(e) => update("detailsConfirmed", e.target.checked)}
            error={fieldErrors.detailsConfirmed}
          >
            I confirm that the details above are correct.
          </CheckboxField>
          <CheckboxField
            id="termsAgreed"
            checked={values.termsAgreed}
            onChange={(e) => update("termsAgreed", e.target.checked)}
            error={fieldErrors.termsAgreed}
          >
            I agree to the <strong>Terms and Conditions</strong>.
          </CheckboxField>
        </div>

        <SubmitButton loading={loading} loadingText="Creating account...">
          Create account
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
