#!/usr/bin/env node
// Nahraje vestavěný tréninkový plán (js/plan.js) do Firebase Realtime Database
// pod pairs/<kód dvojice>/plan. Používá REST API databáze, nic se neinstaluje.
//
//   node scripts/upload-plan.mjs --pair ABC123 [--db https://...firebasedatabase.app] [--out plan.json] [--dry]
//
// --db   adresa databáze; když chybí, vezme se databaseURL z js/firebase-config.js
// --out  místo nahrání jen zapíše JSON plánu do souboru (hodí se pro import v konzoli)
// --dry  jen vypíše, co by se nahrálo

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => a.startsWith("--") ? [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true] : []).filter(Boolean));

function loadWindowScript(file) {
  const ctx = { window: {} };
  vm.runInNewContext(readFileSync(resolve(root, file), "utf8"), ctx);
  return ctx.window;
}

const { PLAN } = loadWindowScript("js/plan.js");
const plan = { version: PLAN.version, name: PLAN.name, weeklyGoal: PLAN.weeklyGoal, jokers: PLAN.jokers || null, source: PLAN.source || null, phases: PLAN.phases, rules: PLAN.rules, exercises: PLAN.exercises, weeks: PLAN.weeks, cheers: PLAN.cheers, uploadedAt: Date.now() };
const json = JSON.stringify(plan, null, 2);

if (args.out) { writeFileSync(resolve(args.out), json); console.log(`Plán verze ${plan.version} zapsán do ${args.out}`); process.exit(0); }
if (args.dry) { console.log(json); process.exit(0); }

const pair = String(args.pair || "").trim().toUpperCase();
if (!pair) { console.error("Chybí --pair KÓD (kód dvojice z Nastavení v appce)."); process.exit(1); }

let db = args.db;
if (!db) { try { db = loadWindowScript("js/firebase-config.js").FIREBASE_CONFIG?.databaseURL; } catch (e) { /* ignore */ } }
if (!db) { console.error("Chybí --db adresa databáze a js/firebase-config.js ji neobsahuje."); process.exit(1); }
db = db.replace(/\/+$/, "");

const url = `${db}/pairs/${pair}/plan.json`;
const res = await fetch(url, { method: "PUT", headers: { "content-type": "application/json" }, body: json });
if (!res.ok) { console.error(`Nahrání selhalo: ${res.status} ${res.statusText}\n${await res.text()}`); process.exit(1); }
console.log(`Plán verze ${plan.version} (${plan.weeks.length} týdnů, ${Object.keys(plan.exercises).length} cviků) nahrán do ${url}`);
