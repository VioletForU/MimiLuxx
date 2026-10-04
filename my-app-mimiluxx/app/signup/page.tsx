"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./signupui_style.module.css";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        username: username,
        role: "Member",
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    setSent(true);
  }

  if (sent) {
    return (
      <main className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          <section className={styles.leftSection}>
            <div className={styles.signupCard}>
              <h1 className={styles.brandTitle}>MimiLuxx</h1>
              <p>Check your email to confirm your account, then log in.</p>
              <Link href="/login">
                <button type="button" className={styles.btnPill}>Go to Login</button>
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pageContainer}>
      <div className={styles.contentWrapper}>

        <section className={styles.leftSection}>
          <div className={styles.signupCard}>
            <h1 className={styles.brandTitle}>MimiLuxx</h1>

            <form className={styles.signupForm} onSubmit={handleSubmit}>
              {error && <p style={{ color: "red" }}>{error}</p>}

              <div className={styles.inputGroup}>
                <label htmlFor="fullName">Full name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="email">Institutional email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button type="submit" className={styles.btnSubmit} disabled={loading}>
                {loading ? "Creating account..." : "Continue"}
              </button>

              <div className={styles.checkboxArea}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="detailsConfirmed" required />
                  <span>I confirm that the details here are correct</span>
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" name="termsAgreed" required />
                  <span>
                    I agree to the <strong>Terms and Conditions</strong> stated
                  </span>
                </label>
              </div>
            </form>
          </div>
        </section>

        <section className={styles.rightSection}>
          <div className={styles.heroText}>
            <span className={styles.subheading}>Already a member? Open your</span>
            <h2 className={styles.mainHeading}>ACCOUNT</h2>
          </div>

          <div className={styles.loginCta}>
            <p className={styles.ctaLabel}>Open your account by</p>
            <Link href="/login">
              <button type="button" className={styles.btnPill}>
                Logging In
              </button>
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
