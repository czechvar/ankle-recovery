#!/usr/bin/env node
// Rozesílá upozornění (Web Push) na telefony, které si je zapnuly v Nastavení.
// Spouští ho GitHub Action každých 15 minut (.github/workflows/notify.yml).
//
// Projde pairs/<kód> v databázi a pošle:
//   - parťákovi: nový trénink, zprávu, reakci
//   - cvičícímu: zprávu, reakci, připomínku v tréninkové dny (Europe/Prague),
//     denně připomínku rehabky (cviky od lékaře) a den předem návštěvu kliniky
// Co už bylo odesláno, si pamatuje v pairs/<kód>/push/state.
// Navíc načte Google kalendář rehabky (iCal, jen čtení) a termíny zapíše do pairs/<kód>/calendar.
//
// Proměnné prostředí:
//   FIREBASE_SERVICE_ACCOUNT  JSON klíč servisního účtu (Firebase → Project settings → Service accounts)
//   VAPID_PRIVATE_KEY         soukromý VAPID klíč (veřejný je v js/push.js)
//   FIREBASE_DATABASE_URL     volitelně; jinak databaseURL z js/firebase-config.js
//   REHAB_ICAL_URL            volitelně; tajná adresa kalendáře ve formátu iCal. Bez ní se zkusí
//                             veřejná adresa kalendáře z plánu (funguje jen u veřejného kalendáře).
//
// Test bez sítě:  node scripts/notify.mjs --file data.json [--now 2026-10-13T18:05:00+02:00] [--ics kalendar.ics]
//   data.json je obsah uzlu pairs ({ "<kód>": {...} }); jen vypíše, co by se poslalo.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createSign } from "node:crypto";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter(Boolean));
const TZ = "Europe/Prague";
const DAY = 86400000;
const FIRST_RUN_WINDOW = 30 * 60000;   // při prvním běhu neposílat starou historii

const read = f => readFileSync(resolve(root, f), "utf8");
function loadWindowScript(file) { const ctx = { window: {} }; vm.runInNewContext(read(file), ctx); return ctx.window; }
const APP = (read("index.html").match(/<title>([^<]+)<\/title>/) || [])[1] || "Rehabilitace";
const VAPID_PUBLIC = (read("js/push.js").match(/VAPID_PUBLIC = "([^"]+)"/) || [])[1];
const PLAN = loadWindowScript("js/plan.js").PLAN || {};
// Žolíci (kolo, KB5…); starší plán má jen jednoho `joker` pro kolo.
const JOKERS = Array.isArray(PLAN.jokers) && PLAN.jokers.length ? PLAN.jokers : PLAN.joker ? [{ id: "bike", icon: "🚲", km: true, ...PLAN.joker }] : [];
const jokerById = id => JOKERS.find(j => j.id === id);

/* ---------- čas v Praze ---------- */
const dateIn = ts => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts));              // YYYY-MM-DD
const hourIn = ts => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hourCycle: "h23" }).format(new Date(ts)));
const fromISO = s => { const [y, m, d] = s.split("-").map(Number); return Date.UTC(y, m - 1, d); };
const toISO = t => new Date(t).toISOString().slice(0, 10);
const weekdayIdx = iso => (new Date(fromISO(iso)).getUTCDay() + 6) % 7;                                  // Po = 0
const weekStart = iso => toISO(fromISO(iso) - weekdayIdx(iso) * DAY);
const fmtDate = iso => { const d = new Date(fromISO(iso)); return `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`; };
const plural = (n, a, b, c) => n === 1 ? a : n >= 2 && n <= 4 ? b : c;
const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; };

/* ---------- rehabka ---------- */
const R = PLAN.rehab || {};
// Vestavěné cviky + přidané v appce (rehabEx/<id>), bez vyřazených a bez těch přidaných až po `date`.
function rehabItemsOn(pair, date) {
  const db = pair.rehabEx || {}, base = (Array.isArray(R.items) ? R.items : []).filter(i => i && i.ex);
  const list = base.map(i => ({ ...i, ...(db[i.ex] || {}), ex: i.ex }));
  Object.entries(db).forEach(([id, v]) => { if (v && v.name && !base.some(b => b.ex === id)) list.push({ ...v, ex: id }); });
  return list.filter(i => !i.off && (!i.added || i.added <= date));
}

