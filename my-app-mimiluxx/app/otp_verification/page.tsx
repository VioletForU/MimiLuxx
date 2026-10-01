'use client';

import { useState, useRef } from 'react';
import styles from './otp.module.css';

export default function OtpConfirmationPage() {
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only accept numeric inputs
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take the last digit if pasted/typed
    setOtp(newOtp);

    // Auto-focus the next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const numericData = pastedData.filter((char) => /^\d$/.test(char));

    const newOtp = [...otp];
    numericData.forEach((num, idx) => {
      if (idx < 6) newOtp[idx] = num;
    });
    setOtp(newOtp);

    const nextIndex = Math.min(numericData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = otp.join('');
    console.log('Submitted OTP:', fullCode);
    // Add verification API call here
  };

  return (
    <main className={styles.pageContainer}>
      <div className={styles.card}>
        <h1 className={styles.title}>
          OTP<br />Confirmation
        </h1>

        <p className={styles.description}>
          Check your institutional email and enter the confirmation number sent.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.otpGroup} onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={styles.otpInput}
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          <button type="submit" className={styles.btnVerify}>
            Verify
          </button>
        </form>

        <div className={styles.resendWrapper}>
          <button
            type="button"
            className={styles.resendLink}
            onClick={() => alert('New OTP requested!')}
          >
            Request for another OTP Code
          </button>
        </div>
      </div>
    </main>
  );
}