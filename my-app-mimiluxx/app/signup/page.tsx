import Link from 'next/link';
import styles from './signupui_style.module.css';

export default function SignupPage() {
  return (
    <main className={styles.pageContainer}>
      <div className={styles.contentWrapper}>
        
        {/* Left Form Section */}
        <section className={styles.leftSection}>
          <div className={styles.signupCard}>
            <h1 className={styles.brandTitle}>MimiLuxx</h1>

            <form className={styles.signupForm}>
              {/* Full Name */}
              <div className={styles.inputGroup}>
                <label htmlFor="fullName">Full name</label>
                <input type="text" id="fullName" name="fullName" required />
              </div>

              {/* Username */}
              <div className={styles.inputGroup}>
                <label htmlFor="username">Username</label>
                <input type="text" id="username" name="username" required />
              </div>

              {/* Institutional Email */}
              <div className={styles.inputGroup}>
                <label htmlFor="email">Institutional email</label>
                <input type="email" id="email" name="email" required />
              </div>

              {/* Password */}
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" required />
              </div>

              {/* Confirm Password */}
              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input type="password" id="confirmPassword" name="confirmPassword" required />
              </div>

              {/* Submit Button */}
              <button type="submit" className={styles.btnSubmit}>
                Continue
              </button>

              {/* Confirmation Checkboxes */}
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

        {/* Right Section (Hero Text & Log in CTA) */}
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