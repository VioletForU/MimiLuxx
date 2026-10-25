/**
 * Turns the raw messages Supabase returns into something a person can act on.
 * Anything we don't recognise is passed through unchanged.
 */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();

  if (m.includes("invalid login credentials")) {
    return "Incorrect email/username or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox for the confirmation link.";
  }
  if (m.includes("user already registered")) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (m.includes("database error saving new user")) {
    return "We couldn't create your account. That username may already be taken, so try a different one.";
  }
  if (m.includes("error sending") && m.includes("email")) {
    return "We couldn't send the email. Please try again in a few minutes.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Too many attempts right now. Please wait a few minutes and try again.";
  }
  if (m.includes("auth session missing")) {
    return "This reset link is invalid or has expired. Request a new one.";
  }
  if (m.includes("different from the old password")) {
    return "Your new password must be different from your current one.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Can't reach the server. Check your connection and try again.";
  }

  return message;
}
