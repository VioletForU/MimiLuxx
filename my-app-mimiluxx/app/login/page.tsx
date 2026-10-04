import Link from 'next/link';
import styles from './loginui_style.module.css';

export default function LoginPage() {
  return (
    <main className={styles.pageContainer}>
      {/* Left Section */}
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

      {/* Right Form Section */}
      <div className={styles.rightSection}>
        <div className={styles.loginCard}>
          <h2 className={styles.brandTitle}>MimiLuxx</h2>

          <form className={styles.loginForm}>
            <div className={styles.inputGroup}>
              <label htmlFor="username">Username or Email</label>
              <input type="text" id="username" name="username" />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password">Password</label>
              <input type="password" id="password" name="password" />
            </div>

            <button type="submit" className={styles.btnSubmit}>
              Continue
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