// Veřejná iCal adresa z odkazu na Google kalendář (…?cid=<base64 id>).
function publicIcal(link) {
  try {
    const cid = new URL(link).searchParams.get("cid"); if (!cid) return "";
    const id = Buffer.from(cid, "base64").toString("utf8");
    return /^[\w.-]+@[\w.-]+$/.test(id) ? `https://calendar.google.com/calendar/ical/${encodeURIComponent(id)}/public/basic.ics` : "";
  } catch (e) { return ""; }
}

// Události z iCal: { date, time, what, where } v pražském čase, od 60 dní zpět po rok dopředu.
// Opakované události (RRULE) se berou jen jednou, první výskyt; termíny na klinice bývají samostatné.
export function parseIcs(text, now) {
  const unesc = s => s.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();
  const events = []; let ev = null;
  for (const l of String(text).replace(/\r?\n[ \t]/g, "").split(/\r?\n/)) {
    if (l === "BEGIN:VEVENT") ev = {};
    else if (l === "END:VEVENT") { if (ev) events.push(ev); ev = null; }
    else if (ev) { const i = l.indexOf(":"); if (i > 0) ev[l.slice(0, i).split(";")[0].toUpperCase()] = l.slice(i + 1); }
  }
  const from = dateIn(now - 60 * DAY), to = dateIn(now + 365 * DAY);
  return events.filter(e => e.DTSTART && (e.STATUS || "").toUpperCase() !== "CANCELLED").map(e => {
    const m = e.DTSTART.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})\d{2}(Z)?)?/); if (!m) return null;
    let date = `${m[1]}-${m[2]}-${m[3]}`, time = m[4] ? `${Number(m[4])}:${m[5]}` : "";
    if (m[6]) {   // UTC → Praha; bez Z je to místní čas kalendáře (TZID=Europe/Prague)
      const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      date = dateIn(t);
      const [h, mi] = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)).split(":");
      time = `${Number(h)}:${mi}`;
    }
    return { date, time, what: clip(unesc(e.SUMMARY || ""), 80) || "Rehabka", where: clip(unesc(e.LOCATION || ""), 120) };
  }).filter(e => e && e.date >= from && e.date <= to)
    .sort((a, b) => (a.date + a.time.padStart(5, "0")) < (b.date + b.time.padStart(5, "0")) ? -1 : 1).slice(0, 200);
}

