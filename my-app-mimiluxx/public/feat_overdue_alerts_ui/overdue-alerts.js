/* MimiLuxx US09: threshold check + breach notifications (client-side preview engine).
 *
 * What this file does
 *   1. Holds a time limit per signatory role (hours or days, with optional reminders).
 *   2. Runs a "scheduled job" with setInterval that scans pending approvals for breaches.
 *      The scan works in small chunks and yields to the browser, so the page never freezes.
 *   3. On a NEW breach it alerts BOTH the pending signatory and the requester:
 *      a toast, two log rows, a per-card activity entry, and the card turns red.
 *   4. Exposes small helper functions on window.MimiThreshold (see bottom).
 *
 * What it does NOT do
 *   Talk to Supabase. In the real app the check runs on the server (the Edge Function in
 *   supabase/functions/threshold-check). The rules below are the same ones that function
 *   uses, so what you see here matches what the backend will do.
 */
"use strict";

(() => {
  /* ======================================================================
   * 1. Settings (edit these)
   * ==================================================================== */
  const SETTINGS = {
    defaultEverySec: 10, // how often the demo job runs
    chunkSize: 25,       // how many approvals to check before letting the browser breathe
    maxLog: 60,          // oldest log rows are dropped after this many
    toastMs: 7000,       // how long a toast stays
    maxToasts: 4,
    warnAt: 0.8,         // "Almost due" starts at 80% of the limit
  };
  const HOUR = 3_600_000;
  const ROLES = ["Committee Lead", "Exec Approver"];
  const STATE_ORDER = { breach: 0, warn: 1, ok: 2, off: 3 };

  /* ======================================================================
   * 2. Pure rules (same logic as supabase/functions/_shared/thresholds.ts)
   * ==================================================================== */
  const hoursBetween = (fromMs, toMs) => Math.max(0, (toMs - fromMs) / HOUR);

  /** 0 = not breached. 1 = first breach. 2, 3... = reminders. */
  function breachLevel(hours, rule) {
    if (!rule.enabled || hours < rule.limitHours) return 0;
    if (rule.repeatHours <= 0) return 1;
    return 1 + Math.floor((hours - rule.limitHours) / rule.repeatHours);
  }

  function stateFor(hours, rule) {
    if (!rule.enabled) return "off";
    if (hours >= rule.limitHours) return "breach";
    return hours >= rule.limitHours * SETTINGS.warnAt ? "warn" : "ok";
  }

  function formatHours(h) {
    const whole = Math.floor(h);
    if (whole < 24) return `${whole} h`;
    const d = Math.floor(whole / 24), r = whole % 24;
    return r ? `${d} day${d > 1 ? "s" : ""} ${r} h` : `${d} day${d > 1 ? "s" : ""}`;
  }

  const validateRule = ({ limitHours, repeatHours }) => {
    if (!Number.isInteger(limitHours) || limitHours < 1 || limitHours > 8760)
      return "The limit must be a whole number from 1 hour to 365 days.";
    if (!Number.isInteger(repeatHours) || repeatHours < 0 || repeatHours > 8760)
      return "Reminders must be a whole number from 0 to 8760 hours (0 = never).";
    return "";
  };

  /* ======================================================================
   * 3. Demo clock + data
   * ==================================================================== */
  const clock = { offsetMs: 0, now() { return Date.now() + this.offsetMs; } };

  const fmtTime = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtStamp = (ms) => {
    const d = new Date(ms), n = new Date(clock.now());
    const sameDay = d.toDateString() === n.toDateString();
    return `${sameDay ? "Today" : d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${fmtTime(ms)}`;
  };

  function createStore() {
    const t0 = Date.now(), ago = (h) => t0 - h * HOUR;
    const store = {
      rules: {
        "Committee Lead": { limitHours: 48, repeatHours: 24, enabled: true },
        "Exec Approver": { limitHours: 72, repeatHours: 0, enabled: true },
      },
      items: [
        { id: "p1", title: "Org Shirt Design Approval", requester: "Carla Tan", role: "Exec Approver", since: ago(80) },
        { id: "p2", title: "Intramurals Budget 2026", requester: "Ana Reyes", role: "Committee Lead", since: ago(61) },
        { id: "p3", title: "Tech Talk Venue Booking", requester: "Miguel Cruz", role: "Committee Lead", since: ago(46) },
        { id: "p4", title: "Recruitment Week Poster", requester: "Jon Dela Cruz", role: "Exec Approver", since: ago(9) },
      ],
      log: [], notified: new Set(), scan: new Map(), nextLogId: 1,
    };
    // Alerts that were already sent before the page opened, so loading does not re-send them.
    seedBreach(store, store.items[0], 1, ago(8));
    seedBreach(store, store.items[1], 1, ago(13));
    addLog(store, { at: ago(30), kind: "requester", who: "Miguel Cruz", itemId: null,
      text: "Told that “Hackathon Kit Request” has waited 3 days (limit 3 days)." });
    return store;
  }

  function addLog(store, entry) {
    store.log.unshift({ id: store.nextLogId++, ...entry });
    store.log.sort((a, b) => b.at - a.at);
    if (store.log.length > SETTINGS.maxLog) store.log.length = SETTINGS.maxLog;
  }

  function breachTexts(item, level, hours, rule) {
    const reminder = level > 1 ? `Reminder #${level - 1}: ` : "";
    const waited = formatHours(hours), limit = formatHours(rule.limitHours);
    return {
      reminder, waited, limit,
      signatory: `${reminder}Reminded to sign off “${item.title}” (waiting ${waited}, limit ${limit}).`,
      requester: `${reminder}Told that “${item.title}” has waited ${waited} for a ${item.role} (limit ${limit}).`,
    };
  }

  function seedBreach(store, item, level, at) {
    const rule = store.rules[item.role];
    const text = breachTexts(item, level, hoursBetween(item.since, at) + 0, rule);
    store.notified.add(`${item.id}:${level}`);
    addLog(store, { at, kind: "signatory", who: `${item.role}s`, itemId: item.id, text: text.signatory });
    addLog(store, { at, kind: "requester", who: item.requester, itemId: item.id, text: text.requester });
  }

  let store = createStore();
  let autoWanted = true; // does the person want automatic checks on?
  let logFilter = "all";
  let renderedLogIds = new Set();
  const cardNodes = new Map(); // item id -> <li>

  /* ======================================================================
   * 4. The scheduled job
   * ==================================================================== */
  const job = { timerId: null, everySec: SETTINGS.defaultEverySec, running: false, lastRunAt: null, nextRunAt: null };
  const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

  /** One scan. Returns how many NEW breaches it found. Safe to call while another is running. */
  async function runCheck({ silent = false } = {}) {
    if (job.running) return 0;
    job.running = true;
    const now = clock.now();
    const results = new Map();
    const fresh = [];

    for (let i = 0; i < store.items.length; i += SETTINGS.chunkSize) {
      for (const item of store.items.slice(i, i + SETTINGS.chunkSize)) {
        const rule = store.rules[item.role];
        const hours = hoursBetween(item.since, now);
        const level = breachLevel(hours, rule);
        results.set(item.id, { hours, level, state: stateFor(hours, rule) });
        if (level > 0 && !store.notified.has(`${item.id}:${level}`)) fresh.push({ item, level, hours, rule });
      }
      if (i + SETTINGS.chunkSize < store.items.length) await nextTick(); // let the page breathe
    }

    store.scan = results;
    fresh.forEach((f) => notifyBreach(f, now, silent));
    job.lastRunAt = Date.now();
    job.running = false;
    scheduleNextLabel();
    renderAll();
    return fresh.length;
  }

  function startJob(everySec = job.everySec) {
    stopJob();
    job.everySec = everySec;
    job.nextRunAt = Date.now() + everySec * 1000;
    job.timerId = setInterval(() => {
      job.nextRunAt = Date.now() + job.everySec * 1000;
      runCheck();
    }, everySec * 1000);
    setAutoSwitch(true);
    renderJobStatus();
  }

  function stopJob() {
    clearInterval(job.timerId);
    job.timerId = null;
    job.nextRunAt = null;
    setAutoSwitch(false);
    renderJobStatus();
  }

  function scheduleNextLabel() {
    if (job.timerId) job.nextRunAt = Date.now() + job.everySec * 1000;
  }

  /* ======================================================================
   * 5. Notifications: toast + log rows (signatory AND requester)
   * ==================================================================== */
  function notifyBreach({ item, level, hours, rule }, now, silent) {
    store.notified.add(`${item.id}:${level}`);
    const text = breachTexts(item, level, hours, rule);

    addLog(store, { at: now, kind: "signatory", who: `${item.role}s`, itemId: item.id, text: text.signatory });
    addLog(store, { at: now, kind: "requester", who: item.requester, itemId: item.id, text: text.requester });

    if (!silent) {
      showToast({
        kind: "breach",
        title: `${text.reminder}Threshold breach`,
        body: `“${item.title}” has waited ${text.waited} (limit ${text.limit}). ${item.role}s and ${item.requester} were notified.`,
      });
    }
    document.dispatchEvent(new CustomEvent("threshold:breach", { detail: { itemId: item.id, level, hours } }));
  }

  const toastStack = () => document.getElementById("toast-stack");

  function showToast({ kind = "info", title, body }) {
    const stack = toastStack();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.dataset.kind = kind;
    toast.setAttribute("role", kind === "breach" ? "alert" : "status");

    const text = document.createElement("div");
    text.className = "min-w-0 flex-1";
    const strong = Object.assign(document.createElement("p"), { className: "font-extrabold", textContent: title });
    const p = Object.assign(document.createElement("p"), { className: "mt-0.5 text-[13px] opacity-90", textContent: body });
    text.append(strong, p);

    const close = Object.assign(document.createElement("button"), {
      type: "button", className: "toast-close", textContent: "×",
    });
    close.setAttribute("aria-label", "Dismiss notification");

    const dismiss = () => {
      if (toast.dataset.leaving) return;
      toast.dataset.leaving = "true";
      setTimeout(() => toast.remove(), 220);
    };
    close.addEventListener("click", dismiss);
    toast.append(text, close);

    stack.prepend(toast);
    while (stack.children.length > SETTINGS.maxToasts) stack.lastElementChild.remove();
    setTimeout(dismiss, SETTINGS.toastMs);
  }

  /* ======================================================================
   * 6. Rendering (only touches what changed)
   * ==================================================================== */
  const $ = (id) => document.getElementById(id);
  const ref = (root, name) => root.querySelector(`[data-ref="${name}"]`);

  const TIPS = {
    breach: (hours, rule, item) =>
      `Overdue. Waiting ${formatHours(hours)}, limit ${formatHours(rule.limitHours)}. ${item.role}s and ${item.requester} were alerted.`,
    warn: (hours, rule) =>
      `Almost due. ${formatHours(rule.limitHours - hours)} left before the ${formatHours(rule.limitHours)} limit.`,
    ok: (hours, rule) => `On time. ${formatHours(rule.limitHours - hours)} left before the limit.`,
    off: () => "This role is not being checked. Turn it on in Time limits.",
  };
  const BADGE_TEXT = {
    breach: (hours, rule) => `Breached +${formatHours(hours - rule.limitHours)}`,
    warn: () => "Almost due",
    ok: () => "On time",
    off: () => "Not checked",
  };

  function ensureCard(item, index) {
    let li = cardNodes.get(item.id);
    if (li) return li;
    li = $("card-template").content.firstElementChild.cloneNode(true);
    li.style.setProperty("--i", String(index)); // staggers the entrance animation
    ref(li, "title").textContent = item.title;
    ref(li, "requester").textContent = item.requester;
    ref(li, "role").textContent = item.role;
    const tip = ref(li, "tip");
    tip.id = `tip-${item.id}`;
    ref(li, "badge").setAttribute("aria-describedby", tip.id);
    cardNodes.set(item.id, li);
    return li;
  }

  function renderCards() {
    const list = $("card-list");
    const rows = store.items.map((item, index) => {
      const scan = store.scan.get(item.id) ?? { hours: hoursBetween(item.since, clock.now()), level: 0, state: "ok" };
      return { item, scan, rule: store.rules[item.role], index };
    }).sort((a, b) => STATE_ORDER[a.scan.state] - STATE_ORDER[b.scan.state] || b.scan.hours - a.scan.hours);

    rows.forEach(({ item, scan, rule, index }, position) => {
      const li = ensureCard(item, index);
      const { hours, state } = scan;
      li.dataset.state = state;

      const badge = ref(li, "badge");
      badge.dataset.status = state;
      badge.textContent = BADGE_TEXT[state](hours, rule);
      ref(li, "tip").textContent = TIPS[state](hours, rule, item);

      ref(li, "role").textContent = item.role;
      ref(li, "elapsed").textContent = rule.enabled
        ? `has been asked for ${formatHours(hours)} of ${formatHours(rule.limitHours)}`
        : `has been asked for ${formatHours(hours)}`;
      ref(li, "limit").textContent = rule.enabled ? `Limit: ${formatHours(rule.limitHours)}` : "No limit set";

      const pct = rule.enabled ? Math.min(100, Math.round((hours / rule.limitHours) * 100)) : 0;
      const meter = ref(li, "meter");
      meter.setAttribute("aria-valuenow", String(pct));
      meter.style.setProperty("--pct", `${pct}%`);

      // The signatory's button stands out when something is overdue.
      const action = ref(li, "action");
      const breached = state === "breach";
      action.textContent = breached ? "Review sign-off" : "Open proposal";
      action.classList.toggle("btn-primary", breached);
      action.classList.toggle("btn-pulse", breached);
      action.classList.toggle("btn-ghost", !breached);

      // Per-card activity trail
      const entries = store.log.filter((l) => l.itemId === item.id);
      const countEl = ref(li, "count");
      if (countEl.textContent !== String(entries.length)) {
        countEl.textContent = String(entries.length);
        ref(li, "activity").replaceChildren(...entries.map((e) => {
          const row = document.createElement("li");
          const time = Object.assign(document.createElement("time"), { textContent: fmtStamp(e.at) });
          row.append(time, `${e.kind === "signatory" ? "To signatory: " : "To requester: "}${e.text}`);
          return row;
        }));
      }

      // Re-order only when the position actually changed (moving a node does not replay its animation).
      if (list.children[position] !== li) list.insertBefore(li, list.children[position] ?? null);
    });

    const breachedCount = rows.filter((r) => r.scan.state === "breach").length;
    $("cards-count").textContent = `${rows.length} pending · ${breachedCount} breached`;
    $("cards-empty").hidden = rows.length > 0;
    return breachedCount;
  }

  function renderBanner(breachedCount) {
    const banner = $("banner");
    const wasHidden = banner.hidden;
    banner.hidden = breachedCount === 0;
    if (breachedCount) {
      $("banner-text").textContent =
        `${breachedCount} sign-off${breachedCount > 1 ? "s are" : " is"} past the time limit.`;
      if (wasHidden) { banner.style.animation = "none"; void banner.offsetWidth; banner.style.animation = ""; }
    }
  }

  function renderLog() {
    const rows = store.log.filter((l) => logFilter === "all" || l.kind === logFilter);
    const tpl = $("log-template").content.firstElementChild;
    $("log").replaceChildren(...rows.map((entry) => {
      const li = tpl.cloneNode(true);
      li.dataset.kind = entry.kind;
      li.dataset.new = String(!renderedLogIds.has(entry.id) && renderedLogIds.size > 0);
      const kind = ref(li, "kind");
      kind.textContent = entry.kind === "signatory" ? "Signatory" : "Requester";
      kind.classList.add(entry.kind === "signatory" ? "badge-red" : "badge-ink");
      ref(li, "who").textContent = entry.who;
      ref(li, "text").textContent = entry.text;
      const time = ref(li, "time");
      time.textContent = fmtStamp(entry.at);
      time.dateTime = new Date(entry.at).toISOString();
      return li;
    }));
    renderedLogIds = new Set(store.log.map((l) => l.id));
    $("log-empty").hidden = rows.length > 0;
  }

  function renderJobStatus() {
    const last = job.lastRunAt ? `Last check ${new Date(job.lastRunAt).toLocaleTimeString()}.` : "No check yet.";
    const next = job.timerId && job.nextRunAt
      ? ` Next in ${Math.max(0, Math.ceil((job.nextRunAt - Date.now()) / 1000))} s.`
      : " Automatic checks are off.";
    $("job-status").textContent = last + next;
  }

  function renderClock() {
    const hours = Math.round(clock.offsetMs / HOUR);
    $("clock-label").textContent = `${new Date(clock.now()).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}${hours ? ` (+${formatHours(hours)})` : ""}`;
  }

  function renderConfig() {
    document.querySelectorAll("fieldset[data-role]").forEach((fs) => {
      const rule = store.rules[fs.dataset.role];
      const days = rule.limitHours % 24 === 0;
      fs.querySelector('[data-field="limit"]').value = String(days ? rule.limitHours / 24 : rule.limitHours);
      fs.querySelector('[data-field="unit"]').value = days ? "24" : "1";
      fs.querySelector('[data-field="repeat"]').value = String(rule.repeatHours);
      fs.querySelector('[data-field="enabled"]').setAttribute("aria-checked", String(rule.enabled));
    });
  }

  function renderAll() {
    renderBanner(renderCards());
    renderLog();
    renderClock();
    renderJobStatus();
  }

  const setAutoSwitch = (on) => $("auto-switch")?.setAttribute("aria-checked", String(on));

  /* ======================================================================
   * 7. Public helpers (also what the buttons call)
   * ==================================================================== */

  /** Change one role's limit. patch: { limitHours, repeatHours, enabled }. Returns { ok, error? }. */
  function setRule(role, patch) {
    if (!ROLES.includes(role)) return { ok: false, error: `Unknown role: ${role}` };
    const next = { ...store.rules[role], ...patch };
    const error = validateRule(next);
    if (error) return { ok: false, error };
    store.rules[role] = next;
    return { ok: true };
  }

  /** Add a pending approval (handy for testing). */
  function addItem({ title, requester, role, hoursAgo = 0 }) {
    const id = `p${store.items.length + 1}-${Math.random().toString(36).slice(2, 6)}`;
    store.items.push({ id, title, requester, role, since: clock.now() - hoursAgo * HOUR });
    return id;
  }

  /** Jump the demo clock forward, then check once. */
  function advanceClock(hours) {
    clock.offsetMs += hours * HOUR;
    return runCheck();
  }

  function resetDemo() {
    stopJob();
    clock.offsetMs = 0;
    store = createStore();
    cardNodes.clear();
    $("card-list").replaceChildren();
    toastStack().replaceChildren();
    renderedLogIds = new Set();
    job.lastRunAt = null;
    renderConfig();
    renderAll();
    if (autoWanted) startJob(job.everySec);
  }

  /* ======================================================================
   * 8. Wiring the page
   * ==================================================================== */
  const flagInvalid = (input, bad) =>
    bad ? input.setAttribute("aria-invalid", "true") : input.removeAttribute("aria-invalid");

  function readForm() {
    const next = {};
    for (const fs of document.querySelectorAll("fieldset[data-role]")) {
      const limitInput = fs.querySelector('[data-field="limit"]');
      const repeatInput = fs.querySelector('[data-field="repeat"]');
      const unit = Number(fs.querySelector('[data-field="unit"]').value);
      const patch = {
        limitHours: Math.round(Number(limitInput.value) * unit),
        repeatHours: Math.round(Number(repeatInput.value)),
        enabled: fs.querySelector('[data-field="enabled"]').getAttribute("aria-checked") === "true",
      };
      const error = validateRule(patch);
      flagInvalid(limitInput, /limit/i.test(error));
      flagInvalid(repeatInput, /Reminders/i.test(error));
      if (error) return { error: `${fs.dataset.role}: ${error}`, focus: /limit/i.test(error) ? limitInput : repeatInput };
      next[fs.dataset.role] = patch;
    }
    return { rules: next };
  }

  function init() {
    document.querySelectorAll('.switch[data-field="enabled"]').forEach((sw) =>
      sw.addEventListener("click", () => sw.setAttribute("aria-checked", String(sw.getAttribute("aria-checked") !== "true"))));

    $("cfg-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const { rules, error, focus } = readForm();
      const errorBox = $("cfg-error");
      if (error) { errorBox.textContent = error; errorBox.hidden = false; focus.focus(); return; }
      errorBox.hidden = true;
      ROLES.forEach((role) => setRule(role, rules[role]));
      const found = await runCheck();
      showToast({ kind: "info", title: "Limits saved", body: found ? `${found} new breach${found > 1 ? "es" : ""} found.` : "Checked everything. Nothing new to send." });
    });

    $("btn-run").addEventListener("click", async () => {
      const found = await runCheck();
      showToast({ kind: "info", title: "Check finished", body: found ? `${found} new breach${found > 1 ? "es" : ""} found.` : "Nothing new to send." });
    });

    document.querySelectorAll("[data-advance]").forEach((btn) =>
      btn.addEventListener("click", () => advanceClock(Number(btn.dataset.advance))));
    $("btn-reset").addEventListener("click", resetDemo);

    const autoSwitch = $("auto-switch");
    autoSwitch.addEventListener("click", () => {
      const turnOn = autoSwitch.getAttribute("aria-checked") !== "true";
      autoWanted = turnOn;
      turnOn ? startJob() : stopJob();
    });
    $("job-every").addEventListener("change", (e) => {
      if (autoSwitch.getAttribute("aria-checked") === "true") startJob(Number(e.target.value));
      else job.everySec = Number(e.target.value);
    });

    document.querySelectorAll("[data-filter]").forEach((btn) => btn.addEventListener("click", () => {
      logFilter = btn.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderLog();
    }));

    // Cheap 1-second ticker: clock + countdown text only (no scanning here).
    setInterval(() => { renderClock(); renderJobStatus(); }, 1000);
    window.addEventListener("pagehide", stopJob);

    renderConfig();
    runCheck({ silent: true }); // first scan on load: no toasts for old breaches
    startJob(job.everySec);
  }

  window.MimiThreshold = {
    getRules: () => structuredClone(store.rules),
    setRule, addItem, advanceClock, resetDemo,
    runCheck, startJob, stopJob,
  };

  init();
})();
