# Upozornění

Appka umí poslat upozornění na telefon, i když je zavřená:

| Kdo | Co |
|---|---|
| Cvičící | denní připomínka (výchozí každý den v 18:00; jen když ten den ještě nebyl trénink a týden není splněný), vzkaz od parťáka, reakce na trénink |
| Parťák | nový trénink, nová zpráva, reakce |

Každý telefon si upozornění zapíná sám v **Nastavení → Upozornění** a tam si vybere, co chce dostávat. Dny a hodinu připomínky nastavuje cvičící.

## Jak to funguje

- Telefon se přihlásí k odběru (standardní Web Push) a odběr uloží do databáze pod `pairs/<kód>/push/subs/<id>`.
- GitHub Action **Upozornění** (`.github/workflows/notify.yml`) běží každých 15 minut, spustí `body-recovery/scripts/notify.mjs` (vedle skriptu šlachy), projde databázi a pošle, co je nového. Co už odeslal, si pamatuje v `pairs/<kód>/push/state`.
- Proto upozornění chodí se zpožděním do 15–20 minut. Nepotřebuje to placený tarif Firebase ani vlastní server.

## Nastavení (jednou)

Do repozitáře přidej dva secrets s příponou `_TELO` (bez ní patří šlaše): **Settings → Secrets and variables → Actions → New repository secret**.

### 1. `FIREBASE_SERVICE_ACCOUNT_TELO`

Skript potřebuje číst všechny dvojice v databázi, což pravidla běžnému klientovi nedovolí. Servisní účet je smí.

1. Firebase konzole → ozubené kolo → **Project settings** → **Service accounts**.
2. **Generate new private key** → **Generate key**. Stáhne se soubor `.json`.
3. Celý obsah souboru vlož jako hodnotu secretu `FIREBASE_SERVICE_ACCOUNT_TELO`.
4. Soubor pak z počítače smaž. Je to tajný klíč k celé databázi, nikam ho necommituj.

### 2. `VAPID_PRIVATE_KEY_TELO`

Pár klíčů pro podepisování upozornění. Tahle appka má mít vlastní pár (jiný než koleno a šlacha).

1. Otevři v prohlížeči `tools/vapid.html` (na webu `https://czechvar.github.io/ankle-recovery/body-recovery/tools/vapid.html`, nebo lokálně). Klíče vzniknou jen v prohlížeči.
2. **Soukromý klíč** vlož jako secret `VAPID_PRIVATE_KEY_TELO`.
3. **Veřejný klíč** vlož do `body-recovery/js/push.js` místo `__VAPID_PUBLIC__` (nebo ho pošli tomu, kdo appku upravuje). Není tajný.

Po pozdější změně klíčů je potřeba upozornění na telefonech zapnout znovu.

### 3. Vyzkoušej

1. **Actions → Upozornění → Run workflow**. Běh má skončit zeleně a v logu je „Odesláno N…“.
2. Na telefonu zapni upozornění, nech parťáka poslat zprávu a spusť workflow znovu ručně.

## iPhone

Upozornění na iPhonu (iOS 16.4 a novější) fungují jen z appky přidané na plochu: Safari → **Sdílet** → **Přidat na plochu**, otevřít z plochy a teprve tam zapnout upozornění. Android a počítač fungují přímo v prohlížeči.

## Omezení

- GitHub plánované běhy se občas zpozdí a v repozitáři bez aktivity 60 dní je GitHub sám vypne (stačí je v Actions znovu zapnout).
- V soukromém repozitáři běhy čerpají minuty z bezplatného limitu (každých 15 minut je asi 3000 minut měsíčně, víc než limit 2000). Ve veřejném repozitáři jsou zdarma bez limitu.

Test bez sítě: `node body-recovery/scripts/notify.mjs --file data.json --now 2026-10-14T18:05:00+02:00` (data.json = obsah uzlu `pairs`) vypíše, co by se poslalo.