/* ---------- co poslat jedné dvojici ---------- */
export function planPair(code, pair, now) {
  const push = pair.push || {};
  const subs = Object.entries(push.subs || {}).filter(([, s]) => s && s.sub && s.sub.endpoint);
  const state = push.state || {};
  const since = Number(state.lastCheck) || now - FIRST_RUN_WINDOW;
  const fresh = x => x && Number(x.createdAt) > since && Number(x.createdAt) <= now;
  const prof = pair.profile || {};
  const name = role => role === "partner" ? (prof.partnerName || "Parťák") : (prof.patientName || "Parťák");
  const out = [];
  const to = (role, pref, msg) => subs.forEach(([id, s]) => {
    if (s.role === role && (s.prefs || {})[pref] !== false) out.push({ subId: id, sub: s.sub, ...msg });
  });
  const sessions = pair.sessions || {};

  Object.entries(sessions).filter(([, s]) => fresh(s)).forEach(([id, s]) => {
    const n = Object.values(s.exercises || {}).filter(v => (v && v.sets) > 0).length;
    const J = jokerById(s.kind);
    const what = J ? `${J.icon || ""} ${(PLAN.exercises || {})[J.ex]?.name || J.short || J.id}${J.km ? ` ${Number(s.km) || 0} km` : ""}${s.minutes ? ` · ${s.minutes} min` : ""}`.trim() : `${n} ${plural(n, "cvik", "cviky", "cviků")}`;
    to("partner", "sessions", { title: `${name("patient")} má odcvičeno 💪`, body: clip(`${what} · bolest ${Number(s.pain) || 0}/10${s.note ? ` · ${s.note}` : ""}`, 140), tag: `s-${id}`, url: "./?tab=history" });
  });

  Object.entries(pair.messages || {}).filter(([, m]) => fresh(m)).forEach(([id, m]) => {
    const target = m.from === "partner" ? "patient" : "partner";
    to(target, "messages", { title: `${name(m.from)} píše`, body: clip(m.text, 160), tag: `m-${id}`, url: "./?tab=cheer" });
  });

  Object.entries(pair.reactions || {}).forEach(([sid, rs]) => Object.entries(rs || {}).filter(([, r]) => fresh(r)).forEach(([id, r]) => {
    const target = r.from === "partner" ? "patient" : "partner";
    const s = sessions[sid];
    to(target, "reactions", { title: `${name(r.from)} reaguje ${r.emoji || ""}`.trim(), body: s ? `Na trénink ${fmtDate(s.date)}` : "Na trénink", tag: `r-${id}`, url: "./?tab=history" });
  }));

  // Připomínka: v nastavený den a hodinu, když dnes ještě nebyl trénink a týden není splněný.
  const today = dateIn(now), hour = hourIn(now);
  const days = Array.isArray(prof.reminderDays) ? prof.reminderDays : [0, 2, 4];
  const remHour = Number.isInteger(prof.reminderHour) ? prof.reminderHour : 18;
  let reminded = state.reminded || null;
  if (reminded !== today && days.includes(weekdayIdx(today)) && hour >= remHour) {
    reminded = today;
    const all = Object.values(sessions).filter(s => s && s.date);
    const goal = Math.max(1, Number(prof.weeklyGoal) || PLAN.weeklyGoal || 3);
    const wk = all.filter(s => weekStart(s.date) === weekStart(today));
    const count = wk.filter(s => !jokerById(s.kind)).length + JOKERS.reduce((a, J) => a + Math.min(J.perWeek || 1, wk.filter(s => s.kind === J.id).length), 0);
    if (!all.some(s => s.date === today) && count < goal) {
      const left = goal - count;
      to("patient", "reminders", { title: `${APP}: čas na trénink`, body: `Tento týden ${count} z ${goal}. ${left === 1 ? "Ještě jeden a týden je tvůj." : `Ještě ${left} ${plural(left, "trénink", "tréninky", "tréninků")} do cíle.`}`, tag: `rem-${today}`, url: "./?tab=log" });
    }
  }
  // Rehabka: každý den v hodinu připomínky, když ještě nejsou odškrtnuté všechny cviky od lékaře.
  // Ve stejnou chvíli připomene i zítřejší návštěvu kliniky.
  const rItems = rehabItemsOn(pair, today);
  const visits = pair.calendar && Array.isArray(pair.calendar.events) ? pair.calendar.events : R.visits || [];
  let rehabReminded = state.rehabReminded || null;
  if (rItems.length && (!R.since || today >= R.since) && rehabReminded !== today && hour >= remHour) {
    rehabReminded = today;
    const done = (pair.rehab || {})[today] || {};
    const left = rItems.filter(i => !done[i.ex]).length;
    if (left) to("patient", "reminders", { title: `${APP}: rehabka`, body: left === rItems.length ? `Dnes ještě žádný cvik od lékaře. ${rItems.length} ${plural(rItems.length, "cvik", "cviky", "cviků")} a den je kompletní.` : `Ještě ${left} ${plural(left, "cvik", "cviky", "cviků")} od lékaře a dnešek je kompletní.`, tag: `rhb-${today}`, url: "./" });
    const tomorrow = toISO(fromISO(today) + DAY);
    visits.filter(v => v && v.date === tomorrow).forEach(v => to("patient", "reminders", { title: `${APP}: zítra ${v.what || "rehabka"}`, body: clip(`${v.time ? `V ${v.time}` : "Zítra"}, ${v.where || [R.clinic?.name, R.clinic?.address].filter(Boolean).join(", ") || "rehabka"}.`, 140), tag: `visit-${v.date}-${v.time || ""}`, url: "./" }));
  }
  return { out, state: { lastCheck: now, reminded, rehabReminded } };
}

