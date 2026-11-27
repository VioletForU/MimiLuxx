"use client";

import { useEffect, useState } from "react";
import { LOADING_TARGET_MS, LOADING_TIMEOUT_MS } from "./loadingConfig";

/**
 * Branded loading screen with a time-boxed progress bar.
 *
 * The bar climbs to 90% over LOADING_TARGET_MS and then holds, so it never
 * looks finished before the page is. Next unmounts this component the moment
 * the real page is ready. If that takes longer than LOADING_TIMEOUT_MS, the
 * screen switches to a retry message so the user is never left waiting blindly.
 */
export default function PageLoader({
  label = "Loading",
  fullScreen = true,
}: {
  label?: string;
  fullScreen?: boolean;
}) {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setTimedOut(true), LOADING_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full flex-col items-center justify-center bg-[#EEF0F4] px-6 ${
        fullScreen ? "min-h-screen" : "min-h-[60vh]"
      }`}
    >
      <div className="flex w-full max-w-[320px] flex-col items-center text-center">
        <div className="flex select-none items-center text-[40px] font-black leading-none tracking-tight">
          <span className="text-[#111111]">Mimi</span>
          <span className="text-[#E5252A]">Luxx</span>
        </div>

        {timedOut ? (
          <>
            <p className="mt-8 text-[15px] font-bold text-[#111111]">This is taking longer than expected</p>
            <p className="mt-1 text-[13px] text-[#7A7F87]">Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full bg-[#E5252A] px-6 py-2.5 text-[13px] font-bold text-white transition hover:bg-[#c71e23] focus:outline-none focus:ring-4 focus:ring-[#E5252A]/25"
            >
              Retry
            </button>
          </>
        ) : (
          <>
            <div
              className="mt-8 h-1.5 w-full overflow-hidden rounded-full bg-[#E1E3E8]"
              aria-hidden="true"
            >
              <div
                className="loader-fill h-full rounded-full bg-[#E5252A]"
                style={{ animationDuration: `${LOADING_TARGET_MS}ms` }}
              />
            </div>
            <p className="mt-4 text-[13px] font-semibold text-[#7A7F87]">{label}…</p>
          </>
        )}
      </div>
    </div>
  );
}
