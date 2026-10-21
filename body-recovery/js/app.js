/* Tělo zpět: aplikační logika. Vanilla JS, žádný build. */
(function () {
  "use strict";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("telo-zpet:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("telo-zpet:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  /* ---------- datum ---------- */
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, "0");
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const todayISO = () => toISO(new Date());
  function startOfWeek(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  const weekKey = iso => toISO(startOfWeek(fromISO(iso)));
  const fmtShort = iso => { const d = fromISO(iso); return `${d.getDate()}.${d.getMonth() + 1}.`; };
  const DAYS = ["neděle", "pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota"];
  function fmtLong(iso) { const d = fromISO(iso); const t = todayISO(); if (iso === t) return "dnes"; if (iso === toISO(new Date(Date.now() - DAY))) return "včera"; return `${DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`; }
  const fmtTime = ts => { const d = new Date(ts); return `${d.getDate()}.${d.getMonth() + 1}. ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const daysBetween = (a, b) => Math.round((fromISO(b) - fromISO(a)) / DAY);
  function plural(n, one, few, many) { return n === 1 ? one : (n >= 2 && n <= 4) ? few : many; }

  /* ---------- stav ---------- */
  const params = new URLSearchParams(location.search);
  let pair = params.get("pair") || LS.get("pair", null);
  if (!pair) { pair = Math.random().toString(36).slice(2, 8).toUpperCase(); }
  LS.set("pair", pair);
  if (params.get("pair") || params.get("tab")) history.replaceState(null, "", location.pathname);

  const store = window.createStore();
  const BASE = `pairs/${pair}`;
  const EMPTY = { profile: null, sessions: null, messages: null, reactions: null, plan: null, everyday: null };
  const state = {
    role: LS.get("role", null),            // "patient" | "partner"
    tab: params.get("tab") || LS.get("tab", "home"),
    data: { ...EMPTY },
    connected: store.mode === "local",
    draft: LS.get("draft", null),
    openEx: {},
    showAllWeeks: false,
    showAllEx: false,
    showSteps: LS.get("showSteps", true),
    timer: null,                           // { ex, total, left, sets, endsAt, draft }
    lastSeenMsg: LS.get("lastSeenMsg", 0)
  };

  /* ---------- plán ---------- */
  // Plán z databáze má přednost před vestavěným, pokud má týdny i cviky.
  function plan() {
    const db = state.data.plan;
    const valid = db && typeof db === "object" && Array.isArray(db.weeks) && db.weeks.length && db.exercises && typeof db.exercises === "object";
    return valid ? Object.assign({}, window.PLAN, db) : window.PLAN;
  }
  const planSource = () => plan() === window.PLAN ? "built-in" : "db";
  const exName = id => plan().exercises[id]?.name || id;
  // Týden má sestavy, které se střídají dokola (days: A, B, C); plán bez nich má jen items.
  function weekDays(w) { return Array.isArray(w.days) && w.days.length ? w.days : [{ id: "", short: "", title: "", items: w.items || [] }]; }
  const dayOf = (w, id) => weekDays(w).find(x => x.id === id) || weekDays(w)[0];
  // Na řadě je sestava po té z posledního tréninku podle plánu.
  function nextDayId(w) { const ds = weekDays(w), last = sessions().find(s => !isJoker(s) && s.day); const i = last ? ds.findIndex(x => x.id === last.day) : -1; return ds[(i + 1) % ds.length].id; }
  const dayLabel = D => D.id ? `${D.id} · ${D.short || D.title}` : "";
  function itemTarget(it) {
    const main = it.time ? `${it.sets} × ${it.time}` : `${it.sets} × ${it.reps}`;
    return main + (it.hold ? `, výdrž ${it.hold}` : "");
  }
  function planForDb() {
    const p = window.PLAN;
    return { version: p.version, name: p.name, weeklyGoal: p.weeklyGoal, jokers: p.jokers || null, source: p.source || null, phases: p.phases, rules: p.rules, exercises: p.exercises, weeks: p.weeks, cheers: p.cheers, uploadedAt: Date.now() };
  }
  // Poslední zapsaná zátěž u cviku, pro nápovědu a progresi.
  function lastKg(id) { const s = sessions().find(s => Number(s.exercises?.[id]?.kg) > 0); return s ? Number(s.exercises[id].kg) : null; }
  // Žolíci: jiná aktivita místo tréninku z plánu.
  function jokers() { const P = plan(); return Array.isArray(P.jokers) ? P.jokers : []; }
  const jokerById = id => jokers().find(j => j.id === id) || null;
  const jokerName = J => plan().exercises[J.ex]?.name || J.short;
  const isJoker = s => !!jokerById(s.kind);
  const safeLink = u => /^https:\/\/[^\s"<>]+$/.test(u || "") ? u : "";

  const profile = () => Object.assign({ patientName: "", partnerName: "", surgeryDate: "", weeklyGoal: plan().weeklyGoal, planWeek: 0 }, state.data.profile || {});
  const sessions = () => Object.entries(state.data.sessions || {}).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0));
  const messages = () => Object.entries(state.data.messages || {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const her = () => profile().patientName || "parťák";
  const him = () => profile().partnerName || "fanoušek";
  const isPartner = () => state.role === "partner";
  const pushCtx = () => ({ store, base: BASE, role: state.role, cloud: store.mode === "cloud", profile, subs: () => (state.data.push && state.data.push.subs) || {}, esc, toast, render, isPartner });

  /* ---------- výpočty ---------- */
  function stats() {
    const ss = sessions();
    const P = plan();
    const goal = Math.max(1, Number(profile().weeklyGoal) || P.weeklyGoal);
    const today = todayISO();
    const thisWeek = weekKey(today);
    const byWeek = {}, jokerByWeek = {}, countedJoker = new Set();
    ss.slice().reverse().forEach(s => {
      const k = weekKey(s.date), J = jokerById(s.kind);
      if (J) {
        const c = jokerByWeek[k] = jokerByWeek[k] || {};
        c[J.id] = (c[J.id] || 0) + 1;
        if (c[J.id] <= J.perWeek) { countedJoker.add(s.id); byWeek[k] = (byWeek[k] || 0) + 1; }
      } else byWeek[k] = (byWeek[k] || 0) + 1;
    });
    // Cviky, u kterých je nejvyšší zapsaná váha vyšší než ta první.
    const firstKg = {}, maxKg = {};
    ss.slice().reverse().forEach(s => Object.entries(s.exercises || {}).forEach(([id, v]) => { const kg = Number(v?.kg) || 0; if (!kg) return; if (!(id in firstKg)) firstKg[id] = kg; maxKg[id] = Math.max(maxKg[id] || 0, kg); }));
    const kgUp = Object.keys(firstKg).filter(id => maxKg[id] > firstKg[id]).length;
    // Dny po sobě s tréninkem: aktuální řada (dnešek, nebo do včerejška) a nejdelší.
    const dates = new Set(ss.map(s => s.date));
    let dayStreak = 0;
    for (let i = dates.has(today) ? 0 : 1; dates.has(daysAgo(i)); i++) dayStreak++;
    let bestDayStreak = 0, dayRun = 0;
    [...dates].sort().forEach((d, idx, arr) => { dayRun = idx > 0 && daysBetween(arr[idx - 1], d) === 1 ? dayRun + 1 : 1; bestDayStreak = Math.max(bestDayStreak, dayRun); });

    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const d = startOfWeek(new Date()); d.setDate(d.getDate() - i * 7);
      const k = toISO(d);
      weeks.push({ key: k, label: fmtShort(k), count: byWeek[k] || 0, current: k === thisWeek });
    }
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = startOfWeek(new Date()); d.setDate(d.getDate() - i * 7);
      const c = byWeek[toISO(d)] || 0;
      if (c >= goal) streak++;
      else if (i === 0) continue;
      else break;
    }
    let bestStreak = 0, run = 0;
    Object.keys(byWeek).sort().forEach((k, idx, arr) => {
      if (idx > 0 && daysBetween(arr[idx - 1], k) !== 7) run = 0;
      run = byWeek[k] >= goal ? run + 1 : 0;
      bestStreak = Math.max(bestStreak, run);
    });
    // Splněné týdny mimo aktuální: ten se dopočítá, až skončí.
    const weeksHit = Object.entries(byWeek).filter(([k, c]) => c >= goal && k !== thisWeek).length;
    let calmRun = 0;
    for (const s of ss) { if (Number(s.pain) <= 2) calmRun++; else break; }

    const last = ss[0] || null;
    const sinceLast = last ? daysBetween(last.date, today) : null;
    const surgery = profile().surgeryDate;
    const weekPost = surgery ? Math.floor(daysBetween(surgery, today) / 7) + 1 : null;
    const trainedToday = ss.some(s => s.date === today);
    const strengthThisWeek = ss.filter(s => !isJoker(s) && weekKey(s.date) === thisWeek).length;

    const override = Number(profile().planWeek) || 0;
    const planWeek = Math.min(P.weeks.length, Math.max(1, override || weeksHit + 1));
    const week = P.weeks.find(w => w.week === planWeek) || P.weeks[P.weeks.length - 1];
    const phase = P.phases.find(ph => ph.id === week.phase) || P.phases[0];

    return { goal, thisWeekCount: byWeek[thisWeek] || 0, weeks, streak, bestStreak, weeksHit, calmRun, total: ss.filter(s => !isJoker(s)).length + countedJoker.size, last, sinceLast, weekPost, trainedToday,
      jokerByWeek, strengthThisWeek, countedJoker, kgUp, dayStreak, bestDayStreak,
      planWeek, week, phase, planAuto: !override, planDone: weeksHit >= P.weeks.length,
      painPoints: ss.slice(0, 12).reverse().map(s => ({ pain: Number(s.pain) || 0, label: fmtShort(s.date) })) };
  }

  /* ---------- render ---------- */
  const view = $("#view");
  function render() {
    document.querySelectorAll(".tab").forEach(t => t.classList.toggle("on", t.dataset.tab === state.tab));
    $("#role-pill").textContent = state.role ? (isPartner() ? `Fandím: ${him()}` : `Cvičím: ${her()}`) : "Kdo jsi?";
    const sp = $("#sync-pill");
    if (store.mode === "cloud") { sp.textContent = state.connected ? "Sdíleno" : "Offline"; sp.className = "pill " + (state.connected ? "pill-ok" : "pill-off"); }
    else { sp.textContent = "Lokálně"; sp.title = "Data jen v tomto prohlížeči"; sp.className = "pill pill-muted"; }

    const unseen = messages().filter(m => m.createdAt > state.lastSeenMsg && m.from !== state.role).length;
    const badge = $("#cheer-badge"); badge.hidden = !unseen || state.tab === "cheer"; badge.textContent = unseen;

    if (!state.role) { view.innerHTML = renderChooser(); bind(); return; }
    const R = { home: renderHome, log: renderLog, history: renderHistory, cheer: renderCheer, settings: renderSettings };
    view.innerHTML = (R[state.tab] || renderHome)();
    bind();
  }

  function renderChooser() {
    return `<section class="section">
      <div><p class="eyebrow">Vítej</p><h1>Kdo tady jsi?</h1><p class="muted" style="margin-top:8px">Na každém telefonu se to nastaví jednou. V nastavení to jde kdykoli změnit.</p></div>
      <div class="chooser">
        <button class="opt" data-role="patient" type="button"><span class="t">Cvičím já</span><span class="muted small">Zapisuju tréninky, bolest a jak se cítím. Vidím svůj pokrok a povzbuzení.</span></button>
        <button class="opt" data-role="partner" type="button"><span class="t">Fandím</span><span class="muted small">Sleduju pokrok, posílám povzbuzení a reaguju na tréninky.</span></button>
      </div>
    </section>`;
  }

  function renderHome() {
    const st = stats(), p = profile(), P = plan();
    let title, lede;
    if (isPartner()) {
      title = st.thisWeekCount >= st.goal ? `${her()} má tento týden splněno.` : st.trainedToday ? `${her()} má dnes odcvičeno.` : `${her()} má tento týden ${st.thisWeekCount} z ${st.goal}.`;
      lede = st.trainedToday ? "Napiš pár slov, ať ví, že to vidíš. Reakce na trénink najdeš v Historii." : st.sinceLast === null ? "Zatím žádný trénink. Pošli první povzbuzení." : st.sinceLast >= 3 ? `Poslední trénink před ${st.sinceLast} dny. Dobrý moment na popíchnutí.` : "Drží tempo. Krátká zpráva udělá radost.";
    } else {
      title = st.trainedToday ? "Dnes hotovo. Zítra zase." : st.thisWeekCount >= st.goal ? "Týden splněný. Každý další den je bonus." : st.thisWeekCount === 0 ? "Nový týden, čistý štít." : `Ještě ${st.goal - st.thisWeekCount}× a týden je tvůj.`;
      const D = dayOf(st.week, nextDayId(st.week));
      lede = st.trainedToday ? "Tělo teď regeneruje. Ráno zapiš, jaká je svalovka." : D.id ? `Na řadě ${D.id}: ${D.title.toLowerCase()}${D.minutes ? `, asi ${D.minutes} minut` : ""}.` : `${st.week.title}: ${st.week.focus}`;
    }
    const name = isPartner() ? "" : (p.patientName ? `Ahoj ${esc(p.patientName)}` : "Ahoj");
    const lastMsg = messages().filter(m => m.from === "partner").slice(-1)[0];
    const nextIdx = P.phases.findIndex(ph => ph.id === st.phase.id) + 1;
    const phaseWeeks = P.weeks.filter(w => w.phase === st.phase.id);
    const weeksLeftInPhase = phaseWeeks.filter(w => w.week > st.planWeek).length + (st.thisWeekCount >= st.goal ? 0 : 1);

    return `
    <section class="section">
      <div class="hero">
        <div>
          <p class="eyebrow">${name || (st.weekPost ? `${st.weekPost}. týden` : "Trénink")}</p>
          <h1>${esc(title)}</h1>
          <p class="lede muted">${esc(lede)}</p>
        </div>
        ${Charts.ring(st.thisWeekCount, st.goal)}
      </div>
      ${!isPartner() && !st.trainedToday ? `<button class="btn btn-primary btn-block" data-go="log" type="button">${nextDayId(st.week) ? `Začít trénink ${esc(nextDayId(st.week))}` : "Zapsat dnešní trénink"}</button>` : ""}
      ${!isPartner() ? `<button class="linkbtn" id="log-other-day" type="button">Doplnit trénink za jiný den</button>` : ""}
      ${isPartner() ? `<button class="btn btn-primary btn-block" data-go="cheer" type="button">Napsat povzbuzení</button>` : ""}
    </section>

    ${!isPartner() && lastMsg ? `<section class="section"><div class="msg partner" style="max-width:100%"><div>${esc(lastMsg.text)}</div><div class="meta">${esc(him())} · ${fmtTime(lastMsg.createdAt)}</div></div></section>` : ""}

    <section class="section">
      <div class="stats">
        <div class="stat"><div class="v num">${st.total}</div><div class="l">tréninků celkem</div></div>
        <div class="stat"><div class="v num">${st.streak}</div><div class="l">${plural(st.streak, "týden", "týdny", "týdnů")} v řadě se splněným cílem</div></div>
        <div class="stat"><div class="v num">${st.dayStreak}</div><div class="l">${plural(st.dayStreak, "den", "dny", "dní")} v řadě s tréninkem${st.bestDayStreak > st.dayStreak ? `, rekord ${st.bestDayStreak}` : ""}</div></div>
        <div class="stat"><div class="v num">${st.weekPost ?? "–"}</div><div class="l">${st.weekPost ? "týden od začátku" : "začátek plánu v nastavení"}</div></div>
      </div>
    </section>

    <section class="section">
      <div class="phase">
        <p class="eyebrow">Týden plánu ${st.planWeek} z ${P.weeks.length} · ${esc(st.week.title)}</p>
        <p class="small"><strong>Fáze ${st.phase.id}, ${esc(st.phase.name)}.</strong> ${esc(st.phase.summary)}</p>
        <div class="phase-steps">${P.weeks.map(w => `<span class="${w.week < st.planWeek ? "on" : w.week === st.planWeek ? "now" : ""}" title="Týden ${w.week}: ${esc(w.title)}"></span>`).join("")}</div>
        <p class="small muted">${st.planDone ? "Celý plán je splněný. Pokračuj týdny 6–8 dokola a přidávej váhu." : nextIdx < P.phases.length ? `Do fáze ${P.phases[nextIdx].id} (${esc(P.phases[nextIdx].name)}): ${weeksLeftInPhase} ${plural(weeksLeftInPhase, "splněný týden", "splněné týdny", "splněných týdnů")}.` : ""}</p>
      </div>
    </section>

    ${renderEveryday(st)}

    <section class="section">
      <div class="section-head"><h2>Tréninky za týden</h2><span class="small muted">posledních 8 týdnů</span></div>
      ${Charts.weeklyBars(st.weeks, st.goal)}
    </section>

    <section class="section">
      <div class="section-head"><h2>Bolest při tréninku</h2><span class="small muted">0 = nic, do 3 v pořádku</span></div>
      ${st.painPoints.length ? Charts.painLine(st.painPoints) : `<div class="empty">Objeví se po prvním zapsaném tréninku.</div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2>Milníky</h2></div>
      ${renderMilestones(st)}
    </section>`;
  }

  // Starší plán v databázi nemá everyday (nebo id u položek), tak se vezme z vestavěného plánu.
  function everydayItems(phaseId) {
    const fromDb = (plan().phases.find(ph => ph.id === phaseId) || {}).everyday;
    if (Array.isArray(fromDb) && fromDb.length && fromDb.every(i => i.id)) return fromDb;
    return (window.PLAN.phases.find(ph => ph.id === phaseId) || {}).everyday || [];
  }

  // Jméno zaškrtnuté položky: nejdřív z aktuální fáze, pak z ostatních (id se mezi fázemi opakují).
  function everydayName(id, phaseId) {
    const ids = [phaseId, ...window.PLAN.phases.map(ph => ph.id)];
    for (const pid of ids) { const it = everydayItems(pid).find(i => i.id === id); if (it) return it.name; }
    return id;
  }
  const everydayDays = () => Object.entries(state.data.everyday || {}).map(([date, v]) => ({ date, ids: Object.keys(v || {}).filter(k => v[k]) })).filter(d => d.ids.length);

  // Zápis: everyday/<datum>/<id položky> = true. Den jde přepnout i zpětně (state.everydayDate).
  function everydayDate() { const d = state.everydayDate; return d && d <= todayISO() ? d : todayISO(); }
  function renderEveryday(st) {
    const items = everydayItems(st.phase.id);
    if (!items.length) return "";
    const log = state.data.everyday || {}, today = todayISO(), day = everydayDate(), done = log[day] || {};
    // Odškrtnuté položky z jiné fáze ať jdou pořád odebrat.
    const extra = Object.keys(done).filter(id => done[id] && !items.some(i => i.id === id)).map(id => ({ id, name: everydayName(id, st.phase.id), text: "" }));
    const all = [...items, ...extra];
    // Odškrtnuté se sbalí dolů do „Hotovo“, ať zůstane vidět jen to, co zbývá.
    const todo = all.filter(i => !done[i.id]), doneItems = all.filter(i => done[i.id]);
    const doneDay = doneItems.length;
    const thisWeek = Object.entries(log).filter(([d]) => weekKey(d) === weekKey(day)).reduce((n, [, v]) => n + Object.values(v || {}).filter(Boolean).length, 0);
    const ro = isPartner();
    const dayLabel = day === today ? "dnes" : day === daysAgo(1) ? "včera" : fmtLong(day);
    return `<section class="section" id="everyday"><div class="section-head"><h2>Během dne</h2><span class="small muted">${esc(dayLabel)} ${doneDay} z ${all.length} · týden ${thisWeek}×</span></div>
      ${ro ? "" : `<div class="seg" style="margin-bottom:8px">${[["Dnes", 0], ["Včera", 1], ["Předevčírem", 2]].map(([l, n]) => `<button type="button" data-ev-day="${n}" class="${day === daysAgo(n) ? "on" : ""}">${l}</button>`).join("")}</div>
      <input type="date" id="ev-date" value="${esc(day)}" max="${today}" aria-label="Jiný den" style="margin-bottom:10px">`}
      ${todo.length ? `<div class="list">${todo.map(i => `<label class="card-soft card small check everyday"><input type="checkbox" data-everyday="${esc(i.id)}"${ro ? " disabled" : ""}><span><strong>${esc(i.name)}.</strong>${i.text ? ` <span class="muted">${esc(i.text)}</span>` : ""}</span></label>`).join("")}</div>` : `<div class="card-soft card small everyday-all">Všechno hotovo 👏</div>`}
      ${doneItems.length ? `<p class="ex-lab" style="margin-top:12px">Hotovo</p><div class="everyday-done">${doneItems.map(i => `<label class="check everyday-mini"><input type="checkbox" data-everyday="${esc(i.id)}" checked${ro ? " disabled" : ""}><span>${esc(i.name)}</span></label>`).join("")}</div>` : ""}
      <p class="small muted" style="margin-top:6px">${ro ? `Odškrtává ${esc(her())}. Do tréninků se nepočítá.` : day === today ? "Odškrtni, co dnes zvládneš. Do tréninků se nepočítá." : `Doplňuješ ${esc(fmtLong(day))}. Do tréninků se nepočítá.`}</p></section>`;
  }

  function renderMilestones(st) {
    return `<div class="miles">${window.MILESTONES.map(m => `<div class="mile ${m.test(st) ? "hit" : ""}"><div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc)}</div></div>`).join("")}</div>`;
  }

  /* ---------- zápis tréninku ---------- */
  function newDraft(kind) { return { kind: kind || "strength", day: null, date: todayISO(), exercises: {}, minutes: "", link: "", pain: 0, swelling: 0, mood: null, note: "" }; }
  function draft() { if (!state.draft) state.draft = newDraft(); if (!state.draft.exercises) state.draft.exercises = {}; return state.draft; }
  function saveDraft() { LS.set("draft", state.draft); }
  const daysAgo = n => { const t = new Date(); t.setDate(t.getDate() - n); return toISO(t); };
  // Úprava uloženého tréninku: zápis se načte do rozpracovaného formuláře s editId.
  function draftFromSession(s) {
    return { kind: s.kind || "strength", day: s.day || null, date: s.date, exercises: JSON.parse(JSON.stringify(s.exercises || {})), minutes: s.minutes || "", link: s.link || "", pain: Number(s.pain) || 0, swelling: Number(s.swelling) || 0, mood: s.mood ?? null, note: s.note || "", editId: s.id, createdAt: s.createdAt, planWeek: s.planWeek };
  }

  function renderWeekHeader(st) {
    return `<div class="phase">
      <p class="eyebrow">Týden plánu ${st.planWeek} z ${plan().weeks.length}${st.planAuto ? "" : " · nastaveno ručně"}</p>
      <h2>${esc(st.week.title)}</h2>
      <p class="small muted">${esc(st.week.focus)}</p>
    </div>`;
  }

  function renderAllWeeks(st) {
    const P = plan();
    return `<section class="section">
      <div class="section-head"><h2>Celý plán</h2><button class="linkbtn" id="toggle-weeks" type="button">${state.showAllWeeks ? "Skrýt" : "Zobrazit všech " + P.weeks.length + " týdnů"}</button></div>
      ${state.showAllWeeks ? `<div class="list">${P.weeks.map(w => `<div class="card ${w.week === st.planWeek ? "wk-now" : ""}" style="padding:12px 14px">
        <div class="row"><strong>Týden ${w.week} · ${esc(w.title)}</strong><span class="chip">fáze ${w.phase}</span></div>
        <p class="small muted">${esc(w.focus)}</p>
        ${weekDays(w).map(D => `${D.id ? `<p class="small" style="margin-top:8px"><strong>${esc(D.id)} · ${esc(D.title)}</strong>${D.minutes ? ` <span class="muted">· asi ${esc(D.minutes)} min</span>` : ""}</p>` : ""}
        <ul class="small" style="margin:4px 0 0;padding-left:18px">${D.items.map(it => `<li>${esc(exName(it.ex))}: ${esc(itemTarget(it))}${it.note ? ` <span class="muted">(${esc(it.note)})</span>` : ""}</li>`).join("")}</ul>`).join("")}
      </div>`).join("")}</div>` : ""}
    </section>`;
  }

  function renderLog() {
    const st = stats();
    if (isPartner()) {
      const nextId = nextDayId(st.week);
      return `<section class="section"><p class="eyebrow">Plán</p><h1>Co ${esc(her())} teď cvičí</h1>${renderWeekHeader(st)}</section>
      ${weekDays(st.week).map(D => `<section class="section">${D.id ? `<div class="section-head"><h2>${esc(D.id)} · ${esc(D.title)}</h2><span class="small muted">${D.id === nextId ? "na řadě" : ""}${D.minutes ? `${D.id === nextId ? " · " : ""}asi ${esc(D.minutes)} min` : ""}</span></div>` : ""}<div class="list">${D.items.map(it => renderExCard(it, null, true)).join("")}</div></section>`).join("")}
      ${renderJokerCard(st)}${renderAllExercises()}${renderAllWeeks(st)}${renderRules()}${renderResources()}`;
    }
    const d = draft();
    const wk = (d.editId && plan().weeks.find(w => w.week === d.planWeek)) || st.week;
    const J = jokerById(d.kind), joker = !!J;
    const nextId = nextDayId(wk), D = dayOf(wk, d.day || nextId);
    const doneCount = joker ? 1 : D.items.filter(it => (d.exercises[it.ex]?.sets || 0) > 0).length;
    const moods = ["Skvěle", "Dobře", "Ok", "Těžké", "Bolelo"];
    const swell = ["Žádná", "Mírná", "Silná"];
    const kindSwitch = `<div class="seg" data-seg="kind"><button type="button" data-v="strength" class="${!joker ? "on" : ""}">Plán</button>${jokers().map(j => `<button type="button" data-v="${esc(j.id)}" class="${d.kind === j.id ? "on" : ""}">${esc(j.icon || "")} ${esc(j.short)}</button>`).join("")}</div>`;
    return `
    <section class="section">
      <div><p class="eyebrow">${d.editId ? "Úprava uloženého tréninku" : "Zápis tréninku"}</p><h1>${joker ? esc(jokerName(J)) + (d.date === todayISO() ? "" : ", " + esc(fmtLong(d.date))) : d.date === todayISO() ? "Dnešní sestava" : "Sestava " + esc(fmtLong(d.date))}</h1></div>
      <div class="field"><div class="lab">Datum tréninku</div>
        <div class="seg" data-days>${[["Dnes", 0], ["Včera", 1], ["Předevčírem", 2]].map(([l, n]) => `<button type="button" data-day="${n}" class="${d.date === daysAgo(n) ? "on" : ""}">${l}</button>`).join("")}</div>
        <input type="date" id="f-date" value="${esc(d.date)}" max="${todayISO()}" aria-label="Jiné datum" style="margin-top:8px">
      </div>
      ${kindSwitch}
      ${joker ? "" : renderWeekHeader(d.editId ? { ...st, week: wk, planWeek: wk.week, planAuto: true } : st)}
      ${joker || !D.id ? "" : `<div class="field"><div class="lab">Sestava</div>
        <div class="seg" data-seg="day">${weekDays(wk).map(x => `<button type="button" data-v="${esc(x.id)}" class="${x.id === D.id ? "on" : ""}">${esc(dayLabel(x))}</button>`).join("")}</div>
        <p class="small" style="margin-top:6px"><strong>${esc(D.title)}</strong>${D.minutes ? ` · asi ${esc(D.minutes)} min` : ""}${D.id !== nextId && !d.editId ? ` <span class="muted">· podle pořadí je na řadě ${esc(nextId)}</span>` : ""}</p></div>`}
      ${joker ? "" : `<div class="row" style="align-items:center"><p class="muted small">Klepni na čísla sérií, které máš hotové.</p><button class="linkbtn" id="toggle-steps" type="button" style="white-space:nowrap">${state.showSteps ? "Skrýt popisy" : "Zobrazit popisy"}</button></div>`}
    </section>
    ${joker ? renderJokerForm(st, d, J) : `<section class="section"><div class="list">${D.items.map(it => renderExCard(it, d.exercises[it.ex] || { sets: 0 }, false)).join("")}</div></section>`}

    <section class="section card" style="display:grid;gap:16px">
      <div class="field">
        <div class="lab">Bolest kloubů nebo zad při tréninku: <span class="num" id="pain-val">${d.pain}</span>/10</div>
        <input type="range" id="f-pain" min="0" max="10" step="1" value="${d.pain}">
        <div class="range-labels"><span>nic</span><span>do 3 v pořádku</span><span>ostrá</span></div>
        ${d.pain >= 5 ? `<p class="pain-warn">Bolest nad 4 z 10 je moc. Cvik, který bolí, příště vynech nebo zmenši váhu a rozsah. Svalovka se nepočítá.</p>` : ""}
      </div>
      <div class="field"><div class="lab">Svalovka (dnes ráno)</div><div class="seg" data-seg="swelling">${swell.map((s, i) => `<button type="button" data-v="${i}" class="${d.swelling === i ? "on" : ""}">${s}</button>`).join("")}</div></div>
      <div class="field"><div class="lab">Jak to šlo</div><div class="seg" data-seg="mood">${moods.map((s, i) => `<button type="button" data-v="${i}" class="${d.mood === i ? "on" : ""}">${s}</button>`).join("")}</div></div>
      <div class="field"><label for="f-note">Poznámka</label><textarea id="f-note" placeholder="${joker ? esc(J.placeholder || "") : "Např. dřep s 12 kg, levé rameno trochu cítím…"}">${esc(d.note)}</textarea></div>
      <button class="btn btn-primary btn-block" id="save-session" type="button" ${doneCount ? "" : "disabled"}>${d.editId && doneCount ? "Uložit změny" : `${joker ? `Uložit: ${esc(J.short)}` : doneCount ? `Uložit trénink (${doneCount} ${plural(doneCount, "cvik", "cviky", "cviků")})` : "Označ aspoň jeden cvik"}`}</button>
      <button class="linkbtn" id="clear-draft" type="button">${d.editId ? "Zrušit úpravu" : "Vymazat rozpracovaný zápis"}</button>
    </section>
    ${renderAllExercises()}${renderAllWeeks(st)}${renderRules()}${renderResources()}`;
  }

  function renderExCard(it, val, readOnly) {
    const e = plan().exercises[it.ex] || { name: it.ex, alias: "", why: "", steps: [] };
    const sets = val ? val.sets || 0 : 0;
    const open = readOnly || (state.openEx[it.ex] !== undefined ? state.openEx[it.ex] : state.showSteps);
    const n = Math.max(1, Number(it.sets) || 3);
    return `<div class="card ex ${sets > 0 ? "done" : ""} ${open ? "open" : ""}" data-ex="${esc(it.ex)}">
      <div class="ex-head">
        <div><h3>${esc(e.name)}</h3><div class="ex-target">${esc(itemTarget(it))}${e.alias ? ` · ${esc(e.alias)}` : ""}</div>${it.note ? `<div class="ex-target">${esc(it.note)}</div>` : ""}</div>
        ${readOnly ? "" : `<button class="linkbtn" data-toggle="${esc(it.ex)}" type="button">${open ? "Skrýt popis" : "Popis"}</button>`}
      </div>
      <div class="ex-body small">${renderExBody(e)}</div>
      ${readOnly || !e.load ? "" : `<div class="kg"><label for="kg-${esc(it.ex)}">Zátěž</label><input type="number" id="kg-${esc(it.ex)}" data-kg="${esc(it.ex)}" inputmode="decimal" min="0" step="0.5" value="${esc(val.kg ?? "")}" placeholder="${esc(lastKg(it.ex) ?? 0)}"><span class="muted small">kg${lastKg(it.ex) !== null ? `, minule ${esc(lastKg(it.ex))}` : " navíc k tělu"}</span></div>`}
      ${readOnly ? "" : renderTimer(it, e, sets, n)}
      ${readOnly ? "" : `<div class="sets" data-of="${n}" data-rest="${n > 1 ? restSecs(it, e) : 0}"><span class="lab">${n === 1 ? "Hotovo" : "Série"}</span>${Array.from({ length: n }, (_, i) => i + 1).map(k => `<button type="button" class="setbtn ${sets >= k ? "on" : ""}" data-set="${esc(it.ex)}" data-n="${k}" aria-pressed="${sets >= k}">${n === 1 ? "✓" : k}</button>`).join("")}</div>`}
    </div>`;
  }

  // Časovač: u cviků na čas odpočítá výdrž z plánu a po doběhnutí odškrtne sérii.
  // Mezi sériemi běží pauza; u cviků na opakování ji jde spustit i ručně.
  function renderTimer(it, e, sets, n) {
    const work = parseDuration(it.time), rest = n > 1 ? restSecs(it, e) : 0;
    const t = state.timer && state.timer.ex === it.ex ? state.timer : null;
    const next = `série ${Math.min(n, sets + 1)} z ${n}`;
    const box = (cls, secs, label, buttons) => `<div class="timer ${cls}">
      <div class="timer-info"><span class="timer-left" id="timer-${esc(it.ex)}">${fmtClock(secs)}</span>${label ? `<span class="muted small">${label}</span>` : ""}</div>${buttons}</div>`;
    if (t && t.kind === "rest") return box("rest running", timerLeft(t), `pauza, pak ${next}`, `<button class="btn btn-ghost" id="timer-reset" type="button">Přeskočit</button>`);
    if (work) {
      const run = !!(t && t.endsAt);
      return box(run ? "running" : "", t ? timerLeft(t) : work, sets >= n ? "hotovo" : n > 1 ? next : "",
        `${t ? `<button class="linkbtn" id="timer-reset" type="button">Znovu</button>` : ""}
        <button type="button" class="btn ${run ? "btn-ghost" : "btn-primary"}" data-timer="${esc(it.ex)}" data-kind="work" data-secs="${work}" data-rest="${rest}" data-sets="${n}">${run ? "Zastavit" : t ? "Pokračovat" : "Start"}</button>`);
    }
    if (rest && sets > 0 && sets < n) return box("rest", rest, "pauza mezi sériemi",
      `<button type="button" class="btn btn-primary" data-timer="${esc(it.ex)}" data-kind="rest" data-secs="${rest}" data-sets="${n}">Start</button>`);
    return "";
  }

  function renderJokerForm(st, d, J) {
    const e = plan().exercises[J.ex] || { name: J.short, steps: [] };
    const left = J.perWeek - ((st.jokerByWeek[weekKey(d.date)] || {})[J.id] || 0);
    return `<section class="section">
      <div class="card ex open">
        <div class="ex-head"><div><h3>${esc(e.name)}</h3><div class="ex-target">Žolík: nahradí nejvýš ${J.perWeek}× týdně trénink z plánu</div></div></div>
        <div class="ex-body small">${renderExBody(e)}</div>
      </div>
      ${left <= 0 ? `<div class="note">Žolík ${esc(J.short)} je v tomto týdnu vyčerpaný (${J.perWeek}×). Zapíše se, ale do cíle ${st.goal}× týdně se nepočítá.</div>` : `<div class="card-soft card small">Započítá se do cíle. V tomto týdnu ${left === J.perWeek ? "ještě nepoužitý" : `zbývá ${left}×`}.</div>`}
      <div class="card" style="display:grid;gap:12px">
        <div class="field"><label for="f-min">Délka (minuty, nepovinné)</label><input type="number" id="f-min" inputmode="numeric" min="0" step="1" value="${esc(d.minutes)}" placeholder="např. 45"></div>
        ${J.link ? `<div class="field"><label for="f-link">Odkaz na aktivitu (nepovinné)</label><input type="url" id="f-link" inputmode="url" value="${esc(d.link || "")}" placeholder="https://…"><p class="small muted">Ve Stravě, Garminu nebo Suuntu: aktivita → Sdílet → Kopírovat odkaz.</p></div>` : ""}
      </div>
    </section>`;
  }

  function renderJokerCard(st) {
    const left = J => J.perWeek - ((st.jokerByWeek[weekKey(todayISO())] || {})[J.id] || 0);
    const list = jokers().filter(J => plan().exercises[J.ex]);
    if (!list.length) return "";
    return `<section class="section"><h2>Žolíci</h2><div class="list">${list.map(J => { const e = plan().exercises[J.ex]; return `<div class="card-soft card small"><strong>${esc(J.icon || "")} ${esc(e.name)}</strong> <span class="muted">· až ${J.perWeek}× týdně</span><p style="margin-top:4px">${esc(e.why)}</p><p class="muted" style="margin-top:6px">Tento týden ${left(J) <= 0 ? "vyčerpaný" : `volný ještě ${left(J)}×`}.</p></div>`; }).join("")}</div></section>`;
  }

  function renderExBody(e) {
    return `${e.why ? `<p class="muted">${esc(e.why)}</p>` : ""}
      ${e.gear ? `<p><strong>Potřebuješ:</strong> ${esc(e.gear)}</p>` : ""}
      ${(e.steps || []).length ? `<p class="ex-lab">Provedení</p><ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      ${(e.avoid || []).length ? `<p class="ex-lab">Na co si dát pozor</p><ul>${e.avoid.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${e.tip ? `<p><strong>Tip:</strong> ${esc(e.tip)}</p>` : ""}
      ${/^https:\/\//.test(e.video || "") ? `<p><a href="${esc(e.video)}" target="_blank" rel="noopener">${/youtube\.com\/results/.test(e.video) ? "Najít video na YouTube" : /youtu/.test(e.video) ? "Video ukázka" : "Návod"} ↗</a></p>` : ""}`;
  }

  function renderAllExercises() {
    const P = plan();
    const ids = Object.keys(P.exercises);
    return `<section class="section">
      <div class="section-head"><h2>Všechny cviky</h2><button class="linkbtn" id="toggle-ex" type="button">${state.showAllEx ? "Skrýt" : "Zobrazit všech " + ids.length}</button></div>
      ${state.showAllEx ? `<div class="list">${ids.map(id => { const e = P.exercises[id]; const wk = P.weeks.filter(w => weekDays(w).some(D => D.items.some(it => it.ex === id))).map(w => w.week); return `<div class="card ex open">
        <div class="ex-head"><div><h3>${esc(e.name)}</h3><div class="ex-target">${esc(e.alias || "")}${wk.length ? ` · týdny ${wk[0]}–${wk[wk.length - 1]}` : ""}</div></div></div>
        <div class="ex-body small">${renderExBody(e)}</div></div>`; }).join("")}</div>` : ""}
    </section>`;
  }

  function renderRules() {
    return `<section class="section"><h2>Pravidla bezpečného tréninku</h2><div class="list">${plan().rules.map(r => `<div class="card-soft card"><strong>${esc(r.title)}.</strong> <span class="muted">${esc(r.text)}</span></div>`).join("")}</div></section>`;
  }

  function renderResources() {
    const rs = (window.PLAN.resources || []).filter(r => /^https:\/\//.test(r.url || ""));
    if (!rs.length) return "";
    return `<section class="section"><h2>Další zdroje</h2><div class="list">${rs.map(r => `<div class="card-soft card"><a href="${esc(r.url)}" target="_blank" rel="noopener"><strong>${esc(r.title)}</strong> ↗</a>${r.author ? ` <span class="muted">· ${esc(r.author)}</span>` : ""}${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ""}</div>`).join("")}</div></section>`;
  }

  /* ---------- historie ---------- */
  function renderHistory() {
    const ss = sessions(), days = everydayDays();
    if (!ss.length && !days.length) return `<section class="section"><h1>Historie</h1><div class="empty">Zatím žádný trénink. ${isPartner() ? "Až ho zapíše, uvidíš ho tady a můžeš zareagovat." : "První zápis je v záložce Trénink."}</div></section>`;
    const reacts = state.data.reactions || {};
    const st = stats();
    const moods = ["skvěle", "dobře", "ok", "těžké", "bolelo"], swell = ["bez svalovky", "mírná svalovka", "silná svalovka"];
    return `<section class="section"><div class="section-head"><h1>Historie</h1><span class="muted small num">${ss.length} ${plural(ss.length, "trénink", "tréninky", "tréninků")}</span></div>
    <div class="list">${[...ss.map(s => ({ date: s.date, s })), ...days.map(d => ({ date: d.date, d }))].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : a.d ? -1 : b.d ? 1 : 0).map(({ s, d }) => {
      if (d) return `<article class="card card-soft sess"><div class="sess-head"><span class="d">${esc(fmtLong(d.date))} <span class="muted small">· během dne</span></span><span class="chip ok">${d.ids.length}×</span></div>
        <div class="chips">${d.ids.map(id => `<span class="chip">${esc(everydayName(id, st.phase.id))}</span>`).join("")}</div>
        ${!isPartner() ? `<div class="reacts"><button type="button" class="linkbtn" data-ev-edit="${esc(d.date)}" style="margin-left:auto">Upravit</button></div>` : ""}</article>`;
      const SJ = jokerById(s.kind);
      const ex = SJ ? [] : Object.entries(s.exercises || {}).filter(([, v]) => (v?.sets || 0) > 0);
      const link = safeLink(s.link);
      const site = /strava/i.test(link) ? "Strava" : /garmin/i.test(link) ? "Garmin" : /suunto/i.test(link) ? "Suunto" : "Aktivita";
      const jokerChips = SJ ? `<span class="chip ok">${esc(SJ.icon || "")} ${esc(SJ.short)}${s.minutes ? ` · ${s.minutes} min` : ""}</span><span class="chip">${st.countedJoker.has(s.id) ? "žolík, počítá se" : "navíc, nepočítá se"}</span>${link ? `<a class="chip" href="${esc(link)}" target="_blank" rel="noopener">${site} ↗</a>` : ""}` : "";
      const rs = Object.entries(reacts[s.id] || {}).map(([id, r]) => ({ id, ...r }));
      const counts = {}; rs.forEach(r => { counts[r.emoji] = counts[r.emoji] || { n: 0, mine: false }; counts[r.emoji].n++; if (r.from === state.role) counts[r.emoji].mine = true; });
      return `<article class="card sess" data-sid="${s.id}">
        <div class="sess-head"><span class="d">${esc(fmtLong(s.date))}${s.planWeek ? ` <span class="muted small">· ${s.planWeek}. týden${s.day ? `, ${esc(s.day)}` : ""}</span>` : ""}</span>
          <span class="chips"><span class="chip pain-${Number(s.pain) || 0}">bolest ${Number(s.pain) || 0}</span><span class="chip">${swell[s.swelling] || swell[0]}</span>${s.mood !== null && s.mood !== undefined ? `<span class="chip">${moods[s.mood]}</span>` : ""}</span></div>
        <div class="chips">${jokerChips || ex.map(([id, v]) => `<span class="chip ok">${esc(exName(id))} ${v.sets}×${v.kg ? ` · ${v.kg} kg` : ""}</span>`).join("") || `<span class="chip">bez cviků</span>`}</div>
        ${s.note ? `<p class="small">${esc(s.note)}</p>` : ""}
        <div class="reacts">
          ${["💪", "❤️", "🔥", "👏"].map(em => `<button type="button" class="react ${counts[em]?.mine ? "mine" : ""}" data-react="${em}" data-sid="${s.id}">${em}${counts[em] ? `<span class="c num">${counts[em].n}</span>` : ""}</button>`).join("")}
          ${!isPartner() ? `<button type="button" class="linkbtn" data-edit="${s.id}" style="margin-left:auto">Upravit</button><button type="button" class="linkbtn" data-del="${s.id}">Smazat</button>` : ""}
        </div>
      </article>`;
    }).join("")}</div></section>`;
  }

  /* ---------- fandění ---------- */
  function renderCheer() {
    const ms = messages();
    const st = stats();
    return `<section class="section">
      <div><p class="eyebrow">Fandění · ${esc(isPartner() ? her() : him())}</p><h1>${isPartner() ? "Pošli povzbuzení" : "Vzkazy pro tebe"}</h1></div>
      <div class="list" id="msg-list">${ms.length ? ms.map(m => `<div class="msg ${m.from}"><div>${esc(m.text)}</div><div class="meta">${esc(m.from === "partner" ? him() : her())} · ${fmtTime(m.createdAt)}</div></div>`).join("") : `<div class="empty">${isPartner() ? "Ještě nic. První zpráva je nejtěžší, zkus rychlou volbu níž." : "Zatím ticho. Pošli odkaz na appku parťákovi, ať může fandit."}</div>`}</div>
    </section>
    <section class="section card composer">
      ${isPartner() ? `<div class="quick">${plan().cheers.map(c => `<button type="button" data-quick="${esc(c)}">${esc(c)}</button>`).join("")}${!st.trainedToday && st.thisWeekCount < st.goal ? `<button type="button" data-quick="Dneska by to šlo? Ještě ${st.goal - st.thisWeekCount} do splněného týdne. Věřím ti.">Popíchnout: ještě ${st.goal - st.thisWeekCount} do cíle</button>` : ""}</div>` : ""}
      <div class="field"><label for="f-msg">${isPartner() ? "Vlastní zpráva" : "Odpověď"}</label><textarea id="f-msg" placeholder="${isPartner() ? "Pár slov pro povzbuzení…" : "Díky, dneska to šlo…"}"></textarea></div>
      <button class="btn btn-primary" id="send-msg" type="button">Odeslat</button>
    </section>
    <section class="section"><h2>Milníky</h2>${renderMilestones(st)}</section>`;
  }

  /* ---------- nastavení ---------- */
  function renderSettings() {
    const p = profile(), P = plan(), st = stats();
    const link = `${location.origin}${location.pathname}?pair=${pair}`;
    const dbPlan = state.data.plan;
    const dbVer = dbPlan && dbPlan.version;
    return `<section class="section"><h1>Nastavení</h1></section>
    <section class="section card" style="display:grid;gap:14px">
      <h2>Vy dva</h2>
      <div class="field"><label for="s-patient">Kdo cvičí (jméno)</label><input type="text" id="s-patient" value="${esc(p.patientName)}" placeholder="např. Jakub"></div>
      <div class="field"><label for="s-partner">Kdo fandí (jméno)</label><input type="text" id="s-partner" value="${esc(p.partnerName)}" placeholder="např. Honza"></div>
      <div class="field"><label for="s-surgery">Začátek plánu</label><input type="date" id="s-surgery" value="${esc(p.surgeryDate)}" max="${todayISO()}"></div>
      <div class="field"><label for="s-goal">Cíl tréninků za týden</label><select id="s-goal">${[2, 3, 4, 5, 6, 7].map(n => `<option value="${n}" ${Number(p.weeklyGoal) === n ? "selected" : ""}>${n}× týdně</option>`).join("")}</select></div>
      <div class="field"><label for="s-week">Týden plánu</label><select id="s-week"><option value="0" ${!Number(p.planWeek) ? "selected" : ""}>Automaticky (teď ${st.weeksHit + 1 > P.weeks.length ? P.weeks.length : st.weeksHit + 1}. podle splněných týdnů)</option>${P.weeks.map(w => `<option value="${w.week}" ${Number(p.planWeek) === w.week ? "selected" : ""}>Týden ${w.week} · ${esc(w.title)}</option>`).join("")}</select>
        <p class="small muted">Ručně nastav, když chceš týden zopakovat (nemoc, pauza, moc těžké) nebo přeskočit.</p></div>
      <button class="btn btn-primary" id="save-profile" type="button">Uložit</button>
    </section>
    <section class="section card" style="display:grid;gap:12px">
      <h2>Tréninkový plán</h2>
      <div class="kv"><span>Sestavení appky</span><span class="small num">${esc(/^[0-9a-f]{7}$/.test(window.BUILD || "") ? window.BUILD : "vývojová")}</span></div>
      <div class="kv"><span>Používá se</span><span class="small">${planSource() === "db" ? `z databáze, verze ${esc(dbVer ?? "?")}` : `vestavěný, verze ${esc(window.PLAN.version)}`}</span></div>
      <div class="kv"><span>Rozsah</span><span class="small">${P.weeks.length} ${plural(P.weeks.length, "týden", "týdny", "týdnů")}, ${Object.keys(P.exercises).length} cviků</span></div>
      <div class="kv"><span>Žolíci</span><span class="small">${jokers().map(J => `${esc(J.short)} až ${J.perWeek}× týdně`).join(", ") || "žádní"}</span></div>
      ${store.mode === "cloud"
        ? `<p class="small muted">${planSource() === "db" && dbVer >= window.PLAN.version ? "Databáze má aktuální plán." : planSource() === "db" ? `V appce je novější plán (verze ${window.PLAN.version}). Nahraj ho, aby ho viděli oba.` : "Plán zatím není v databázi. Nahraj ho, ať ho jde později upravovat bez změny kódu."}</p>
           <button class="btn btn-ghost" id="upload-plan" type="button">Nahrát plán do databáze (verze ${window.PLAN.version})</button>`
        : `<p class="small muted">Po zapnutí Firebase půjde plán nahrát do databáze jedním klepnutím tady.</p>`}
    </section>
    ${window.Push ? Push.renderSection(pushCtx()) : ""}
    <section class="section card" style="display:grid;gap:12px">
      <h2>Tento telefon</h2>
      <div class="kv"><span>Role</span><div class="seg"><button type="button" data-setrole="patient" class="${state.role === "patient" ? "on" : ""}">Cvičím</button><button type="button" data-setrole="partner" class="${state.role === "partner" ? "on" : ""}">Fandím</button></div></div>
      <div class="kv"><span>Kód dvojice</span><code class="inline">${esc(pair)}</code></div>
      ${store.mode === "cloud"
        ? `<p class="small muted">Pošli parťákovi tento odkaz. Otevře stejná data a zvolí si roli „Fandím“.</p>
           <div class="row"><input type="text" id="s-link" readonly value="${esc(link)}"><button class="btn btn-ghost" id="copy-link" type="button">Kopírovat</button></div>`
        : `<div class="note">Data se ukládají jen v tomto prohlížeči, parťák je neuvidí. Sdílení zapneš vyplněním <code class="inline">js/firebase-config.js</code> podle README (asi 5 minut).</div>`}
    </section>
    <section class="section card" style="display:grid;gap:12px">
      <h2>Data</h2>
      <div class="row"><button class="btn btn-ghost" id="export" type="button">Stáhnout zálohu (JSON)</button><button class="btn btn-danger" id="reset-local" type="button">Odhlásit tento telefon</button></div>
      <p class="small muted">Odhlášení smaže jen volbu role a kód dvojice v tomto prohlížeči. Zapsané tréninky zůstanou${store.mode === "cloud" ? " ve sdílené databázi" : " v tomto prohlížeči"}.</p>
    </section>`;
  }

  /* ---------- časovač ---------- */
  // Délka z plánu ("30 s", "3 min") v sekundách.
  function parseDuration(s) { const m = /(\d+(?:[.,]\d+)?)\s*(min|s)?/.exec(s || ""); if (!m) return 0; const v = Number(m[1].replace(",", ".")); return Math.round(m[2] === "min" ? v * 60 : v); }
  const fmtClock = s => `${Math.floor(s / 60)}:${pad(s % 60)}`;
  // Běžící časovač počítá z endsAt, takže sedí i po uspání telefonu nebo přepnutí appky.
  const timerLeft = t => t.endsAt ? Math.max(0, Math.ceil((t.endsAt - Date.now()) / 1000)) : t.left;
  const restSecs = (it, e) => parseDuration(it.rest || e.rest) || (e.type === "time" ? 30 : 45);
  const buzz = p => { if (navigator.vibrate) navigator.vibrate(p); };
  let ticker = null, wakeLock = null, audio = null;

  function toggleTimer(id, kind, secs, sets, rest) {
    let t = state.timer;
    if (!t || t.ex !== id || t.kind !== kind) t = state.timer = { ex: id, kind, total: secs, left: secs, sets, rest, endsAt: null, draft: draft() };
    if (t.endsAt) { t.left = timerLeft(t); t.endsAt = null; }
    else { beep(0); t.endsAt = Date.now() + t.left * 1000; }
    syncTicker(); render();
  }
  function startRest(id, secs, sets) { beep(0); state.timer = { ex: id, kind: "rest", total: secs, left: secs, sets, endsAt: Date.now() + secs * 1000, draft: draft() }; }
  function resetTimer() { state.timer = null; syncTicker(); render(); }
  // Odškrtnutá série spustí pauzu, když další zbývají. Jen při dnešním zápisu (ne při doplňování
  // nebo úpravě) a bez přerušení běžící výdrže. Odškrtnutí zpět nebo poslední série pauzu zruší.
  function restAfterSet(id, before, after, n, rest) {
    const t = state.timer, d = draft();
    if (t && t.ex === id && t.kind === "rest" && (after < before || after >= n)) state.timer = null;
    else if (rest && after > before && after < n && d.date === todayISO() && !d.editId && !(t && t.kind === "work" && t.endsAt)) startRest(id, rest, n);
    syncTicker();
  }
  function syncTicker() {
    const run = !!(state.timer && state.timer.endsAt);
    if (run && !ticker) ticker = setInterval(tickTimer, 250);
    if (!run && ticker) { clearInterval(ticker); ticker = null; }
    keepAwake(run);
  }
  function tickTimer() {
    const t = state.timer; if (!t || !t.endsAt) return syncTicker();
    const left = timerLeft(t), el = document.getElementById("timer-" + t.ex);
    if (el) el.textContent = fmtClock(left);
    if (left <= 0) finishTimer(t);
  }
  function finishTimer(t) {
    state.timer = null;
    // Sérii odškrtne jen v zápisu, ve kterém se časovač spustil (ne po uložení nebo vymazání).
    const mine = state.draft === t.draft, d = t.draft;
    if (t.kind === "rest") {
      beep(2, 1320); buzz([200, 100, 200]);
      toast(mine ? `Konec pauzy, na řadě série ${Math.min(t.sets, (d.exercises[t.ex]?.sets || 0) + 1)} z ${t.sets}` : "Konec pauzy");
    } else {
      beep(3); buzz([300, 150, 300, 150, 300]);
      let msg = "Čas!";
      if (mine) {
        const done = Math.min(t.sets, (d.exercises[t.ex]?.sets || 0) + 1);
        d.exercises[t.ex] = { ...d.exercises[t.ex], sets: done }; saveDraft();
        msg = t.sets > 1 ? `Čas! Série ${done} z ${t.sets} hotová` : "Čas! Hotovo";
        if (done < t.sets && t.rest) startRest(t.ex, t.rest, t.sets);
      }
      toast(msg);
    }
    syncTicker(); render();
  }
  // Obrazovka nezhasne, dokud časovač běží.
  function keepAwake(on) {
    // wakeLock drží slib zámku; systém ho sám uvolní při skrytí appky, po návratu se vyžádá znovu.
    if (on && !wakeLock && navigator.wakeLock) {
      const p = wakeLock = navigator.wakeLock.request("screen").catch(() => null);
      p.then(l => {
        if (!l) { if (wakeLock === p) wakeLock = null; return; }
        l.addEventListener("release", () => { if (wakeLock === p) wakeLock = null; });
        if (wakeLock !== p) l.release();
      });
    }
    if (!on && wakeLock) { const p = wakeLock; wakeLock = null; p.then(l => l && !l.released && l.release()); }
  }
  // Pípnutí přes Web Audio. beep(0) při startu jen odemkne zvuk (telefon ho povolí až po klepnutí).
  function beep(times, hz = 880) {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      for (let i = 0; i < times; i++) {
        const o = audio.createOscillator(), g = audio.createGain(), at = audio.currentTime + i * 0.35;
        o.frequency.value = hz; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.4, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.25);
        o.start(at); o.stop(at + 0.3);
      }
    } catch (e) { /* bez zvuku */ }
  }

  /* ---------- akce ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200); }
  function go(tab) { state.tab = tab; LS.set("tab", tab); if (tab === "cheer") { const last = messages().slice(-1)[0]; state.lastSeenMsg = last ? last.createdAt : state.lastSeenMsg; LS.set("lastSeenMsg", state.lastSeenMsg); } window.scrollTo(0, 0); render(); }

  function bind() {
    view.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { state.role = b.dataset.role; LS.set("role", state.role); go("home"); });
    view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
    view.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => { const id = b.dataset.toggle; const cur = state.openEx[id] !== undefined ? state.openEx[id] : state.showSteps; state.openEx[id] = !cur; render(); });
    const ts = $("#toggle-steps"); if (ts) ts.onclick = () => { state.showSteps = !state.showSteps; state.openEx = {}; LS.set("showSteps", state.showSteps); render(); };
    view.querySelectorAll("[data-everyday]").forEach(c => c.onchange = () => store.set(`${BASE}/everyday/${everydayDate()}/${c.dataset.everyday}`, c.checked ? true : null));
    view.querySelectorAll("[data-ev-day]").forEach(b => b.onclick = () => { state.everydayDate = daysAgo(Number(b.dataset.evDay)); render(); });
    const evd = $("#ev-date"); if (evd) evd.onchange = () => { state.everydayDate = evd.value || todayISO(); render(); };
    view.querySelectorAll("[data-ev-edit]").forEach(b => b.onclick = () => { state.everydayDate = b.dataset.evEdit; go("home"); const el = $("#everyday"); if (el) el.scrollIntoView(); });
    const te = $("#toggle-ex"); if (te) te.onclick = () => { state.showAllEx = !state.showAllEx; render(); };
    view.querySelectorAll("[data-set]").forEach(b => b.onclick = () => {
      const d = draft(), id = b.dataset.set, n = Number(b.dataset.n), box = b.closest(".sets").dataset;
      const before = d.exercises[id]?.sets || 0, after = before === n ? n - 1 : n;
      d.exercises[id] = { ...d.exercises[id], sets: after };
      saveDraft(); restAfterSet(id, before, after, Number(box.of), Number(box.rest)); render();
    });
    view.querySelectorAll("[data-timer]").forEach(b => b.onclick = () => toggleTimer(b.dataset.timer, b.dataset.kind, Number(b.dataset.secs), Number(b.dataset.sets), Number(b.dataset.rest) || 0));
    const tr = $("#timer-reset"); if (tr) tr.onclick = resetTimer;
    view.querySelectorAll("[data-kg]").forEach(i => i.onchange = () => { const d = draft(), id = i.dataset.kg; d.exercises[id] = { sets: 0, ...d.exercises[id], kg: i.value === "" ? null : Number(i.value) }; saveDraft(); });
    const tw = $("#toggle-weeks"); if (tw) tw.onclick = () => { state.showAllWeeks = !state.showAllWeeks; render(); };
    view.querySelectorAll("[data-day]").forEach(b => b.onclick = () => { draft().date = daysAgo(Number(b.dataset.day)); saveDraft(); render(); });
    view.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => { const s = sessions().find(x => x.id === b.dataset.edit); if (!s) return; state.draft = draftFromSession(s); saveDraft(); go("log"); });
    const lod = $("#log-other-day"); if (lod) lod.onclick = () => { if (draft().editId) state.draft = newDraft(); draft().date = daysAgo(1); saveDraft(); go("log"); };
    const date = $("#f-date"); if (date) date.onchange = () => { draft().date = date.value || todayISO(); saveDraft(); render(); };
    const pain = $("#f-pain"); if (pain) { pain.oninput = () => { $("#pain-val").textContent = pain.value; }; pain.onchange = () => { draft().pain = Number(pain.value); saveDraft(); render(); }; }
    view.querySelectorAll("[data-seg] button").forEach(b => b.onclick = () => {
      const k = b.closest("[data-seg]").dataset.seg;
      if (k === "kind" || k === "day") { draft()[k] = b.dataset.v; saveDraft(); render(); return; }
      const v = Number(b.dataset.v); draft()[k] = draft()[k] === v && k === "mood" ? null : v; saveDraft(); render();
    });
    const lk = $("#f-link"); if (lk) lk.oninput = () => { draft().link = lk.value.trim(); saveDraft(); };
    const mins = $("#f-min"); if (mins) mins.oninput = () => { draft().minutes = mins.value; saveDraft(); };
    const note = $("#f-note"); if (note) note.oninput = () => { draft().note = note.value; saveDraft(); };
    const save = $("#save-session"); if (save) save.onclick = saveSession;
    const clear = $("#clear-draft"); if (clear) clear.onclick = () => {
      if (draft().editId) { state.draft = newDraft(); saveDraft(); toast("Úprava zrušena"); go("history"); return; }
      state.draft = newDraft(draft().kind); saveDraft(); render(); toast("Zápis vymazán"); };

    view.querySelectorAll("[data-react]").forEach(b => b.onclick = () => toggleReaction(b.dataset.sid, b.dataset.react));
    view.querySelectorAll("[data-del]").forEach(b => b.onclick = () => confirmDelete(b));

    view.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => { $("#f-msg").value = b.dataset.quick; $("#f-msg").focus(); });
    const send = $("#send-msg"); if (send) send.onclick = sendMessage;

    const sp = $("#save-profile"); if (sp) sp.onclick = saveProfile;
    const up = $("#upload-plan"); if (up) up.onclick = uploadPlan;
    view.querySelectorAll("[data-setrole]").forEach(b => b.onclick = () => { state.role = b.dataset.setrole; LS.set("role", state.role); render(); toast(isPartner() ? "Teď fandíš" : "Teď cvičíš"); });
    const cp = $("#copy-link"); if (cp) cp.onclick = () => { const i = $("#s-link"); navigator.clipboard?.writeText(i.value).then(() => toast("Odkaz zkopírován")).catch(() => { i.select(); toast("Označeno, zkopíruj ručně"); }); };
    const ex = $("#export"); if (ex) ex.onclick = exportJSON;
    const rs = $("#reset-local"); if (rs) rs.onclick = () => { if (rs.dataset.armed) { ["role", "pair", "draft", "tab", "lastSeenMsg"].forEach(k => localStorage.removeItem("telo-zpet:" + k)); location.href = location.pathname; } else { rs.dataset.armed = "1"; rs.textContent = "Opravdu odhlásit?"; } };
    if (window.Push && state.tab === "settings") Push.bind(pushCtx(), view);
  }

  async function saveSession() {
    const d = draft(), st = stats();
    let sess;
    const J = jokerById(d.kind);
    if (J) {
      sess = { date: d.date || todayISO(), kind: J.id, planWeek: st.planWeek, exercises: { [J.ex]: { sets: 1 } }, ...(safeLink(d.link) ? { link: safeLink(d.link) } : {}), minutes: Number(d.minutes) || 0, pain: Number(d.pain) || 0, swelling: Number(d.swelling) || 0, mood: d.mood ?? null, note: (d.note || "").trim(), createdAt: Date.now() };
    } else {
      const exercises = {}; Object.entries(d.exercises).forEach(([k, v]) => { if (v && v.sets > 0) exercises[k] = v.kg > 0 ? { sets: v.sets, kg: v.kg } : { sets: v.sets }; });
      if (!Object.keys(exercises).length) return;
      const wk = (d.editId && plan().weeks.find(w => w.week === d.planWeek)) || st.week, day = dayOf(wk, d.day || nextDayId(wk)).id;
      sess = { date: d.date || todayISO(), kind: "strength", planWeek: st.planWeek, ...(day ? { day } : {}), exercises, pain: Number(d.pain) || 0, swelling: Number(d.swelling) || 0, mood: d.mood ?? null, note: (d.note || "").trim(), createdAt: Date.now() };
    }
    if (d.editId) {
      Object.assign(sess, { planWeek: d.planWeek ?? sess.planWeek, createdAt: d.createdAt || sess.createdAt, updatedAt: Date.now() });
      try { await store.set(`${BASE}/sessions/${d.editId}`, sess); state.draft = newDraft(); saveDraft(); toast("Změny uloženy"); go("history"); }
      catch (e) { console.error(e); toast("Uložení se nepovedlo, zkus to znovu"); }
      return;
    }
    try {
      await store.push(`${BASE}/sessions`, sess);
      state.draft = newDraft(); saveDraft();
      const after = stats();
      const counted = !J || after.countedJoker.size > st.countedJoker.size;
      toast(!counted ? `${J.short}: uloženo navíc, žolík je tento týden vyčerpaný.` : after.thisWeekCount >= after.goal ? "Uloženo. Týden splněný!" : `Uloženo. ${after.thisWeekCount} z ${after.goal} tento týden.`);
      go("home");
    } catch (e) { console.error(e); toast("Uložení se nepovedlo, zkus to znovu"); }
  }

  function confirmDelete(b) {
    if (b.dataset.armed) { if (draft().editId === b.dataset.del) { state.draft = newDraft(); saveDraft(); } store.remove(`${BASE}/sessions/${b.dataset.del}`); store.remove(`${BASE}/reactions/${b.dataset.del}`); toast("Trénink smazán"); }
    else { b.dataset.armed = "1"; b.textContent = "Opravdu smazat?"; }
  }

  async function toggleReaction(sid, emoji) {
    const existing = Object.entries(state.data.reactions?.[sid] || {}).find(([, r]) => r.emoji === emoji && r.from === state.role);
    if (existing) await store.remove(`${BASE}/reactions/${sid}/${existing[0]}`);
    else await store.push(`${BASE}/reactions/${sid}`, { emoji, from: state.role, createdAt: Date.now() });
  }

  async function sendMessage() {
    const ta = $("#f-msg"); const text = ta.value.trim(); if (!text) return;
    await store.push(`${BASE}/messages`, { text, from: state.role, createdAt: Date.now() });
    ta.value = ""; toast("Odesláno");
    state.lastSeenMsg = Date.now(); LS.set("lastSeenMsg", state.lastSeenMsg);
  }

  async function saveProfile() {
    await store.update(`${BASE}/profile`, {
      patientName: $("#s-patient").value.trim(), partnerName: $("#s-partner").value.trim(),
      surgeryDate: $("#s-surgery").value || "", weeklyGoal: Number($("#s-goal").value) || plan().weeklyGoal,
      planWeek: Number($("#s-week").value) || 0
    });
    toast("Uloženo");
  }

  async function uploadPlan() {
    try { await store.set(`${BASE}/plan`, planForDb()); toast(`Plán verze ${window.PLAN.version} nahrán`); }
    catch (e) { console.error(e); toast("Nahrání se nepovedlo"); }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify({ pair, exportedAt: new Date().toISOString(), ...state.data }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `telo-zpet-${todayISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- start ---------- */
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => go(t.dataset.tab));
  store.subscribe(BASE, val => { state.data = Object.assign({ ...EMPTY }, val || {}); render(); });
  store.onConnection(c => { state.connected = c; render(); });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && state.timer && state.timer.endsAt) { keepAwake(true); tickTimer(); } });
  render();
  if (window.Push) Push.init(() => { if (state.tab === "settings") render(); });
})();