/* ---------- přístup k databázi ---------- */
async function accessToken(sa) {
  const b64 = o => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: sa.client_email, aud: sa.token_uri || "https://oauth2.googleapis.com/token", iat, exp: iat + 3600,
    scope: "https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email" })}`;
  const jwt = `${body}.${createSign("RSA-SHA256").update(body).sign(sa.private_key, "base64url")}`;
  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  if (!res.ok) throw new Error(`Token: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function main() {
  const now = args.now ? Date.parse(args.now) : Date.now();
  if (args.file) {
    const pairs = JSON.parse(readFileSync(resolve(args.file), "utf8"));
    const events = args.ics ? parseIcs(readFileSync(resolve(args.ics), "utf8"), now) : null;
    if (events) events.forEach(e => console.log(`kalendář: ${e.date} ${e.time} ${e.what}${e.where ? ` (${e.where})` : ""}`));
    for (const [code, pair] of Object.entries(pairs)) {
      if (events) pair.calendar = { events };
      const { out, state } = planPair(code, pair, now);
      out.forEach(m => console.log(`${code} → ${m.subId}: ${m.title} | ${m.body} | ${m.url}`));
      console.log(`${code} state`, JSON.stringify(state));
    }
    return;
  }

  const saRaw = process.env.FIREBASE_SERVICE_ACCOUNT, vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!saRaw || !vapidPrivate) { console.log("Chybí secret FIREBASE_SERVICE_ACCOUNT nebo VAPID_PRIVATE_KEY, upozornění se neposílají."); return; }
  if (!VAPID_PUBLIC || VAPID_PUBLIC.startsWith("__")) throw new Error("V js/push.js chybí veřejný VAPID klíč.");
  let db = process.env.FIREBASE_DATABASE_URL;
  if (!db) db = loadWindowScript("js/firebase-config.js").FIREBASE_CONFIG?.databaseURL;
  if (!db) throw new Error("Chybí adresa databáze.");
  db = db.replace(/\/+$/, "");

  const { default: webpush } = await import("web-push");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://github.com/czechvar", VAPID_PUBLIC, vapidPrivate);
  const token = await accessToken(JSON.parse(saRaw));
  const api = (path, init) => fetch(`${db}/${path}.json?access_token=${encodeURIComponent(token)}`, init).then(async r => { if (!r.ok) throw new Error(`${init?.method || "GET"} ${path}: ${r.status} ${await r.text()}`); return r.json(); });

  // Kalendář rehabky: jen čtení. Když se nepovede, zůstanou termíny z minula (nebo z plánu).
  let events = null;
  const ical = process.env.REHAB_ICAL_URL || publicIcal(R.calendar);
  if (ical) {
    try {
      const res = await fetch(ical);
      if (!res.ok) throw new Error(`${res.status}${process.env.REHAB_ICAL_URL ? "" : " (kalendář není veřejný? nastav secret REHAB_ICAL_URL)"}`);
      events = parseIcs(await res.text(), now);
      console.log(`Kalendář rehabky: ${events.length} ${plural(events.length, "termín", "termíny", "termínů")}.`);
    } catch (e) { console.error(`Kalendář rehabky se nenačetl: ${e.message}`); }
  }

  const pairs = await api("pairs") || {};
  let sent = 0, failed = 0, removed = 0;
  for (const [code, pair] of Object.entries(pairs)) {
    if (!pair) continue;
    if (events && pair.profile && JSON.stringify((pair.calendar || {}).events || []) !== JSON.stringify(events)) {
      pair.calendar = { events, updatedAt: now };
      await api(`pairs/${code}/calendar`, { method: "PUT", body: JSON.stringify(pair.calendar) });
    }
    if (!pair.push || !pair.push.subs) continue;
    const { out, state } = planPair(code, pair, now);
    for (const m of out) {
      try {
        await webpush.sendNotification(m.sub, JSON.stringify({ title: m.title, body: m.body, tag: m.tag, url: m.url }), { TTL: 6 * 3600 });
        sent++;
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) { await api(`pairs/${code}/push/subs/${m.subId}`, { method: "DELETE" }); removed++; }
        else { failed++; console.error(`Odeslání selhalo (${code}/${m.subId}): ${e.statusCode || ""} ${e.body || e.message}`); }
      }
    }
    await api(`pairs/${code}/push/state`, { method: "PATCH", body: JSON.stringify(state) });
  }
  console.log(`Odesláno ${sent}, selhalo ${failed}, odstraněno neplatných odběrů ${removed}.`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
