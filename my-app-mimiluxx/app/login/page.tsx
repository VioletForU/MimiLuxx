"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./loginui_style.module.css";

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let email = identifier;

    if (!identifier.includes("@")) {
      const { data: profile, error: lookupError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", identifier)
        .single();

      if (lookupError || !profile) {
        setError("No account found with that username.");
        setLoading(false);
        return;
      }
      email = profile.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className={styles.pageContainer}>
      <div className={styles.leftSection}>
        <div className={styles.heroText}>
          <span className={styles.subheading}>New user? Join us</span>
          <h1 className={styles.mainHeading}>NOW</h1>
        </div>

        <div className={styles.signupCta}>
          <p className={styles.ctaLabel}>Don't have an account yet?</p>
          <Link href="/signup">
            <button type="button" className={styles.btnPill}>
              Create account
            </button>
          </Link>
        </div>
      </div>

      <div className={styles.rightSection}>
        <div className={styles.loginCard}>
          <h2 className={styles.brandTitle}>MimiLuxx</h2>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            {error && <p style={{ color: "red" }}>{error}</p>}

            <div className={styles.inputGroup}>
              <label htmlFor="username">Username or Email</label>
              <input
                type="text"
                id="username"
                name="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
              />
            </div>

            <button type="submit" className={styles.btnSubmit} disabled={loading}>
              {loading ? "Logging in..." : "Continue"}
            </button>

            <div className={styles.forgotWrapper}>
              <Link href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </Link>
            </div>

            <div className={styles.divider}>
              <span>Or continue logging in using</span>
            </div>

            <div className={styles.socialLoginGroup}>
              <button type="button" className={styles.socialBtn} aria-label="Social option 1" />
              <button type="button" className={styles.socialBtn} aria-label="Social option 2" />
              <button type="button" className={styles.socialBtn} aria-label="Social option 3" />
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
