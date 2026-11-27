import { LOADING_TARGET_MS } from "./loadingConfig";

/** Slim time-boxed bar pinned to the top edge, for use above skeleton screens. */
export default function TopProgressBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent" aria-hidden="true">
      <div
        className="loader-fill h-full bg-[#E5252A] shadow-[0_0_8px_rgba(229,37,42,0.6)]"
        style={{ animationDuration: `${LOADING_TARGET_MS}ms` }}
      />
    </div>
  );
}
