/**
 * Which URLs a logged-out visitor may open. EVERYTHING else requires a login.
 * (Default-deny: a new page is protected automatically unless it is listed here.)
 */
const PUBLIC_EXACT = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/unauthorized"];
const PUBLIC_PREFIXES = ["/auth/"]; // email-confirmation and password-reset callbacks

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Makes a "send me back to…" value safe to redirect to. Only same-site paths are
 * allowed, so a crafted link such as /login?next=https://evil.example can't bounce
 * a user to another website after they sign in.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    if (isAuthPage(url.pathname)) return fallback; // never loop back to login/signup
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function isAuthPage(pathname: string): boolean {
  return pathname === "/login" || pathname === "/signup";
}
