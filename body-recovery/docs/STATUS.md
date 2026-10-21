# Stav a úkoly

Stav k 21. 10. 2026.

## Hotovo

- **Tělo zpět** (podsložka `body-recovery/` v `czechvar/ankle-recovery`): appka podle Šlacha zpět pro Jakuba.
  8týdenní plán na celé tělo doma s jednoručkami, 10–15 minut denně, tři sestavy A/B/C na střídání,
  zápis vah, svalovka, dny v řadě, indigo vzhled. Po merge do `main` běží na
  https://czechvar.github.io/ankle-recovery/body-recovery/
- Nasazení a upozornění jedou přes workflow šlachy v kořeni repozitáře (druhý krok, secrets s příponou `_TELO`).
- Zatím bez Firebase (data jen v prohlížeči telefonu).

## Zbývá

1. **Firebase**: vlastní projekt `telo-zpet` podle [FIREBASE.md](FIREBASE.md), konfiguraci do
   `body-recovery/js/firebase-config.js` (nebo secret `FIREBASE_CONFIG_TELO`). Pak Nastavení → Nahrát plán do databáze.
2. Volitelně **upozornění**: vlastní VAPID pár (`tools/vapid.html`), veřejný klíč do `body-recovery/js/push.js`,
   secrets `VAPID_PRIVATE_KEY_TELO` a `FIREBASE_SERVICE_ACCOUNT_TELO` podle [NOTIFICATIONS.md](NOTIFICATIONS.md).
3. Na telefonu přidat appku na plochu (Android Chrome ⋮ → Instalovat aplikaci; iPhone Safari → Sdílet → Přidat na plochu).
