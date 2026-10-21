// Upozornění (Web Push). Telefon si v Nastavení zapne odběr, odběr se uloží do
// databáze pod pairs/<kód>/push/subs/<id>. Posílá je GitHub Action
// (scripts/notify.mjs) každých 15 minut. Funguje jen se zapnutým Firebase.
// Na iPhonu jen po přidání appky na plochu (iOS 16.4+).
window.Push = (function () {
  // Veřejný VAPID klíč. Soukromý je jen v GitHub Secretu VAPID_PRIVATE_KEY.
  const VAPID_PUBLIC = "__VAPID_PUBLIC__";
  const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
  const DEFAULT_PREFS = { reminders: true, messages: true, reactions: true, sessions: true };

  const supported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  let reg = null, sub = null, subId = null, ready = false, busy = false;

  function b64urlToBytes(s) {
    const pad = "=".repeat((4 - s.length % 4) % 4);
    const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  async function idFor(endpoint) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
    return Array.from(new Uint8Array(h)).slice(0, 12).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // Zaregistruje service worker hned po startu (i kvůli instalaci na plochu).
  async function init(onChange) {
    if (!("serviceWorker" in navigator)) return;
    try {
      reg = await navigator.serviceWorker.register("sw.js");
      if (supported()) {
        sub = await reg.pushManager.getSubscription();
        subId = sub ? await idFor(sub.endpoint) : null;
      }
    } catch (e) { console.warn("Service worker", e); }
    ready = true;
    onChange && onChange();
  }

  async function enable(ctx) {
    if (busy) return; busy = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { ctx.toast("Upozornění nejsou povolená v prohlížeči"); return; }
      reg = reg || await navigator.serviceWorker.register("sw.js");
      await navigator.serviceWorker.ready;
      sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlToBytes(VAPID_PUBLIC) });
      subId = await idFor(sub.endpoint);
      const prev = ctx.subs()[subId];
      await ctx.store.set(`${ctx.base}/push/subs/${subId}`, {
        role: ctx.role, sub: sub.toJSON(), prefs: (prev && prev.prefs) || DEFAULT_PREFS,
        device: navigator.userAgent.slice(0, 120), createdAt: (prev && prev.createdAt) || Date.now(), updatedAt: Date.now()
      });
      ctx.toast("Upozornění zapnutá");
    } catch (e) { console.error(e); ctx.toast("Zapnutí se nepovedlo"); }
    finally { busy = false; ctx.render(); }
  }

  async function disable(ctx) {
    try {
      if (subId) await ctx.store.remove(`${ctx.base}/push/subs/${subId}`);
      if (sub) await sub.unsubscribe();
    } catch (e) { console.error(e); }
    sub = null; subId = null; ctx.toast("Upozornění vypnutá"); ctx.render();
  }

  // ctx: { store, base, role, cloud, profile, subs(), esc, toast, render, isPartner }
  function renderSection(ctx) {
    const head = `<h2>Upozornění</h2>`;
    if (!ctx.cloud) return `<section class="section card" style="display:grid;gap:12px">${head}<p class="small muted">Upozornění fungují jen se zapnutým Firebase.</p></section>`;
    if (isIOS() && !standalone()) return `<section class="section card" style="display:grid;gap:12px">${head}
      <div class="note">Na iPhonu fungují upozornění jen z appky na ploše: v Safari klepni na <strong>Sdílet</strong> → <strong>Přidat na plochu</strong> a appku otevři odtud.</div></section>`;
    if (VAPID_PUBLIC.startsWith("__")) return `<section class="section card" style="display:grid;gap:12px">${head}<p class="small muted">Upozornění ještě nejsou nastavená (chybí klíč, viz docs/NOTIFICATIONS.md).</p></section>`;
    if (!supported()) return `<section class="section card" style="display:grid;gap:12px">${head}<p class="small muted">Tento prohlížeč upozornění neumí.</p></section>`;
    if (!ready) return `<section class="section card">${head}<p class="small muted">Načítám…</p></section>`;

    const mine = subId && ctx.subs()[subId];
    const denied = Notification.permission === "denied";
    const prefs = Object.assign({}, DEFAULT_PREFS, mine && mine.prefs);
    const p = ctx.profile();
    const days = Array.isArray(p.reminderDays) ? p.reminderDays : [0, 1, 2, 3, 4, 5, 6];
    const hour = Number.isInteger(p.reminderHour) ? p.reminderHour : 18;
    const opts = ctx.isPartner()
      ? [["sessions", "Nový trénink"], ["messages", "Nová zpráva"], ["reactions", "Reakce na trénink"]]
      : [["reminders", "Připomínka tréninku"], ["messages", "Vzkaz od parťáka"], ["reactions", "Reakce na trénink"]];
    const others = Object.values(ctx.subs()).filter(s => s && s.role !== ctx.role).length;

    return `<section class="section card" style="display:grid;gap:12px">
      ${head}
      ${denied ? `<div class="note">Upozornění jsou v prohlížeči zablokovaná. Povol je v nastavení webu a zkus to znovu.</div>` : ""}
      ${mine
        ? `<div class="kv"><span>Tento telefon</span><span class="chip ok">zapnuto</span></div>
           <div class="list">${opts.map(([k, l]) => `<label class="check"><input type="checkbox" data-pushpref="${k}" ${prefs[k] ? "checked" : ""}> ${ctx.esc(l)}</label>`).join("")}</div>
           ${ctx.isPartner() ? "" : `<div class="field"><div class="lab">Připomínka ve dnech</div>
             <div class="seg days">${DAY_NAMES.map((d, i) => `<button type="button" data-remday="${i}" class="${days.includes(i) ? "on" : ""}">${d}</button>`).join("")}</div></div>
             <div class="field"><label for="p-hour">V kolik</label><select id="p-hour">${Array.from({ length: 24 }, (_, i) => i).map(h => `<option value="${h}" ${h === hour ? "selected" : ""}>${h}:00</option>`).join("")}</select>
             <p class="small muted">Jen když ten den ještě nemáš trénink a týden není splněný.</p></div>`}
           <button class="btn btn-ghost" id="push-off" type="button">Vypnout na tomto telefonu</button>`
        : `<p class="small muted">${ctx.isPartner() ? "Dostaneš upozornění, když přibude trénink nebo zpráva." : "Denní připomínka tréninku a upozornění na vzkazy od parťáka."}</p>
           <button class="btn btn-primary" id="push-on" type="button" ${denied ? "disabled" : ""}>Zapnout upozornění</button>`}
      <p class="small muted">Chodí se zpožděním do 15–20 minut.${others ? ` Druhá strana má zapnuto na ${others} ${others === 1 ? "zařízení" : "zařízeních"}.` : ""}</p>
    </section>`;
  }

  function bind(ctx, root) {
    const on = root.querySelector("#push-on"); if (on) on.onclick = () => enable(ctx);
    const off = root.querySelector("#push-off"); if (off) off.onclick = () => disable(ctx);
    root.querySelectorAll("[data-pushpref]").forEach(c => c.onchange = () => {
      if (subId) ctx.store.set(`${ctx.base}/push/subs/${subId}/prefs/${c.dataset.pushpref}`, c.checked);
    });
    root.querySelectorAll("[data-remday]").forEach(b => b.onclick = () => {
      const p = ctx.profile(), i = Number(b.dataset.remday);
      const cur = Array.isArray(p.reminderDays) ? p.reminderDays : [0, 1, 2, 3, 4, 5, 6];
      const next = cur.includes(i) ? cur.filter(x => x !== i) : cur.concat(i).sort();
      ctx.store.set(`${ctx.base}/profile/reminderDays`, next.length ? next : []);
    });
    const hr = root.querySelector("#p-hour"); if (hr) hr.onchange = () => ctx.store.set(`${ctx.base}/profile/reminderHour`, Number(hr.value));
  }

  return { init, renderSection, bind };
})();
