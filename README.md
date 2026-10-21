# Šlacha zpět

Malá webová aplikace na rehabilitaci Achillovy šlachy (tendinopatie, bolest paty). Sestrojená podle [Koleno zpět](https://github.com/czechvar/acl-recovery): stejné obrazovky, stejné úložiště, jiný plán. Jeden cvičí a zapisuje, druhý (volitelně) sleduje a fandí.

- **Přehled** – splněné tréninky v týdnu, série týdnů, bolest šlachy, fáze plánu, milníky.
- **Trénink** – 10týdenní plán ve třech fázích, sestava pro aktuální týden, zápis sérií a **zátěže v kg**, u cviků na čas **časovač** s délkou z plánu (po doběhnutí pípne a odškrtne sérii) a mezi sériemi **pauza** s odpočtem (u výponů, s nápovědou „minule X kg“), bolest 0–10, ranní ztuhlost, pocit, poznámka.
- **Žolíci** – jiná aktivita místo tréninku z plánu: kolo do práce (nejvýš 1× týdně) a KB5, kettlebelly a protažení (nejvýš 3× týdně, s odkazem na aktivitu v Suuntu). Další zápisy nad limit se uloží jako „navíc“. Cíl jde nastavit 2–7× týdně.
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

Cviky odkazují na [návod Fyziokliniky](https://fyzioklinika.cz/poradna/navody-na-cviceni/boli-me/boli-me-pata-achillova-slacha/cviky-pri-bolestech-paty-achillovy-slachy). Celý plán je v `js/plan.js` (`exercises` + `weeks`), úprava je stejná jako u kolena. Cvik s `load: true` má v zápisu políčko na kila, `rest` je délka pauzy mezi sériemi.

Další zdroje (seznam `resources` v `js/plan.js`, v appce sekce „Další zdroje“):

- [Periodizace tréninku, zánět achilovky, intervaly, horko místo ledu](https://karelholub.substack.com/p/periodizace-treninku-zanet-achilovky) (Karel Holub, newsletter Běžím dokud můžu)

Appka nenahrazuje fyzioterapeuta. Při náhlé ostré bolesti, „ráně“ v lýtku nebo otoku jdi k lékaři.

## Spuštění a nasazení

```
npx serve .
```

GitHub Pages: workflow `.github/workflows/pages.yml` nasadí `main` na `https://<uživatel>.github.io/ankle-recovery/` (Settings → Pages → Source: GitHub Actions).

## Sdílení mezi telefony (Firebase)

Appka má vlastní Firebase projekt `slacha-zpet` (Realtime Database v europe-west1, pravidla z `database.rules.json`). Konfigurace je v `js/firebase-config.js`, případně v secretu `FIREBASE_CONFIG`. Návod na založení: **[docs/FIREBASE.md](docs/FIREBASE.md)**.

Po prvním otevření: Nastavení → **Nahrát plán do databáze**, a odkaz pro parťáka zkopíruj tamtéž.

Data: `pairs/<kód>/{profile, plan, sessions/<id>, messages/<id>, reactions/<sessionId>/<id>}`. Trénink nese u cviků `{ sets, kg? }`.

## Struktura

```
index.html              stránka a navigace
css/style.css           vzhled (světlý i tmavý režim)
js/plan.js              plán: cviky, týdny, fáze, pravidla, milníky
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

## Tělo zpět (podsložka `body-recovery/`)

Druhá appka ve stejném repozitáři: trénink celého těla doma s jednoručkami, 10–15 minut denně, 8 týdnů, sestavy A/B/C na střídání. Běží na `https://czechvar.github.io/ankle-recovery/body-recovery/` s vlastním Firebase projektem (`telo-zpet`) a vlastními secrets s příponou `_TELO`. Nasazení i upozornění obstarávají workflow v kořeni. Podrobnosti: **[body-recovery/README.md](body-recovery/README.md)**.

## Upozornění

Připomínky tréninku a upozornění na nové tréninky, zprávy a reakce (Web Push přes GitHub Action každých 15 minut). Zapínají se v Nastavení. Jednorázové nastavení secrets: **[docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md)**.
