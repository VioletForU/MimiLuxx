/* MimiLuxx US08: Approve / Reject workflow (client-side preview logic).
 *
 * What this file does
 *   - Approve / Reject with an exact sign-off time ("Approved at 10:45 AM by ...")
 *   - A required comment when rejecting (10 to 300 characters), shown as a quote
 *   - Card, badge and audit-trail changes for Pending / Approved / Rejected
 *   - "Preview as" switch: assigned signatory vs. viewer (locked buttons + tooltip)
 *
 * What it does NOT do
 *   - Talk to Supabase. In the real app the signatory check and the timestamp
 *     MUST come from the server. This file only previews the look and feel.
 *
 * Hook for later: every decision fires a "signoff:decided" event on `document`
 * with { type, time, reason }, so you can attach the real API call there.
 */
"use strict";

(() => {
  /* ---------- Settings (edit these) ---------- */
  const CONFIG = {
    reasonMin: 10,
    me: { name: "Miguel Santos", role: "Exec Approver" },
    viewer: { name: "Jon Dela Cruz", role: "Member" },
    requester: "Carla Tan",
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    card: $("request-card"), badge: $("status-badge"),
    guardBanner: $("guard-banner"), guardText: $("guard-text"),
    actionArea: $("action-area"), lockHint: $("lock-hint"),
    approve: $("btn-approve"), reject: $("btn-reject"),
    tipApprove: $("tip-approve"), tipReject: $("tip-reject"),
    drawer: $("reject-drawer"), reason: $("reason"), reasonHelp: $("reason-help"), reasonCount: $("reason-count"),
    cancel: $("cancel-reject"),
    decision: $("decision"), decisionTitle: $("decision-title"), decisionSub: $("decision-sub"),
    decisionReason: $("decision-reason"), reset: $("btn-reset"),
    stageFinal: $("stage-final"), stageFinalText: $("stage-final-text"),
    stageClosed: $("stage-closed"), stageClosedText: $("stage-closed-text"),
    live: $("sr-live"),
  };

  /** The only things that change: who is looking, and the decision (or null). */
  const state = { mode: "signatory", decision: null };

  /* ---------- Helpers ---------- */
  const formatTime = (d) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const formatDateTime = (d) =>
    d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  /** Returns an error message, or "" when the comment is good. */
  const reasonError = (text) =>
    text.trim().length < CONFIG.reasonMin
      ? `Please write at least ${CONFIG.reasonMin} characters so ${CONFIG.requester} knows what to fix.`
      : "";

  const restartAnimation = (node, className) => {
    node.classList.remove(className);
    void node.offsetWidth; // forces the browser to notice, so the animation replays
    node.classList.add(className);
  };

  const announce = (message) => { el.live.textContent = message; };

  /* ---------- Rendering: each function owns one part of the page ---------- */
  function renderViewer() {
    const isSignatory = state.mode === "signatory";
    const who = isSignatory ? CONFIG.me : CONFIG.viewer;

    document.querySelectorAll(".seg-btn").forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.mode === state.mode)));

    el.guardBanner.dataset.mode = state.mode;
    const strong = (text) => Object.assign(document.createElement("strong"), { textContent: text });
    el.guardText.replaceChildren(
      "Viewing as ", strong(who.name), ` (${who.role}). `,
      ...(isSignatory
        ? ["You are the ", strong("assigned signatory"), " for this stage."]
        : ["You can read this request but cannot sign it."])
    );

    // Locked buttons stay focusable (aria-disabled) so keyboard users can read the tooltip.
    [[el.approve, el.tipApprove], [el.reject, el.tipReject]].forEach(([button, tip]) => {
      button.setAttribute("aria-disabled", String(!isSignatory));
      if (isSignatory) button.removeAttribute("aria-describedby");
      else button.setAttribute("aria-describedby", tip.id);
    });
    el.lockHint.hidden = isSignatory;
  }

  function renderDecision() {
    const { decision } = state;
    const decided = decision !== null;

    el.card.dataset.state = decided ? decision.type : "pending";
    el.badge.dataset.status = decided ? decision.type : "pending";
    el.badge.textContent = decided ? (decision.type === "approved" ? "Approved" : "Rejected") : "Pending";

    el.actionArea.hidden = decided;
    el.decision.hidden = !decided;
    if (!decided) return;

    const approved = decision.type === "approved";
    const when = Object.assign(document.createElement("time"), {
      dateTime: decision.date.toISOString(),
      title: decision.date.toLocaleString(),
      textContent: formatTime(decision.date),
    });
    el.decision.dataset.state = decision.type;
    el.decisionTitle.replaceChildren(
      `${approved ? "Approved" : "Rejected"} at `, when, ` by ${CONFIG.me.name}, ${CONFIG.me.role}`
    );
    el.decisionSub.textContent = approved
      ? `The request moves on and ${CONFIG.requester} has been told.`
      : `The request is closed and ${CONFIG.requester} has been told what to revise.`;
    el.decisionReason.hidden = approved;
    el.decisionReason.textContent = approved ? "" : `“${decision.reason}”`;
  }

  function renderTrail() {
    const { decision } = state;
    if (!decision) {
      el.stageFinal.dataset.state = "active";
      el.stageFinalText.textContent = `${CONFIG.me.name} · waiting for decision`;
      el.stageClosed.dataset.state = "upcoming";
      el.stageClosedText.textContent = "After the final decision";
      return;
    }
    const approved = decision.type === "approved";
    const stamp = formatDateTime(decision.date);
    el.stageFinal.dataset.state = decision.type;
    el.stageFinalText.textContent = `${CONFIG.me.name} · ${approved ? "approved" : "rejected"} ${stamp}`;
    el.stageClosed.dataset.state = approved ? "done" : "rejected";
    el.stageClosedText.textContent = approved
      ? `Fully approved · ${stamp}`
      : `Closed as rejected · ${stamp}. Revision requested.`;
    [el.stageFinal, el.stageClosed].forEach((li) => restartAnimation(li, "trail-fresh"));
  }

  const render = () => { renderViewer(); renderDecision(); renderTrail(); };

  /* ---------- Rejection drawer ---------- */
  function openDrawer() {
    el.drawer.hidden = false;
    el.reject.setAttribute("aria-expanded", "true");
    el.reason.focus();
  }

  function closeDrawer() {
    el.drawer.hidden = true;
    el.reject.setAttribute("aria-expanded", "false");
    el.reason.value = "";
    el.reason.removeAttribute("aria-invalid");
    el.reasonCount.textContent = "0";
    el.reasonHelp.textContent = `At least ${CONFIG.reasonMin} characters.`;
  }

  /* ---------- Actions ---------- */
  const isSignatory = () => state.mode === "signatory";

  function blocked(button) {
    restartAnimation(button, "animate-shake");
    announce("Only the assigned signatory can do this.");
  }

  function decide(type, reason = "") {
    state.decision = { type, reason, date: new Date() }; // real app: use the server's timestamp
    document.dispatchEvent(new CustomEvent("signoff:decided", { detail: { type, time: state.decision.date, reason } }));
    closeDrawer();
    render();
    announce(`${type === "approved" ? "Approved" : "Rejected"}.`);
    el.decision.focus(); // keyboard and screen reader users land on the result
  }

  /* ---------- Events ---------- */
  el.approve.addEventListener("click", () => (isSignatory() ? decide("approved") : blocked(el.approve)));

  el.reject.addEventListener("click", () => {
    if (!isSignatory()) return blocked(el.reject);
    el.drawer.hidden ? openDrawer() : closeDrawer();
  });

  el.cancel.addEventListener("click", () => { closeDrawer(); el.reject.focus(); });

  el.reason.addEventListener("input", () => {
    el.reasonCount.textContent = String(el.reason.value.length);
    if (el.reason.getAttribute("aria-invalid") && !reasonError(el.reason.value)) {
      el.reason.removeAttribute("aria-invalid");
      el.reasonHelp.textContent = `At least ${CONFIG.reasonMin} characters.`;
    }
  });

  el.drawer.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!isSignatory()) return;
    const problem = reasonError(el.reason.value);
    if (problem) {
      el.reason.setAttribute("aria-invalid", "true");
      el.reasonHelp.textContent = problem;
      el.reason.focus();
      return;
    }
    decide("rejected", el.reason.value.trim());
  });

  el.reset.addEventListener("click", () => {
    state.decision = null;
    render();
    announce("Demo reset. The request is pending again.");
    el.approve.focus();
  });

  document.querySelectorAll(".seg-btn").forEach((button) =>
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      if (!isSignatory()) closeDrawer();
      render();
    }));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !el.drawer.hidden) { closeDrawer(); el.reject.focus(); }
  });

  render();
})();
