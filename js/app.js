/* Šlacha zpět: aplikační logika. Vanilla JS, žádný build. */
(function () {
  "use strict";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s ?? "").replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const LS = {
    get(k, d) { try { const v = localStorage.getItem("slacha-zpet:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("slacha-zpet:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
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
  if (params.get("pair")) history.replaceState(null, "", location.pathname);

  const store = window.createStore();
  const BASE = `pairs/${pair}`;
  const EMPTY = { profile: null, sessions: null, messages: null, reactions: null, plan: null };
  const state = {
    role: LS.get("role", null),            // "patient" | "partner"
    tab: LS.get("tab", "home"),
    data: { ...EMPTY },
    connected: store.mode === "local",
    draft: LS.get("draft", null),
    openEx: {},
    showAllWeeks: false,
    showAllEx: false,
    showSteps: LS.get("showSteps", true),
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
  function itemTarget(it) {
    const main = it.time ? `${it.sets} × ${it.time}` : `${it.sets} × ${it.reps}`;
    return main + (it.hold ? `, výdrž ${it.hold}` : "");
  }
  function planForDb() {
    const p = window.PLAN;
    return { version: p.version, name: p.name, weeklyGoal: p.weeklyGoal, joker: p.joker || null, source: p.source || null, phases: p.phases, rules: p.rules, exercises: p.exercises, weeks: p.weeks, cheers: p.cheers, uploadedAt: Date.now() };
  }
  // Poslední zapsaná zátěž u cviku, pro nápovědu a progresi.
  function lastKg(id) { const s = sessions().find(s => Number(s.exercises?.[id]?.kg) > 0); return s ? Number(s.exercises[id].kg) : null; }
  const joker = () => plan().joker || { ex: "bike", perWeek: 1, minKm: 10, defaultKm: 20 };
  const isBike = s => s.kind === "bike";

  const profile = () => Object.assign({ patientName: "", partnerName: "", surgeryDate: "", weeklyGoal: plan().weeklyGoal, planWeek: 0 }, state.data.profile || {});
  const sessions = () => Object.entries(state.data.sessions || {}).map(([id, s]) => ({ id, ...s })).sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0));
  const messages = () => Object.entries(state.data.messages || {}).map(([id, m]) => ({ id, ...m })).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const her = () => profile().patientName || "parťák";
  const him = () => profile().partnerName || "fanoušek";
  const isPartner = () => state.role === "partner";

  /* ---------- výpočty ---------- */
  function stats() {
    const ss = sessions();
    const P = plan();
    const goal = Math.max(1, Number(profile().weeklyGoal) || P.weeklyGoal);
    const today = todayISO();
    const thisWeek = weekKey(today);
    const J = joker();
    const byWeek = {}, bikeByWeek = {}, countedBike = new Set();
    ss.slice().reverse().forEach(s => {
      const k = weekKey(s.date);
      if (isBike(s)) {
        bikeByWeek[k] = (bikeByWeek[k] || 0) + 1;
        if (bikeByWeek[k] <= J.perWeek) { countedBike.add(s.id); byWeek[k] = (byWeek[k] || 0) + 1; }
      } else byWeek[k] = (byWeek[k] || 0) + 1;
    });
    const bikeRides = ss.filter(isBike);
    const maxKg = ss.reduce((m, s) => Math.max(m, Number(s.exercises?.raisesingle?.kg) || 0), 0);
    const bikeKm = bikeRides.reduce((a, s) => a + (Number(s.km) || 0), 0);

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
    const jokerUsed = (bikeByWeek[thisWeek] || 0) >= J.perWeek;
    const strengthThisWeek = ss.filter(s => !isBike(s) && weekKey(s.date) === thisWeek).length;

    const override = Number(profile().planWeek) || 0;
    const planWeek = Math.min(P.weeks.length, Math.max(1, override || weeksHit + 1));
    const week = P.weeks.find(w => w.week === planWeek) || P.weeks[P.weeks.length - 1];
    const phase = P.phases.find(ph => ph.id === week.phase) || P.phases[0];

    return { goal, thisWeekCount: byWeek[thisWeek] || 0, weeks, streak, bestStreak, weeksHit, calmRun, total: ss.filter(s => !isBike(s)).length + countedBike.size, last, sinceLast, weekPost, trainedToday,
      jokerUsed, strengthThisWeek, countedBike, bikeRides: bikeRides.length, bikeKm, maxKg, J,
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
      title = st.trainedToday ? "Dnes hotovo. Odpočívej." : st.thisWeekCount >= st.goal ? "Týden splněný. Víc není potřeba." : st.thisWeekCount === 0 ? "Nový týden, čistý štít." : `Ještě ${st.goal - st.thisWeekCount}× a týden je tvůj.`;
      lede = st.trainedToday ? "Šlacha se přestavuje v klidu. Zítra ráno zapiš, jak se probudila." : st.jokerUsed && st.thisWeekCount < st.goal ? "Žolík za kolo je tento týden použitý, zbytek už je posilování." : `${st.week.title}: ${st.week.focus}`;
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
          <p class="eyebrow">${name || (st.weekPost ? `${st.weekPost}. týden rehabilitace` : "Rehabilitace")}</p>
          <h1>${esc(title)}</h1>
          <p class="lede muted">${esc(lede)}</p>
        </div>
        ${Charts.ring(st.thisWeekCount, st.goal)}
      </div>
      ${!isPartner() && !st.trainedToday ? `<button class="btn btn-primary btn-block" data-go="log" type="button">Zapsat dnešní trénink</button>` : ""}
      ${isPartner() ? `<button class="btn btn-primary btn-block" data-go="cheer" type="button">Napsat povzbuzení</button>` : ""}
    </section>

    ${!isPartner() && lastMsg ? `<section class="section"><div class="msg partner" style="max-width:100%"><div>${esc(lastMsg.text)}</div><div class="meta">${esc(him())} · ${fmtTime(lastMsg.createdAt)}</div></div></section>` : ""}

    <section class="section">
      <div class="stats">
        <div class="stat"><div class="v num">${st.total}</div><div class="l">tréninků celkem</div></div>
        <div class="stat"><div class="v num">${st.streak}</div><div class="l">${plural(st.streak, "týden", "týdny", "týdnů")} v řadě se splněným cílem</div></div>
        <div class="stat"><div class="v num">${st.sinceLast === null ? "–" : st.sinceLast === 0 ? "dnes" : st.sinceLast}</div><div class="l">${st.sinceLast === null ? "žádný trénink" : st.sinceLast === 0 ? "poslední trénink" : (st.sinceLast === 1 ? "den od tréninku" : "dní od tréninku")}</div></div>
        <div class="stat"><div class="v num">${st.weekPost ?? "–"}</div><div class="l">${st.weekPost ? "týden rehabilitace" : "začátek rehabilitace v nastavení"}</div></div>
        ${st.bikeRides ? `<div class="stat"><div class="v num">${Math.round(st.bikeKm)} km</div><div class="l">na kole do práce, ${st.bikeRides} ${plural(st.bikeRides, "jízda", "jízdy", "jízd")}</div></div>` : ""}
      </div>
    </section>

    <section class="section">
      <div class="phase">
        <p class="eyebrow">Týden plánu ${st.planWeek} z ${P.weeks.length} · ${esc(st.week.title)}</p>
        <p class="small"><strong>Fáze ${st.phase.id}, ${esc(st.phase.name)}.</strong> ${esc(st.phase.summary)}</p>
        <div class="phase-steps">${P.weeks.map(w => `<span class="${w.week < st.planWeek ? "on" : w.week === st.planWeek ? "now" : ""}" title="Týden ${w.week}: ${esc(w.title)}"></span>`).join("")}</div>
        <p class="small muted">${st.planDone ? "Celý plán je splněný. Výpony se zátěží dál 2× týdně jako prevence." : nextIdx < P.phases.length ? `Do fáze ${P.phases[nextIdx].id} (${esc(P.phases[nextIdx].name)}): ${weeksLeftInPhase} ${plural(weeksLeftInPhase, "splněný týden", "splněné týdny", "splněných týdnů")} bez horšího rána.` : ""}</p>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Tréninky za týden</h2><span class="small muted">posledních 8 týdnů</span></div>
      ${Charts.weeklyBars(st.weeks, st.goal)}
    </section>

    <section class="section">
      <div class="section-head"><h2>Bolest šlachy při tréninku</h2><span class="small muted">0 = nic, do 3 v pořádku</span></div>
      ${st.painPoints.length ? Charts.painLine(st.painPoints) : `<div class="empty">Objeví se po prvním zapsaném tréninku.</div>`}
    </section>

    <section class="section">
      <div class="section-head"><h2>Milníky</h2></div>
      ${renderMilestones(st)}
    </section>`;
  }

  function renderMilestones(st) {
    return `<div class="miles">${window.MILESTONES.map(m => `<div class="mile ${m.test(st) ? "hit" : ""}"><div class="n">${esc(m.name)}</div><div class="d">${esc(m.desc)}</div></div>`).join("")}</div>`;
  }

  /* ---------- zápis tréninku ---------- */
  function newDraft(kind) { return { kind: kind || "strength", date: todayISO(), exercises: {}, km: joker().defaultKm, minutes: "", pain: 0, swelling: 0, mood: null, note: "" }; }
  function draft() { if (!state.draft) state.draft = newDraft(); if (!state.draft.exercises) state.draft.exercises = {}; return state.draft; }
  function saveDraft() { LS.set("draft", state.draft); }

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
        <ul class="small" style="margin:6px 0 0;padding-left:18px">${w.items.map(it => `<li>${esc(exName(it.ex))}: ${esc(itemTarget(it))}${it.note ? ` <span class="muted">(${esc(it.note)})</span>` : ""}</li>`).join("")}</ul>
      </div>`).join("")}</div>` : ""}
    </section>`;
  }

  function renderLog() {
    const st = stats();
    if (isPartner()) {
      return `<section class="section"><p class="eyebrow">Plán</p><h1>Co ${esc(her())} teď cvičí</h1>${renderWeekHeader(st)}</section>
      <section class="section"><div class="list">${st.week.items.map(it => renderExCard(it, null, true)).join("")}</div></section>
      ${renderJokerCard(st)}${renderAllExercises()}${renderAllWeeks(st)}${renderRules()}${renderResources()}`;
    }
    const d = draft();
    const bike = d.kind === "bike";
    const doneCount = bike ? (Number(d.km) > 0 ? 1 : 0) : st.week.items.filter(it => (d.exercises[it.ex]?.sets || 0) > 0).length;
    const moods = ["Skvěle", "Dobře", "Ok", "Těžké", "Bolelo"];
    const swell = ["Žádná", "Mírná", "Výrazná"];
    const kindSwitch = `<div class="seg" data-seg="kind"><button type="button" data-v="strength" class="${!bike ? "on" : ""}">Posilování</button><button type="button" data-v="bike" class="${bike ? "on" : ""}">Kolo do práce (žolík)</button></div>`;
    return `
    <section class="section">
      <div><p class="eyebrow">Zápis tréninku</p><h1>${bike ? (d.date === todayISO() ? "Dnes na kole" : "Na kole " + esc(fmtLong(d.date))) : d.date === todayISO() ? "Dnešní sestava" : "Sestava " + esc(fmtLong(d.date))}</h1></div>
      ${kindSwitch}
      ${bike ? "" : renderWeekHeader(st)}
      ${bike ? "" : `<div class="row" style="align-items:center"><p class="muted small">Klepni na čísla sérií, které máš hotové.</p><button class="linkbtn" id="toggle-steps" type="button" style="white-space:nowrap">${state.showSteps ? "Skrýt popisy" : "Zobrazit popisy"}</button></div>`}
      <div class="field"><label for="f-date">Datum</label><input type="date" id="f-date" value="${esc(d.date)}" max="${todayISO()}"></div>
    </section>
    ${bike ? renderBikeForm(st, d) : `<section class="section"><div class="list">${st.week.items.map(it => renderExCard(it, d.exercises[it.ex] || { sets: 0 }, false)).join("")}</div></section>`}

    <section class="section card" style="display:grid;gap:16px">
      <div class="field">
        <div class="lab">Bolest šlachy při tréninku: <span class="num" id="pain-val">${d.pain}</span>/10</div>
        <input type="range" id="f-pain" min="0" max="10" step="1" value="${d.pain}">
        <div class="range-labels"><span>nic</span><span>do 3 v pořádku</span><span>ostrá</span></div>
        ${d.pain >= 5 ? `<p class="pain-warn">Bolest nad 4 z 10 je na šlachu moc. Příště uber zátěž nebo opakování a sleduj, jaké bude ráno.</p>` : ""}
      </div>
      <div class="field"><div class="lab">Ranní ztuhlost šlachy (dnes ráno)</div><div class="seg" data-seg="swelling">${swell.map((s, i) => `<button type="button" data-v="${i}" class="${d.swelling === i ? "on" : ""}">${s}</button>`).join("")}</div></div>
      <div class="field"><div class="lab">Jak to šlo</div><div class="seg" data-seg="mood">${moods.map((s, i) => `<button type="button" data-v="${i}" class="${d.mood === i ? "on" : ""}">${s}</button>`).join("")}</div></div>
      <div class="field"><label for="f-note">Poznámka</label><textarea id="f-note" placeholder="${bike ? "Např. protivítr, šlacha po jízdě v klidu…" : "Např. výpony s 8 kg, první kroky ráno bez bolesti…"}">${esc(d.note)}</textarea></div>
      <button class="btn btn-primary btn-block" id="save-session" type="button" ${doneCount ? "" : "disabled"}>${bike ? (doneCount ? "Uložit jízdu" : "Zadej kilometry") : doneCount ? `Uložit trénink (${doneCount} ${plural(doneCount, "cvik", "cviky", "cviků")})` : "Označ aspoň jeden cvik"}</button>
      <button class="linkbtn" id="clear-draft" type="button">Vymazat rozpracovaný zápis</button>
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
      ${readOnly ? "" : `<div class="sets"><span class="lab">${n === 1 ? "Hotovo" : "Série"}</span>${Array.from({ length: n }, (_, i) => i + 1).map(k => `<button type="button" class="setbtn ${sets >= k ? "on" : ""}" data-set="${esc(it.ex)}" data-n="${k}" aria-pressed="${sets >= k}">${n === 1 ? "✓" : k}</button>`).join("")}</div>`}
    </div>`;
  }

  function renderBikeForm(st, d) {
    const e = plan().exercises[joker().ex] || { name: "Kolo do práce", steps: [] };
    const sameWeek = weekKey(d.date) === weekKey(todayISO());
    const used = sameWeek ? st.jokerUsed : false;
    return `<section class="section">
      <div class="card ex open">
        <div class="ex-head"><div><h3>${esc(e.name)}</h3><div class="ex-target">Nahradí nejvýš ${joker().perWeek === 1 ? "jeden trénink" : joker().perWeek + " tréninky"} týdně · aspoň ${joker().minKm} km</div></div></div>
        <div class="ex-body small">${renderExBody(e)}</div>
      </div>
      ${used ? `<div class="note">Žolík za kolo je tento týden už použitý. Jízda se zapíše, ale do cíle ${st.goal}× týdně se nepočítá. Zbytek týdne patří posilování.</div>` : `<div class="card-soft card small">Tato jízda se započítá jako ${st.thisWeekCount + 1}. trénink tohoto týdne.</div>`}
      <div class="card" style="display:grid;gap:12px">
        <div class="field"><label for="f-km">Kilometry celkem za den</label><input type="number" id="f-km" inputmode="decimal" min="0" step="0.5" value="${esc(d.km)}"><p class="small muted">Tam i zpět dohromady. Jedna cesta je asi 10 km.</p></div>
        <div class="field"><label for="f-min">Čas v sedle (minuty, nepovinné)</label><input type="number" id="f-min" inputmode="numeric" min="0" step="1" value="${esc(d.minutes)}" placeholder="např. 50"></div>
      </div>
    </section>`;
  }

  function renderJokerCard(st) {
    const e = plan().exercises[joker().ex];
    if (!e) return "";
    return `<section class="section"><h2>Žolík: ${esc(e.name)}</h2><div class="card-soft card small"><p>${esc(e.why)}</p><p class="muted" style="margin-top:6px">${st.jokerUsed ? "Tento týden už použitý." : "Tento týden ještě volný."} Zapisuje se v záložce Trénink přepnutím na „Kolo do práce“.</p></div></section>`;
  }

  function renderExBody(e) {
    return `${e.why ? `<p class="muted">${esc(e.why)}</p>` : ""}
      ${e.gear ? `<p><strong>Potřebuješ:</strong> ${esc(e.gear)}</p>` : ""}
      ${(e.steps || []).length ? `<p class="ex-lab">Provedení</p><ol>${e.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      ${(e.avoid || []).length ? `<p class="ex-lab">Na co si dát pozor</p><ul>${e.avoid.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
      ${e.tip ? `<p><strong>Tip:</strong> ${esc(e.tip)}</p>` : ""}
      ${/^https:\/\//.test(e.video || "") ? `<p><a href="${esc(e.video)}" target="_blank" rel="noopener">${/youtu/.test(e.video) ? "Video ukázka" : "Návod s obrázky (Fyzioklinika)"} ↗</a></p>` : ""}`;
  }

  function renderAllExercises() {
    const P = plan();
    const ids = Object.keys(P.exercises);
    return `<section class="section">
      <div class="section-head"><h2>Všechny cviky</h2><button class="linkbtn" id="toggle-ex" type="button">${state.showAllEx ? "Skrýt" : "Zobrazit všech " + ids.length}</button></div>
      ${state.showAllEx ? `<div class="list">${ids.map(id => { const e = P.exercises[id]; const wk = P.weeks.filter(w => w.items.some(it => it.ex === id)).map(w => w.week); return `<div class="card ex open">
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
    const ss = sessions();
    if (!ss.length) return `<section class="section"><h1>Historie</h1><div class="empty">Zatím žádný trénink. ${isPartner() ? "Až ho zapíše, uvidíš ho tady a můžeš zareagovat." : "První zápis je v záložce Trénink."}</div></section>`;
    const reacts = state.data.reactions || {};
    const st = stats();
    const moods = ["skvěle", "dobře", "ok", "těžké", "bolelo"], swell = ["ráno bez ztuhlosti", "ráno mírně ztuhlá", "ráno výrazně ztuhlá"];
    return `<section class="section"><div class="section-head"><h1>Historie</h1><span class="muted small num">${ss.length} ${plural(ss.length, "trénink", "tréninky", "tréninků")}</span></div>
    <div class="list">${ss.map(s => {
      const ex = isBike(s) ? [] : Object.entries(s.exercises || {}).filter(([, v]) => (v?.sets || 0) > 0);
      const bikeChips = isBike(s) ? `<span class="chip ok">🚲 Kolo ${Number(s.km) || 0} km${s.minutes ? ` · ${s.minutes} min` : ""}</span><span class="chip">${st.countedBike.has(s.id) ? "žolík, počítá se" : "navíc, nepočítá se"}</span>` : "";
      const rs = Object.entries(reacts[s.id] || {}).map(([id, r]) => ({ id, ...r }));
      const counts = {}; rs.forEach(r => { counts[r.emoji] = counts[r.emoji] || { n: 0, mine: false }; counts[r.emoji].n++; if (r.from === state.role) counts[r.emoji].mine = true; });
      return `<article class="card sess" data-sid="${s.id}">
        <div class="sess-head"><span class="d">${esc(fmtLong(s.date))}${s.planWeek ? ` <span class="muted small">· ${s.planWeek}. týden plánu</span>` : ""}</span>
          <span class="chips"><span class="chip pain-${Number(s.pain) || 0}">bolest ${Number(s.pain) || 0}</span><span class="chip">${swell[s.swelling] || swell[0]}</span>${s.mood !== null && s.mood !== undefined ? `<span class="chip">${moods[s.mood]}</span>` : ""}</span></div>
        <div class="chips">${bikeChips || ex.map(([id, v]) => `<span class="chip ok">${esc(exName(id))} ${v.sets}×${v.kg ? ` · ${v.kg} kg` : ""}</span>`).join("") || `<span class="chip">bez cviků</span>`}</div>
        ${s.note ? `<p class="small">${esc(s.note)}</p>` : ""}
        <div class="reacts">
          ${["💪", "❤️", "🔥", "👏"].map(em => `<button type="button" class="react ${counts[em]?.mine ? "mine" : ""}" data-react="${em}" data-sid="${s.id}">${em}${counts[em] ? `<span class="c num">${counts[em].n}</span>` : ""}</button>`).join("")}
          ${!isPartner() ? `<button type="button" class="linkbtn" data-del="${s.id}" style="margin-left:auto">Smazat</button>` : ""}
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
      <div class="field"><label for="f-msg">${isPartner() ? "Vlastní zpráva" : "Odpověď"}</label><textarea id="f-msg" placeholder="${isPartner() ? "Co jí chceš říct…" : "Díky, dneska to šlo…"}"></textarea></div>
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
      <div class="field"><label for="s-patient">Kdo cvičí (jméno)</label><input type="text" id="s-patient" value="${esc(p.patientName)}" placeholder="např. Honza"></div>
      <div class="field"><label for="s-partner">Kdo fandí (jméno)</label><input type="text" id="s-partner" value="${esc(p.partnerName)}" placeholder="např. Káťa"></div>
      <div class="field"><label for="s-surgery">Začátek rehabilitace</label><input type="date" id="s-surgery" value="${esc(p.surgeryDate)}" max="${todayISO()}"></div>
      <div class="field"><label for="s-goal">Cíl tréninků za týden</label><select id="s-goal">${[2, 3, 4].map(n => `<option value="${n}" ${Number(p.weeklyGoal) === n ? "selected" : ""}>${n}× týdně</option>`).join("")}</select></div>
      <div class="field"><label for="s-week">Týden plánu</label><select id="s-week"><option value="0" ${!Number(p.planWeek) ? "selected" : ""}>Automaticky (teď ${st.weeksHit + 1 > P.weeks.length ? P.weeks.length : st.weeksHit + 1}. podle splněných týdnů)</option>${P.weeks.map(w => `<option value="${w.week}" ${Number(p.planWeek) === w.week ? "selected" : ""}>Týden ${w.week} · ${esc(w.title)}</option>`).join("")}</select>
        <p class="small muted">Ručně nastav, když chceš týden zopakovat (bolest, horší ráno, pauza) nebo přeskočit.</p></div>
      <button class="btn btn-primary" id="save-profile" type="button">Uložit</button>
    </section>
    <section class="section card" style="display:grid;gap:12px">
      <h2>Tréninkový plán</h2>
      <div class="kv"><span>Používá se</span><span class="small">${planSource() === "db" ? `z databáze, verze ${esc(dbVer ?? "?")}` : `vestavěný, verze ${esc(window.PLAN.version)}`}</span></div>
      <div class="kv"><span>Rozsah</span><span class="small">${P.weeks.length} ${plural(P.weeks.length, "týden", "týdny", "týdnů")}, ${Object.keys(P.exercises).length} cviků</span></div>
      <div class="kv"><span>Žolík</span><span class="small">kolo do práce, nejvýš ${joker().perWeek}× týdně místo tréninku</span></div>
      ${store.mode === "cloud"
        ? `<p class="small muted">${planSource() === "db" && dbVer >= window.PLAN.version ? "Databáze má aktuální plán." : planSource() === "db" ? `V appce je novější plán (verze ${window.PLAN.version}). Nahraj ho, aby ho viděli oba.` : "Plán zatím není v databázi. Nahraj ho, ať ho jde později upravovat bez změny kódu."}</p>
           <button class="btn btn-ghost" id="upload-plan" type="button">Nahrát plán do databáze (verze ${window.PLAN.version})</button>`
        : `<p class="small muted">Po zapnutí Firebase půjde plán nahrát do databáze jedním klepnutím tady.</p>`}
    </section>
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

  /* ---------- akce ---------- */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { t.hidden = true; }, 2200); }
  function go(tab) { state.tab = tab; LS.set("tab", tab); if (tab === "cheer") { const last = messages().slice(-1)[0]; state.lastSeenMsg = last ? last.createdAt : state.lastSeenMsg; LS.set("lastSeenMsg", state.lastSeenMsg); } window.scrollTo(0, 0); render(); }

  function bind() {
    view.querySelectorAll("[data-role]").forEach(b => b.onclick = () => { state.role = b.dataset.role; LS.set("role", state.role); go("home"); });
    view.querySelectorAll("[data-go]").forEach(b => b.onclick = () => go(b.dataset.go));
    view.querySelectorAll("[data-toggle]").forEach(b => b.onclick = () => { const id = b.dataset.toggle; const cur = state.openEx[id] !== undefined ? state.openEx[id] : state.showSteps; state.openEx[id] = !cur; render(); });
    const ts = $("#toggle-steps"); if (ts) ts.onclick = () => { state.showSteps = !state.showSteps; state.openEx = {}; LS.set("showSteps", state.showSteps); render(); };
    const te = $("#toggle-ex"); if (te) te.onclick = () => { state.showAllEx = !state.showAllEx; render(); };
    view.querySelectorAll("[data-set]").forEach(b => b.onclick = () => {
      const d = draft(), id = b.dataset.set, n = Number(b.dataset.n);
      d.exercises[id] = { ...d.exercises[id], sets: (d.exercises[id]?.sets === n) ? n - 1 : n };
      saveDraft(); render();
    });
    view.querySelectorAll("[data-kg]").forEach(i => i.onchange = () => { const d = draft(), id = i.dataset.kg; d.exercises[id] = { sets: 0, ...d.exercises[id], kg: i.value === "" ? null : Number(i.value) }; saveDraft(); });
    const tw = $("#toggle-weeks"); if (tw) tw.onclick = () => { state.showAllWeeks = !state.showAllWeeks; render(); };
    const date = $("#f-date"); if (date) date.onchange = () => { draft().date = date.value || todayISO(); saveDraft(); render(); };
    const pain = $("#f-pain"); if (pain) { pain.oninput = () => { $("#pain-val").textContent = pain.value; }; pain.onchange = () => { draft().pain = Number(pain.value); saveDraft(); render(); }; }
    view.querySelectorAll("[data-seg] button").forEach(b => b.onclick = () => {
      const k = b.closest("[data-seg]").dataset.seg;
      if (k === "kind") { draft().kind = b.dataset.v; saveDraft(); render(); return; }
      const v = Number(b.dataset.v); draft()[k] = draft()[k] === v && k === "mood" ? null : v; saveDraft(); render();
    });
    const km = $("#f-km"); if (km) km.onchange = () => { draft().km = km.value; saveDraft(); render(); };
    const mins = $("#f-min"); if (mins) mins.oninput = () => { draft().minutes = mins.value; saveDraft(); };
    const note = $("#f-note"); if (note) note.oninput = () => { draft().note = note.value; saveDraft(); };
    const save = $("#save-session"); if (save) save.onclick = saveSession;
    const clear = $("#clear-draft"); if (clear) clear.onclick = () => { state.draft = newDraft(draft().kind); saveDraft(); render(); toast("Zápis vymazán"); };

    view.querySelectorAll("[data-react]").forEach(b => b.onclick = () => toggleReaction(b.dataset.sid, b.dataset.react));
    view.querySelectorAll("[data-del]").forEach(b => b.onclick = () => confirmDelete(b));

    view.querySelectorAll("[data-quick]").forEach(b => b.onclick = () => { $("#f-msg").value = b.dataset.quick; $("#f-msg").focus(); });
    const send = $("#send-msg"); if (send) send.onclick = sendMessage;

    const sp = $("#save-profile"); if (sp) sp.onclick = saveProfile;
    const up = $("#upload-plan"); if (up) up.onclick = uploadPlan;
    view.querySelectorAll("[data-setrole]").forEach(b => b.onclick = () => { state.role = b.dataset.setrole; LS.set("role", state.role); render(); toast(isPartner() ? "Teď fandíš" : "Teď cvičíš"); });
    const cp = $("#copy-link"); if (cp) cp.onclick = () => { const i = $("#s-link"); navigator.clipboard?.writeText(i.value).then(() => toast("Odkaz zkopírován")).catch(() => { i.select(); toast("Označeno, zkopíruj ručně"); }); };
    const ex = $("#export"); if (ex) ex.onclick = exportJSON;
    const rs = $("#reset-local"); if (rs) rs.onclick = () => { if (rs.dataset.armed) { ["role", "pair", "draft", "tab", "lastSeenMsg"].forEach(k => localStorage.removeItem("slacha-zpet:" + k)); location.href = location.pathname; } else { rs.dataset.armed = "1"; rs.textContent = "Opravdu odhlásit?"; } };
  }

  async function saveSession() {
    const d = draft(), st = stats();
    let sess;
    if (d.kind === "bike") {
      const kmv = Number(d.km) || 0; if (kmv <= 0) return;
      sess = { date: d.date || todayISO(), kind: "bike", planWeek: st.planWeek, exercises: { [joker().ex]: { sets: 1 } }, km: kmv, minutes: Number(d.minutes) || 0, pain: Number(d.pain) || 0, swelling: Number(d.swelling) || 0, mood: d.mood ?? null, note: (d.note || "").trim(), createdAt: Date.now() };
    } else {
      const exercises = {}; Object.entries(d.exercises).forEach(([k, v]) => { if (v && v.sets > 0) exercises[k] = v.kg > 0 ? { sets: v.sets, kg: v.kg } : { sets: v.sets }; });
      if (!Object.keys(exercises).length) return;
      sess = { date: d.date || todayISO(), kind: "strength", planWeek: st.planWeek, exercises, pain: Number(d.pain) || 0, swelling: Number(d.swelling) || 0, mood: d.mood ?? null, note: (d.note || "").trim(), createdAt: Date.now() };
    }
    try {
      await store.push(`${BASE}/sessions`, sess);
      state.draft = newDraft(); saveDraft();
      const after = stats();
      const counted = sess.kind !== "bike" || after.countedBike.size > st.countedBike.size;
      toast(!counted ? "Jízda uložena jako navíc, žolík byl už použitý." : after.thisWeekCount >= after.goal ? "Uloženo. Týden splněný!" : `Uloženo. ${after.thisWeekCount} z ${after.goal} tento týden.`);
      go("home");
    } catch (e) { console.error(e); toast("Uložení se nepovedlo, zkus to znovu"); }
  }

  function confirmDelete(b) {
    if (b.dataset.armed) { store.remove(`${BASE}/sessions/${b.dataset.del}`); store.remove(`${BASE}/reactions/${b.dataset.del}`); toast("Trénink smazán"); }
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
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `slacha-zpet-${todayISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- start ---------- */
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => go(t.dataset.tab));
  store.subscribe(BASE, val => { state.data = Object.assign({ ...EMPTY }, val || {}); render(); });
  store.onConnection(c => { state.connected = c; render(); });
  render();
})();
