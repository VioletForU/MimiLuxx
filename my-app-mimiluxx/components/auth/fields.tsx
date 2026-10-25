"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";

const inputBase =
  "w-full rounded-xl border bg-neutral-100 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-500 outline-none transition focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60";

function inputClasses(hasError: boolean) {
  return `${inputBase} ${
    hasError
      ? "border-[#EA2323] focus:border-[#EA2323] focus:ring-[#EA2323]/25"
      : "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900/15"
  }`;
}

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
};

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-[#C41E1E]">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="mt-1.5 text-xs text-neutral-500">
        {hint}
      </p>
    );
  }
  return null;
}

export function TextField({ id, label, hint, error, ...input }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={inputClasses(!!error)}
        {...input}
      />
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function PasswordField({ id, label, hint, error, ...input }: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-800">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${inputClasses(!!error)} pr-16`}
          {...input}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 rounded-r-xl px-4 text-xs font-semibold text-neutral-600 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/30"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
}

export function CheckboxField({
  id,
  error,
  children,
  ...input
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className" | "type"> & {
  id: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-neutral-700">
        <input
          id={id}
          name={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-400 accent-[#1f1f1f]"
          {...input}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 pl-7 text-xs font-medium text-[#C41E1E]">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#EA2323]/30 bg-[#EA2323]/10 px-4 py-3 text-sm text-[#9f1515]"
    >
      {message}
    </div>
  );
}

export function SubmitButton({
  loading,
  loadingText,
  children,
}: {
  loading: boolean;
  loadingText: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1f1f1f] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA2323]/60 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
        />
      )}
      {loading ? loadingText : children}
    </button>
  );
}

/** 0 to 4. Anything under 8 characters scores 0 regardless of variety. */
export function scorePassword(pw: string): number {
  if (pw.length < 8) return 0;
  let score = 1;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["Too short", "Weak", "Okay", "Strong", "Very strong"];

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = scorePassword(password);
  const color = score <= 1 ? "bg-[#EA2323]" : score === 2 ? "bg-amber-500" : "bg-green-600";

  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${segment <= score ? color : "bg-neutral-300"}`}
          />
        ))}
      </div>
      <span className="w-20 text-right text-xs text-neutral-600">{STRENGTH_LABELS[score]}</span>
    </div>
  );
}
