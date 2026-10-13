# Stav a úkoly (předávka pro další session)

Stav k 13. 10. 2026 (večer). Slouží jako podklad pro naplnění Workstreams boardu
(team `S_yWzWbWTa`, board `y2xbmB`: https://app.workstreams.ai/teams/S_yWzWbWTa/board/y2xbmB/).

## Hotovo

- **Šlacha zpět** (`czechvar/ankle-recovery`): appka podle Koleno zpět, 10týdenní plán na Achillovu šlachu
  (izometrie → HSR + excentrické výpony → pružnost a běh), zápis zátěže v kg, ranní ztuhlost, oranžový vzhled.
  Na `main`, běží na https://czechvar.github.io/ankle-recovery/
- **Firebase pro šlachu**: vlastní projekt `slacha-zpet` (europe-west1), pravidla z `database.rules.json`.
- **Upozornění v obou appkách** (Web Push přes GitHub Action každých 15 min, `scripts/notify.mjs`, `docs/NOTIFICATIONS.md`):
  připomínky v tréninkové dny, nový trénink, zprávy, reakce; instalace na plochu (manifest, ikony, service worker).
- **VAPID klíče**: každá appka má vlastní pár; veřejné klíče jsou v `js/push.js`, soukromé v secretu `VAPID_PRIVATE_KEY` (oba repozitáře).
- **Žolík KB5** (šlacha): kettlebelly a protažení v KB5, nejvýš 3× týdně místo tréninku z plánu, s délkou a odkazem na aktivitu v Suuntu.
  Kolo do práce zůstává 1× týdně. Zápisy nad limit se uloží jako „navíc“. Plán verze 2.
- **Týdenní cíl 2–7×** (šlacha), nastavuje se v Nastavení.
- **Připomínky kdykoli 0–23 h** (obě appky), dřív jen 6–21 h.

## Zbývá

1. ~~Secrets `FIREBASE_SERVICE_ACCOUNT` a `VAPID_PRIVATE_KEY`~~ hotovo v obou repozitářích; testovací běh Upozornění zelený, připojení k databázi funguje (zatím 0 odběrů).
2. **Ověřit doručení**: po zapnutí upozornění na telefonu spustit Actions → Upozornění → Run workflow a zkontrolovat, že přijde zpráva.
3. **Telefony**: přidat appky na plochu (Android Chrome ⋮ → Instalovat aplikaci; iPhone Safari → Sdílet → Přidat na plochu),
   v Nastavení → Upozornění zapnout a nastavit dny a hodinu připomínky; u šlachy Nastavení → Nahrát plán do databáze (verze 2 s KB5)
   a nastavit týdenní cíl.
4. **Ověřit cviky** v `js/plan.js` proti návodu Fyziokliniky (stránka nebyla ze sandboxu dostupná).
5. **Workstreams**: připojit konektor k týmu `S_yWzWbWTa` (claude.ai/customize/connectors → WorkStreams → odpojit/připojit,
   zvolit správný tým), nová session, naplnit board úkoly z tohoto souboru.
6. Volitelně: okamžitá upozornění přes Firebase Cloud Functions (tarif Blaze) místo zpoždění 15–20 min.
7. Volitelně: zkontrolovat, že repozitáře jsou veřejné (jinak cron každých 15 min přečerpá bezplatné minuty Actions).
