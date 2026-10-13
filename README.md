# Šlacha zpět

Malá webová aplikace na rehabilitaci Achillovy šlachy (tendinopatie, bolest paty). Sestrojená podle [Koleno zpět](https://github.com/czechvar/acl-recovery): stejné obrazovky, stejné úložiště, jiný plán. Jeden cvičí a zapisuje, druhý (volitelně) sleduje a fandí.

- **Přehled** – splněné tréninky v týdnu, série týdnů, bolest šlachy, fáze plánu, milníky.
- **Trénink** – 10týdenní plán ve třech fázích, sestava pro aktuální týden, zápis sérií a **zátěže v kg** (u výponů, s nápovědou „minule X kg“), bolest 0–10, ranní ztuhlost, pocit, poznámka.
- **Žolík** – jízda na kole do práce nahradí nejvýš jeden trénink týdně.
- **Historie**, **Fandění**, **Nastavení** – jako u kolena.

Čistý HTML/CSS/JS, žádný build.

## Plán

Postaveno na principu „šlacha potřebuje zátěž, ne klid“, jen ve správné dávce:

| Fáze | Týdny | Kdy | Co |
|---|---|---|---|
| 1. Zklidnění | 1–2 | šlacha bolí i při chůzi nebo v klidu | izometrické výdrže ve výponu 30–45 s, 4–5×; uvolnění lýtka; střed těla a horní polovina vsedě/vleže |
| 2. Síla šlachy | 3–7 | chůze už nebolí | Heavy Slow Resistance (tempo 3 s nahoru / 3 s dolů), excentrické výpony (nahoru oběma, 3–5 s dolů na bolavé), 70–85 % maxima, 6–12 opak., 3 série, pauza 1–2 min |
| 3. Pružnost a běh | 8–10 | těžké výpony bez reakce | poskoky, švihadlo, poskoky na jedné noze, chůze/běh |

Hlídá se bolest při cvičení (do 3–4 z 10 je v pořádku) a **ranní ztuhlost** – když je ráno horší než den předtím, uber a týden zopakuj.

Cviky odkazují na [návod Fyziokliniky](https://fyzioklinika.cz/poradna/navody-na-cviceni/boli-me/boli-me-pata-achillova-slacha/cviky-pri-bolestech-paty-achillovy-slachy). Celý plán je v `js/plan.js` (`exercises` + `weeks`), úprava je stejná jako u kolena. Cvik s `load: true` má v zápisu políčko na kila.

Appka nenahrazuje fyzioterapeuta. Při náhlé ostré bolesti, „ráně“ v lýtku nebo otoku jdi k lékaři.

## Spuštění a nasazení

```
npx serve .
```

GitHub Pages: workflow `.github/workflows/pages.yml` nasadí `main` na `https://<uživatel>.github.io/ankle-recovery/` (Settings → Pages → Source: GitHub Actions).

## Sdílení mezi telefony (Firebase)

`js/firebase-config.js` je zatím `null`, takže data zůstávají v prohlížeči. Pro synchronizaci mezi telefonem a počítačem založ vlastní Firebase projekt podle **[docs/FIREBASE.md](docs/FIREBASE.md)** (nebo konfiguraci vlož do secretu `FIREBASE_CONFIG`).

Data: `pairs/<kód>/{profile, plan, sessions/<id>, messages/<id>, reactions/<sessionId>/<id>}`. Trénink nese u cviků `{ sets, kg? }`.

## Struktura

```
index.html              stránka a navigace
css/style.css           vzhled (světlý i tmavý režim)
js/plan.js              plán: cviky, týdny, fáze, pravidla, milníky
js/store.js             úložiště: Firebase nebo localStorage
js/charts.js            SVG grafy
js/app.js               obrazovky a logika
js/firebase-config.js   konfigurace Firebase (volitelná)
scripts/upload-plan.mjs nahrání plánu do Firebase
database.rules.json     pravidla Realtime Database
```

## Dál

- Připomínky (push notifikace) pro obě appky – koleno i šlacha.
