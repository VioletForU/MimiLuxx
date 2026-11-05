/* MimiLuxx US10 · Flagged announcements
   One classic script (no build step, works when you double-click the HTML).
   Sections, in order:
     1. Settings & helpers
     2. Validation          (pure function, used by the form AND the fake server)
     3. Fake API            (the ONLY part you replace when the real backend exists)
     4. State & rendering   (priority-sorted list)
     5. Form (create / edit)
     6. List actions        (edit, flag on/off, pin, delete + undo)
     7. Boot
*/
(() => {
  "use strict";

  /* ───────────── 1. SETTINGS & HELPERS ───────────── */

  const TZ = "Asia/Manila";
  const STORAGE_KEY = "mimiluxx.announcements.v1"; // bump the v1 if the data shape ever changes
  const PRIORITIES = {
    critical: { label: "Critical", rank: 0 },
    high: { label: "High", rank: 1 },
    normal: { label: "Normal", rank: 2 },
  };
  const AUDIENCES = {
    all: "All members",
    committee_leads: "Committee Leads",
    exec_approvers: "Exec Approvers",
  };
  const STATUS_LABEL = {
    active: "Active flag",
    scheduled: "Scheduled",
    disabled: "Disabled",
    draft: "Draft",
    expired: "Expired",
  };
  const LIMITS = { titleMin: 3, titleMax: 80, bodyMin: 10, bodyMax: 500 };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const uid = () =>
    (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
    "a" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  /* Dates. The form gives us "2026-11-05T14:30" with no timezone.
     We always read that as Philippine time (+08:00), so the page behaves the same
     on any computer. The string itself is what we store. */
  const DT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  const toMs = (s) => (s && DT.test(s) ? Date.parse(s + ":00+08:00") : NaN);
  const manilaParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  function toLocalString(ms) {
    const p = Object.fromEntries(manilaParts.formatToParts(ms).map((x) => [x.type, x.value]));
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  }
  const shortFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const fullFmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const yearOf = new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" });
  const pretty = (s) => {
    const ms = toMs(s);
    return (yearOf.format(ms) === yearOf.format(Date.now()) ? shortFmt : fullFmt).format(ms);
  };

  const slug = (t) =>
    t.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "announcement";

  /* ───────────── 2. VALIDATION ───────────── */

  /* values = { title, body, audience, priority, startsAt, expiresAt }
     opts   = { draft: bool, checkFuture: bool }
     returns { errors: {field: message}, clean: trimmed values } */
  function validate(values, { draft = false, checkFuture = true } = {}) {
    const errors = {};
    const clean = {
      ...values,
      title: String(values.title ?? "").trim().replace(/\s+/g, " "),
      body: String(values.body ?? "").trim(),
      startsAt: values.startsAt || "",
      expiresAt: values.expiresAt || "",
    };

    if (!clean.title) errors.title = "Give the announcement a title.";
    else if (clean.title.length < LIMITS.titleMin) errors.title = `Title needs at least ${LIMITS.titleMin} characters.`;
    else if (clean.title.length > LIMITS.titleMax) errors.title = `Title can be at most ${LIMITS.titleMax} characters.`;

    if (clean.body.length > LIMITS.bodyMax) errors.body = `Message can be at most ${LIMITS.bodyMax} characters.`;
    else if (!draft && !clean.body) errors.body = "Write the message members will read.";
    else if (!draft && clean.body.length < LIMITS.bodyMin) errors.body = `Message needs at least ${LIMITS.bodyMin} characters.`;

    if (!(clean.audience in AUDIENCES)) errors.audience = "Pick who should see this.";
    if (!(clean.priority in PRIORITIES)) errors.priority = "Pick a priority.";

    const s = clean.startsAt, e = clean.expiresAt;
    if ((s && !DT.test(s)) || (e && !DT.test(e))) errors.dates = "Enter a valid date and time.";
    else if (s && e && toMs(e) <= toMs(s)) errors.dates = "Expiry must be after the start time.";
    else if (!draft && checkFuture && e && toMs(e) <= Date.now()) errors.dates = "Expiry must be in the future.";

    return { errors, clean };
  }

  /* ───────────── 3. FAKE API ─────────────
     Pretends to be a server. It "stores" data in localStorage, waits a bit like a
     network, and can fail on purpose. The page only ever calls api.request(...).
     To go live, rewrite the body of request() with a real fetch() (see the guide). */

  class ApiError extends Error {
    constructor(status, message, errors) {
      super(message);
      this.status = status;
      this.errors = errors || null;
    }
  }

  const memoryDb = { items: null }; // used only if localStorage is blocked (private mode)
  const db = {
    read() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return memoryDb.items;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.v === 1 && Array.isArray(parsed.items)) return parsed.items.filter((a) => a && a.id && typeof a.title === "string");
        return null;
      } catch { return memoryDb.items; }
    },
    write(items) {
      memoryDb.items = items;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items })); } catch { /* storage full or blocked: memory copy still works */ }
    },
  };

  const sim = { fail: false };

  /* what the page sends  →  what the server stores */
  function toPayload(c, { draft }) {
    return {
      title: c.title,
      body: c.body,
      priority: c.priority,
      audience: c.audience,
      flag: { key: slug(c.title), enabled: c.flagOn },
      schedule: { startsAt: c.startsAt || null, expiresAt: c.expiresAt || null, timezone: TZ },
      status: draft ? "draft" : "published",
    };
  }
  function applyPatch(r, b) {
    const o = { ...r };
    for (const k of ["title", "body", "priority", "audience", "pinned"]) if (k in b) o[k] = b[k];
    if (b.flag && "enabled" in b.flag) o.flagOn = b.flag.enabled;
    if (b.schedule) {
      if ("startsAt" in b.schedule) o.startsAt = b.schedule.startsAt || "";
      if ("expiresAt" in b.schedule) o.expiresAt = b.schedule.expiresAt || "";
    }
    if ("status" in b) o.draft = b.status === "draft";
    o.updatedAt = new Date().toISOString();
    return o;
  }

  function serve(method, id, body) {
    const rows = db.read() || [];
    const find = () => rows.findIndex((r) => r.id === id);

    if (method === "GET" && !id) return { status: 200, data: rows };

    if (method === "POST" && !id) {
      const { errors, clean } = validate(
        { title: body.title, body: body.body, audience: body.audience, priority: body.priority,
          startsAt: body.schedule?.startsAt, expiresAt: body.schedule?.expiresAt },
        { draft: body.status === "draft" }
      );
      if (Object.keys(errors).length) throw new ApiError(422, "Some fields need fixing.", errors);
      let key = body.flag?.key || slug(clean.title), n = 2;
      while (rows.some((r) => r.flagKey === key)) key = `${slug(clean.title)}-${n++}`;
      const now = new Date().toISOString();
      const rec = {
        id: uid(), flagKey: key, flagOn: !!body.flag?.enabled, draft: body.status === "draft", pinned: false,
        title: clean.title, body: clean.body, priority: clean.priority, audience: clean.audience,
        startsAt: clean.startsAt, expiresAt: clean.expiresAt, createdAt: now, updatedAt: now,
      };
      rows.push(rec); db.write(rows);
      return { status: 201, data: rec };
    }

    if (method === "PATCH" && id) {
      const i = find();
      if (i < 0) throw new ApiError(404, "That announcement no longer exists.");
      const next = applyPatch(rows[i], body);
      const { errors, clean } = validate(next, { draft: next.draft, checkFuture: false });
      if (Object.keys(errors).length) throw new ApiError(422, "Some fields need fixing.", errors);
      rows[i] = { ...next, title: clean.title, body: clean.body };
      db.write(rows);
      return { status: 200, data: rows[i] };
    }

    if (method === "PUT" && id) { // restore (used by Undo)
      const i = find();
      if (i >= 0) rows[i] = body; else rows.push(body);
      db.write(rows);
      return { status: 200, data: body };
    }

    if (method === "DELETE" && id) {
      const i = find();
      if (i < 0) throw new ApiError(404, "That announcement no longer exists.");
      rows.splice(i, 1); db.write(rows);
      return { status: 200, data: { id } };
    }
    throw new ApiError(405, "Unsupported request.");
  }

  const payloadOut = () => $("#payload-out");
  const api = {
    async request(method, path, body) {
      const [, id] = path.match(/^\/api\/announcements(?:\/([^/]+))?$/) || [];
      const log = (extra) => {
        const out = payloadOut();
        if (out && method !== "GET") out.textContent = `${method} ${path}\n${body ? JSON.stringify(body, null, 2) : ""}${extra ? "\n\n" + extra : ""}`;
      };
      log("…waiting for response");
      await sleep(method === "GET" ? 250 : 450 + Math.random() * 350); // pretend network
      try {
        if (sim.fail && method !== "GET") throw new ApiError(503, "The server is unavailable. Please try again.");
        const res = serve(method, id, body);
        log(`← ${res.status} OK`);
        return res.data;
      } catch (err) {
        if (!(err instanceof ApiError)) throw err;
        log(`← ${err.status} ${err.message}` + (err.errors ? "\n" + JSON.stringify(err.errors, null, 2) : ""));
        throw err;
      }
    },
  };

  /* ───────────── 4. STATE & RENDERING ───────────── */

  let items = [];
  let filter = "all";
  let firstPaint = true;
  const pending = new Set(); // ids with a request in flight
  let editingId = null;

  /* Status is computed from the data every time, so a scheduled item turns
     "Active" by itself when its start time passes. */
  function statusOf(a, now = Date.now()) {
    if (a.draft) return "draft";
    if (!a.flagOn) return "disabled";
    if (a.expiresAt && toMs(a.expiresAt) <= now) return "expired";
    if (a.startsAt && toMs(a.startsAt) > now) return "scheduled";
    return "active";
  }

  /* THE SORT RULE: pinned first, then Critical > High > Normal, then newest first. */
  function compare(a, b) {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    const r = (PRIORITIES[a.priority]?.rank ?? 9) - (PRIORITIES[b.priority]?.rank ?? 9);
    if (r) return r;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  }

  function whenText(a, st) {
    const s = a.startsAt, e = a.expiresAt;
    if (s && toMs(s) > Date.now()) return `Starts ${pretty(s)}`;
    if (e) return toMs(e) <= Date.now() ? `Ended ${pretty(e)}` : `Ends ${pretty(e)}`;
    if (s) return `Started ${pretty(s)}`;
    return "No dates set";
  }

  const listEl = () => $("#flag-list");
  const tpl = () => $("#flag-template");

  function ref(card, name) { return $(`[data-ref="${name}"]`, card); }

  function fillCard(card, a, st) {
    const d = card.dataset;
    d.id = a.id; d.priority = a.priority; d.status = st; d.pinned = String(!!a.pinned);
    d.editing = String(a.id === editingId);
    if (pending.has(a.id)) card.setAttribute("aria-busy", "true"); else card.removeAttribute("aria-busy");

    ref(card, "pin").hidden = !a.pinned;
    const pb = ref(card, "priority");
    pb.className = "badge badge-" + a.priority;
    pb.textContent = PRIORITIES[a.priority]?.label ?? a.priority;
    const sb = ref(card, "status");
    sb.className = "badge badge-" + st;
    sb.textContent = STATUS_LABEL[st];

    ref(card, "title").textContent = a.title;
    const body = ref(card, "body");
    body.textContent = a.body || "No message yet.";
    ref(card, "audience").textContent = AUDIENCES[a.audience] ?? a.audience;
    ref(card, "when").textContent = whenText(a, st);
    ref(card, "menuLabel").setAttribute("aria-label", `Actions for ${a.title}`);
    ref(card, "flagText").textContent = a.draft ? "Publish" : a.flagOn ? "Turn flag off" : "Turn flag on";
    ref(card, "flagIcon").setAttribute("href", a.draft ? "#i-send" : "#i-flag");
    ref(card, "pinText").textContent = a.pinned ? "Unpin" : "Pin to top";
  }

  function render() {
    const now = Date.now();
    const view = items.slice().sort(compare).map((a) => ({ a, st: statusOf(a, now) }));

    // counts on the filter chips
    const counts = { all: view.length, active: 0, scheduled: 0, disabled: 0, draft: 0, expired: 0 };
    view.forEach((v) => counts[v.st]++);
    $$("[data-count-for]").forEach((el) => (el.textContent = counts[el.dataset.countFor] ?? 0));
    $("#list-total").textContent = view.length;
    $$("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));

    const shown = filter === "all" ? view : view.filter((v) => v.st === filter);
    const list = listEl();
    const existing = new Map($$(":scope > li[data-id]", list).map((li) => [li.dataset.id, li]));

    // keyed update: reuse each card, so open menus and animations are not disturbed
    let cursor = list.firstElementChild;
    shown.forEach(({ a, st }, i) => {
      let card = existing.get(a.id);
      if (card) existing.delete(a.id);
      else {
        card = tpl().content.firstElementChild.cloneNode(true);
        if (firstPaint) card.style.setProperty("--i", String(i));
      }
      fillCard(card, a, st);
      if (card === cursor) cursor = cursor.nextElementSibling;
      else list.insertBefore(card, cursor);
    });
    existing.forEach((li) => li.remove());
    firstPaint = false;

    list.hidden = shown.length === 0;
    const empty = $("#list-empty");
    empty.hidden = shown.length !== 0;
    empty.textContent = view.length === 0
      ? "No announcements yet. Fill in the form to create the first one."
      : "Nothing matches this filter.";
  }

  function setItems(next) { items = next; render(); }
  function upsert(rec) {
    const i = items.findIndex((x) => x.id === rec.id);
    setItems(i < 0 ? [...items, rec] : items.map((x) => (x.id === rec.id ? rec : x)));
  }

  /* ───────────── toasts, dialog, announcements for screen readers ───────────── */

  function toast(message, { kind = "ok", action, timeout = 5000 } = {}) {
    const el = document.createElement("div");
    el.className = "toast";
    el.dataset.kind = kind;
    const text = document.createElement("span");
    text.textContent = message;
    el.append(text);
    const close = () => {
      if (!el.isConnected) return;
      el.dataset.leaving = "true";
      setTimeout(() => el.remove(), 320);
    };
    if (action) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "toast-action"; b.textContent = action.label;
      b.addEventListener("click", () => { close(); action.run(); });
      el.append(b);
    }
    $("#toast-stack").append(el);
    setTimeout(close, timeout);
  }
  const say = (t) => { const s = $("#sr-live"); s.textContent = ""; setTimeout(() => (s.textContent = t), 30); };

  function confirmDialog({ title, body, ok = "Confirm" }) {
    const dlg = $("#confirm-dialog");
    if (!dlg.showModal) return Promise.resolve(window.confirm(body));
    $("#confirm-title").textContent = title;
    $("#confirm-body").textContent = body;
    $("#confirm-ok").textContent = ok;
    return new Promise((resolve) => {
      const ac = new AbortController();
      const done = (v) => { ac.abort(); dlg.close(); resolve(v); };
      $("#confirm-ok").addEventListener("click", () => done(true), { signal: ac.signal });
      $("#confirm-cancel").addEventListener("click", () => done(false), { signal: ac.signal });
      dlg.addEventListener("cancel", (e) => { e.preventDefault(); done(false); }, { signal: ac.signal });
      dlg.showModal();
      $("#confirm-cancel").focus();
    });
  }

  /* ───────────── 5. FORM (create / edit) ───────────── */

  const form = () => $("#flag-form");
  const F = {
    title: () => $("#f-title"), body: () => $("#f-body"), audience: () => $("#f-audience"),
    priority: () => $("#f-priority"), flag: () => $("#f-flag"),
    starts: () => $("#f-starts"), expires: () => $("#f-expires"),
  };
  // which inputs / error line belong to which validation key
  const FIELD_MAP = {
    title: { inputs: () => [F.title()], err: "#err-title" },
    body: { inputs: () => [F.body()], err: "#err-body" },
    audience: { inputs: () => [F.audience()], err: "#err-audience" },
    priority: { inputs: () => [F.priority()], err: "#err-priority" },
    dates: { inputs: () => [F.starts(), F.expires()], err: "#err-dates" },
  };

  let attempted = false;   // after the first failed submit we validate live
  let lastMode = "publish";

  function readForm() {
    return {
      title: F.title().value,
      body: F.body().value,
      audience: F.audience().value,
      priority: ($("input[name=priority]:checked", form()) || {}).value || "",
      flagOn: F.flag().getAttribute("aria-checked") === "true",
      startsAt: F.starts().value,
      expiresAt: F.expires().value,
    };
  }

  function writeForm(a) {
    F.title().value = a.title;
    F.body().value = a.body;
    F.audience().value = a.audience;
    const r = $(`input[name=priority][value="${a.priority}"]`, form());
    if (r) r.checked = true;
    setSwitch(a.flagOn);
    F.starts().value = a.startsAt || "";
    F.expires().value = a.expiresAt || "";
    updateCounters();
  }

  function setSwitch(on) {
    F.flag().setAttribute("aria-checked", String(on));
    $("#flag-label").textContent = on ? "Flag is on" : "Flag is off";
  }

  function updateCounters() {
    $$("[data-count]").forEach((el) => {
      const src = el.dataset.count === "title" ? F.title() : F.body();
      el.textContent = src.value.length;
    });
  }

  function showErrors(errors) {
    for (const [key, cfg] of Object.entries(FIELD_MAP)) {
      const msg = errors[key];
      const err = $(cfg.err);
      cfg.inputs().forEach((el) => (msg ? el.setAttribute("aria-invalid", "true") : el.removeAttribute("aria-invalid")));
      err.hidden = !msg;
      err.replaceChildren();
      if (msg) {
        const ic = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        ic.setAttribute("class", "size-4 shrink-0");
        ic.setAttribute("fill", "none"); ic.setAttribute("stroke", "currentColor"); ic.setAttribute("stroke-width", "2");
        ic.setAttribute("aria-hidden", "true");
        const u = document.createElementNS("http://www.w3.org/2000/svg", "use");
        u.setAttribute("href", "#i-alert");
        ic.append(u);
        err.append(ic, document.createTextNode(msg));
      }
    }
  }

  function showFormError(msg) {
    const el = $("#form-error");
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function setBusy(btn, busy) {
    const all = [$("#btn-publish"), $("#btn-draft"), $("#btn-cancel")];
    all.forEach((b) => (b.disabled = busy));
    if (busy) {
      btn.setAttribute("aria-busy", "true");
      btn.textContent = "Saving…";
    } else {
      btn.removeAttribute("aria-busy");
      btn.textContent = btn.dataset.label;
    }
    // disabled buttons drop focus; the labels above keep the screen reader informed
  }

  function enterEditMode(a) {
    editingId = a.id;
    $("#form-title").textContent = "Edit announcement";
    $("#btn-publish").dataset.label = "Save changes";
    $("#btn-publish").textContent = "Save changes";
    $("#btn-cancel").textContent = "Cancel edit";
    writeForm(a);
    attempted = false;
    showErrors({}); showFormError("");
    render();
  }

  function leaveEditMode() {
    editingId = null;
    $("#form-title").textContent = "New announcement";
    $("#btn-publish").dataset.label = "Publish";
    $("#btn-publish").textContent = "Publish";
    $("#btn-cancel").textContent = "Clear";
    form().reset();
    setSwitch(true);
    updateCounters();
    attempted = false;
    showErrors({}); showFormError("");
    render();
  }

  async function submit(mode, btn) {
    if ($("#btn-publish").disabled) return; // already saving
    lastMode = mode;
    const draft = mode === "draft";
    const { errors, clean } = validate(readForm(), { draft });
    attempted = true;
    showErrors(errors);
    showFormError("");
    const bad = Object.keys(errors);
    if (bad.length) {
      const first = FIELD_MAP[bad[0]].inputs()[0];
      (first.matches("fieldset") ? $("input", first) : first).focus();
      say(`${bad.length} ${bad.length === 1 ? "problem" : "problems"} to fix: ${bad.map((k) => errors[k]).join(" ")}`);
      return;
    }

    const payload = toPayload(clean, { draft });
    const editing = editingId;
    setBusy(btn, true);
    try {
      const rec = editing
        ? await api.request("PATCH", `/api/announcements/${editing}`, payload)
        : await api.request("POST", "/api/announcements", payload);
      upsert(rec);
      toast(editing ? "Changes saved." : draft ? "Draft saved." : "Announcement published.");
      say(editing ? "Changes saved." : draft ? "Draft saved." : "Announcement published.");
      leaveEditMode();
      F.title().focus();
    } catch (err) {
      if (err instanceof ApiError && err.errors) { showErrors(err.errors); showFormError(err.message); }
      else showFormError(err.message || "Something went wrong. Please try again.");
      toast("Could not save. Your text is still in the form.", { kind: "error" });
    } finally {
      setBusy(btn, false);
    }
  }

  function bindForm() {
    const f = form();
    f.addEventListener("submit", (e) => { e.preventDefault(); submit("publish", $("#btn-publish")); });
    $("#btn-draft").addEventListener("click", () => submit("draft", $("#btn-draft")));
    $("#btn-cancel").addEventListener("click", () => {
      if (editingId) leaveEditMode();
      else { f.reset(); setSwitch(true); updateCounters(); attempted = false; showErrors({}); showFormError(""); F.title().focus(); }
    });
    F.flag().addEventListener("click", () => setSwitch(F.flag().getAttribute("aria-checked") !== "true"));
    f.addEventListener("input", () => {
      updateCounters();
      if (attempted) showErrors(validate(readForm(), { draft: lastMode === "draft" }).errors);
    });
    f.addEventListener("change", () => {
      if (attempted) showErrors(validate(readForm(), { draft: lastMode === "draft" }).errors);
    });
    $("#sim-fail").addEventListener("change", (e) => (sim.fail = e.target.checked));
  }

  /* ───────────── 6. LIST ACTIONS ───────────── */

  async function mutate(id, run) {
    if (pending.has(id)) return;
    pending.add(id); render();
    try { return await run(); }
    catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setItems(items.filter((x) => x.id !== id));
        if (editingId === id) leaveEditMode();
      }
      toast(err.message || "Something went wrong.", { kind: "error" });
    } finally { pending.delete(id); render(); }
  }

  const actions = {
    edit(a) {
      enterEditMode(a);
      F.title().scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      F.title().focus({ preventScroll: true });
    },

    flag(a) {
      if (a.draft) {
        // publishing a draft needs a complete message, so check first
        const { errors } = validate(a, { draft: false, checkFuture: false });
        if (errors.body || errors.title) {
          toast("Add a message before publishing this draft.", { kind: "error" });
          return actions.edit(a);
        }
      }
      const patch = a.draft ? { status: "published", flag: { enabled: true } } : { flag: { enabled: !a.flagOn } };
      return mutate(a.id, async () => {
        upsert(await api.request("PATCH", `/api/announcements/${a.id}`, patch));
        const msg = a.draft ? "Published." : a.flagOn ? "Flag turned off." : "Flag turned on.";
        toast(msg); say(msg);
      });
    },

    pin(a) {
      return mutate(a.id, async () => {
        upsert(await api.request("PATCH", `/api/announcements/${a.id}`, { pinned: !a.pinned }));
        say(a.pinned ? "Unpinned." : "Pinned to top.");
      });
    },

    async delete(a) {
      const ok = await confirmDialog({
        title: "Delete this announcement?",
        body: `“${a.title}” will be removed. You can undo right after.`,
        ok: "Delete",
      });
      if (!ok) return;
      return mutate(a.id, async () => {
        await api.request("DELETE", `/api/announcements/${a.id}`);
        setItems(items.filter((x) => x.id !== a.id));
        if (editingId === a.id) leaveEditMode();
        say("Deleted.");
        toast(`Deleted “${a.title}”.`, {
          timeout: 7000,
          action: {
            label: "Undo",
            run: () => api.request("PUT", `/api/announcements/${a.id}`, a)
              .then((rec) => { upsert(rec); say("Restored."); })
              .catch(() => toast("Could not restore it.", { kind: "error" })),
          },
        });
      });
    },
  };

  function bindList() {
    listEl().addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const card = btn.closest("li[data-id]");
      const a = items.find((x) => x.id === card.dataset.id);
      if (!a) return;
      btn.closest("details")?.removeAttribute("open");
      actions[btn.dataset.action](a);
    });

    // close an open ⋯ menu on outside click or Escape
    document.addEventListener("click", (e) => {
      $$("details.menu[open]").forEach((d) => { if (!d.contains(e.target)) d.removeAttribute("open"); });
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      const open = $("details.menu[open]");
      if (open) { open.removeAttribute("open"); $("summary", open).focus(); }
    });

    $$("[data-filter]").forEach((b) =>
      b.addEventListener("click", () => {
        filter = b.dataset.filter;
        render();
        const n = $$(":scope > li", listEl()).length;
        say(`${n} ${n === 1 ? "announcement" : "announcements"} shown.`);
      })
    );

    $("#btn-reset").addEventListener("click", async () => {
      const ok = await confirmDialog({ title: "Reset demo data?", body: "This replaces everything with the sample announcements.", ok: "Reset" });
      if (!ok) return;
      db.write(seed());
      if (editingId) leaveEditMode();
      firstPaint = true;
      $$(":scope > li", listEl()).forEach((li) => li.remove());
      setItems(db.read());
    });
  }

  /* ───────────── 7. BOOT ───────────── */

  function seed() {
    const H = 3600e3, D = 24 * H, now = Date.now();
    const at = (ms) => toLocalString(now + ms);
    const rows = [
      ["Server maintenance tonight", "The portal will be offline from 11 PM to 1 AM. Please submit pending sign-offs before then.", "critical", "all", { pinned: true, s: -1 * H, e: 5 * H }],
      ["Enrollment deadline moved", "The enrollment deadline is now Nov 8. Officers must finalize rosters by then.", "critical", "committee_leads", { s: -1 * D, e: 3 * D }],
      ["Officer applications open", "Applications for next term's officers open this Wednesday. Share with your committees.", "high", "all", { s: 2 * D, e: 9 * D }],
      ["Tech talk volunteers needed", "We need five volunteers for registration and ushering. Reply with your availability.", "high", "all", { s: -2 * D, e: 7 * D }],
      ["Org shirt pre-orders", "Pre-orders close Friday. Sizes are listed on the order sheet.", "normal", "all", { s: -3 * D, e: 2 * D }],
      ["Old poll reminder", "Reminder to vote on the meeting day poll. Turned off after the poll closed.", "normal", "all", { off: true, s: -12 * D, e: -8 * D }],
      ["Budget review notes", "Notes for the finance committee. Not published yet.", "normal", "exec_approvers", { draft: true, off: true }],
    ];
    return rows.map(([title, body, priority, audience, o], i) => {
      const created = new Date(now - i * H).toISOString();
      return {
        id: uid(), flagKey: slug(title), flagOn: !o.off, draft: !!o.draft, pinned: !!o.pinned,
        title, body, priority, audience,
        startsAt: o.s != null ? at(o.s) : "", expiresAt: o.e != null ? at(o.e) : "",
        createdAt: created, updatedAt: created,
      };
    });
  }

  async function boot() {
    bindForm();
    bindList();
    setSwitch(true);
    updateCounters();

    if (db.read() === null) db.write(seed());   // first visit: demo data
    try {
      items = await api.request("GET", "/api/announcements");
    } catch {
      toast("Could not load announcements.", { kind: "error" });
      items = [];
    }
    $("#list-loading").hidden = true;
    render();

    // another browser tab changed the data → refresh this one
    window.addEventListener("storage", (e) => {
      if (e.key !== STORAGE_KEY) return;
      items = db.read() || [];
      if (editingId && !items.some((x) => x.id === editingId)) leaveEditMode();
      render();
    });
    // scheduled items flip to Active / Expired by themselves
    setInterval(render, 30000);

    // small handle for the console and for tests
    window.MimiFlags = {
      list: () => items.map((x) => ({ ...x, status: statusOf(x) })),
      simulate: { fail: (v = true) => { sim.fail = !!v; $("#sim-fail").checked = !!v; } },
      validate,
    };
    document.dispatchEvent(new CustomEvent("flags:ready"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
