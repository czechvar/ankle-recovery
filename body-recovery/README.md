# Tělo zpět

Malá webová aplikace na trénink celého těla doma s jednoručkami, **10–15 minut denně**. Žije v podsložce `body-recovery/` repozitáře [Šlacha zpět](../README.md) a je sestrojená podle ní: stejné obrazovky, stejné úložiště, jiný plán, vlastní Firebase projekt. Jeden cvičí a zapisuje, druhý (volitelně) sleduje a fandí.

- **Přehled** – splněné tréninky v týdnu, dny v řadě, série týdnů, bolest, fáze plánu, milníky, co je dnes na řadě.
- **Trénink** – 8týdenní plán ve třech fázích, každý týden tři krátké sestavy na střídání (**A** síla: dřep, tlak, přítah · **B** pohyblivost a střed těla · **C** síla: předklon, výpad, tlak nad hlavu). Appka sama nabídne sestavu, která je na řadě. Zápis sérií a **vah v kg** (s nápovědou „minule X kg“), **časovač** u cviků na čas, **pauza** mezi sériemi, bolest 0–10, svalovka, pocit, poznámka.
- **Během dne** – drobné návyky podle fáze (procházka, kroky, vstát od počítače, bílkoviny, spánek). Do tréninků se nepočítají.
- **Žolík** – jiný pohyb (běh, kolo, fotbal, výlet) místo tréninku, nejvýš 2× týdně, s odkazem na aktivitu. Cíl jde nastavit 2–7× týdně (výchozí 5).
- **Historie**, **Fandění**, **Nastavení** – jako u šlachy.

Čistý HTML/CSS/JS, žádný build.

## Plán

| Fáze | Týdny | Co |
|---|---|---|
| 1. Rozjezd | 1–2 | lehké jednoručky, technika, 2–3 série po 10, aspoň 3 opakování v rezervě |
| 2. Síla | 3–5 | dvojitá progrese 8–12 opakování, 3 série, pauza v dolní poloze, pomalé spouštění |
| 3. Kondice | 6–8 | dřep s tlakem nad hlavu, švih, výpady vzad, farmářská chůze, pauzy 30–45 s |

Každá sestava má odhad délky (10–15 min). Cviky odkazují na vyhledávání videí na YouTube. Celý plán je v `js/plan.js` (`exercises` + `weeks[].days[].items`). Cvik s `load: true` má v zápisu políčko na kila, `rest` je pauza mezi sériemi (položka v týdnu ji může přepsat).

Appka nenahrazuje lékaře ani trenéra. Při bolesti na hrudi, závrati, dušnosti nebo ostré bolesti kloubu přestaň a poraď se s lékařem.

## Spuštění a nasazení

```
npx serve body-recovery
```

GitHub Pages: workflow `.github/workflows/pages.yml` v kořeni repozitáře nasadí `main` i s touto podsložkou, appka běží na `https://czechvar.github.io/ankle-recovery/body-recovery/`. Data v prohlížeči má oddělená od šlachy (jiný prefix v localStorage), na plochu se instaluje jako samostatná appka.

## Sdílení mezi telefony (Firebase)

Bez Firebase appka ukládá data jen v prohlížeči telefonu, což pro jednoho stačí. Pro sdílení s parťákem založ vlastní Firebase projekt (třeba `telo-zpet`, Realtime Database v europe-west1, pravidla z `database.rules.json`) a konfiguraci vlož do `body-recovery/js/firebase-config.js`, případně do secretu `FIREBASE_CONFIG_TELO`. Návod: **[docs/FIREBASE.md](docs/FIREBASE.md)**.

Po zapnutí: Nastavení → **Nahrát plán do databáze**, a odkaz pro parťáka zkopíruj tamtéž.

Data: `pairs/<kód>/{profile, plan, sessions/<id>, messages/<id>, reactions/<sessionId>/<id>, everyday/<datum>}`. Trénink nese `day` (A/B/C) a u cviků `{ sets, kg? }`.

## Struktura

```
index.html              stránka a navigace
css/style.css           vzhled (světlý i tmavý režim)
js/plan.js              plán: cviky, týdny, sestavy, fáze, pravidla, milníky
js/store.js             úložiště: Firebase nebo localStorage
js/charts.js            SVG grafy
js/app.js               obrazovky a logika
js/push.js              upozornění: odběr a nastavení
sw.js                   service worker (zobrazení upozornění)
manifest.webmanifest    instalace na plochu
scripts/notify.mjs      rozesílání upozornění (GitHub Action)
js/firebase-config.js   konfigurace Firebase (volitelná)
scripts/upload-plan.mjs nahrání plánu do Firebase
database.rules.json     pravidla Realtime Database
```

## Upozornění

Denní připomínka tréninku a upozornění na nové tréninky, zprávy a reakce (Web Push přes GitHub Action každých 15 minut, stejný workflow jako u šlachy, druhý krok). Potřebuje Firebase a vlastní VAPID klíče, secrets `FIREBASE_SERVICE_ACCOUNT_TELO` a `VAPID_PRIVATE_KEY_TELO`. Zapínají se v Nastavení. Jednorázové nastavení: **[docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md)**.
