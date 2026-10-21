# Firebase: sdílení dat mezi dvěma telefony

Bez Firebase si appka ukládá data jen do prohlížeče, ve kterém je otevřená. Aby jeden z vás viděl, co druhý zapsal, potřebuje společnou databázi. Firebase Realtime Database je na to zdarma a stačí vám bezplatný tarif Spark (limit 1 GB dat a 10 GB přenosu měsíčně, deník dvou lidí z toho využije zlomek).

Celý postup zabere asi 5–10 minut. Potřebuješ Google účet.

## 1. Založ projekt

1. Otevři <https://console.firebase.google.com> a přihlas se.
2. Klikni **Create a project** (případně **Add project**).
3. Název projektu: třeba `telo-zpet`. Pokračuj.
4. **Google Analytics** vypni (přepínač „Enable Google Analytics for this project“ na off). Appka ho nepoužívá.
5. **Create project** a počkej, až se projekt vytvoří. Klikni **Continue**.

## 2. Zapni Realtime Database

1. V levém menu rozbal **Databases and storage** a klikni na **Realtime Database**. (Ve starší verzi konzole je to pod **Build**. Případně napiš „Realtime Database“ do **Search for products** nahoře.)
2. **Create Database**.
3. **Database location**: vyber `Belgium (europe-west1)` nebo jiný region v Evropě. Pokračuj **Next**.
4. **Security rules**: vyber **Start in locked mode**. Pravidla nastavíme v dalším kroku. **Enable**.
5. Nahoře nad datovým stromem uvidíš adresu databáze ve tvaru
   `https://telo-zpet-default-rtdb.europe-west1.firebasedatabase.app`. Tu budeš za chvíli potřebovat.

## 3. Nastav pravidla přístupu

1. V Realtime Database přejdi na záložku **Rules**.
2. Smaž vše v editoru a vlož obsah souboru [`database.rules.json`](../database.rules.json) z tohoto repozitáře.
3. **Publish**.

Co pravidla dělají: číst a zapisovat lze jen pod cestou `pairs/<kód dvojice>`. Kdo nezná kód, k datům se nedostane, a kořen databáze nelze vypsat. Zároveň pravidla hlídají, že každý trénink a zpráva mají povinná pole. Pro soukromý deník dvou lidí je to dostatečné. Kód dvojice je šest znaků a najdeš ho v appce v **Nastavení**.

## 4. Zaregistruj webovou aplikaci a získej konfiguraci

1. Na **Project Overview** klikni na **+ Add app** a zvol **Web** (ikona `</>`). (Nebo **Settings → Project settings → General → Your apps**.)
2. Pokud se ptá na platformu, vyber **Web**.
3. **App nickname**: `telo-zpet-web`. **Firebase Hosting** nezaškrtávej (hostujeme na GitHub Pages).
4. **Register app**.
5. Firebase ukáže kód s objektem `firebaseConfig`. Vypadá takto:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy…",
     authDomain: "telo-zpet.firebaseapp.com",
     databaseURL: "https://telo-zpet-default-rtdb.europe-west1.firebasedatabase.app",
     projectId: "telo-zpet",
     storageBucket: "telo-zpet.appspot.com",
     messagingSenderId: "123456789012",
     appId: "1:123456789012:web:0123456789abcdef"
   };
   ```

   Zkopíruj si celý objekt ve složených závorkách. Pokud v něm chybí řádek `databaseURL`, doplň ho podle adresy z kroku 2.5.

   Hodnoty v tomto objektu nejsou tajné. Firebase je navržený tak, že `apiKey` webové aplikace je veřejný a přístup k datům řídí pravidla z kroku 3.

## 5. Vlož konfiguraci do appky

Jsou dvě cesty. Stačí jedna.

### A) Přímo do souboru v repozitáři (jednodušší)

Otevři `body-recovery/js/firebase-config.js` a nahraď řádek `window.FIREBASE_CONFIG = null;` svým objektem:

```js
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSy…",
  authDomain: "telo-zpet.firebaseapp.com",
  databaseURL: "https://telo-zpet-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "telo-zpet",
  storageBucket: "telo-zpet.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:0123456789abcdef"
};
```

Commitni a pushni do `main`. GitHub Pages se znovu nasadí samy.

### B) Přes GitHub Secret (konfigurace zůstane mimo repozitář)

1. V repozitáři na GitHubu otevři **Settings → Secrets and variables → Actions → New repository secret**.
2. **Name**: `FIREBASE_CONFIG_TELO` (`FIREBASE_CONFIG` patří šlaše).
3. **Secret**: objekt jako čistý JSON, tedy klíče v uvozovkách a bez `const firebaseConfig =` a bez středníku:

   ```json
   {
     "apiKey": "AIzaSy…",
     "authDomain": "telo-zpet.firebaseapp.com",
     "databaseURL": "https://telo-zpet-default-rtdb.europe-west1.firebasedatabase.app",
     "projectId": "telo-zpet",
     "storageBucket": "telo-zpet.appspot.com",
     "messagingSenderId": "123456789012",
     "appId": "1:123456789012:web:0123456789abcdef"
   }
   ```

4. **Add secret**. Při dalším nasazení (push do `main`, nebo **Actions → Nasazení na GitHub Pages → Run workflow**) se konfigurace vloží automaticky. Soubor `body-recovery/js/firebase-config.js` v repozitáři může zůstat s `null`.

## 6. Ověř, že to funguje

1. Otevři nasazenou appku. Vpravo nahoře má být zelené **Sdíleno**. Pokud tam je **Lokálně**, konfigurace se nenačetla (viz Potíže).
2. Zvol roli, v **Nastavení** vyplň jména a začátek plánu a **Uložit**.
3. V konzoli Firebase v **Realtime Database → Data** se objeví větev `pairs/<kód>/profile`.

## 7. Nahraj tréninkový plán do databáze

Plán (8 týdnů, cviky, pravidla) je zabudovaný v `js/plan.js`. Když ho nahraješ do databáze, appka používá verzi z databáze a jde ji později upravit bez zásahu do kódu (třeba v konzoli Firebase v **Data**).

Nejjednodušší cesta: v appce **Nastavení → Tréninkový plán → Nahrát plán do databáze**. Funguje jen v režimu **Sdíleno**.

Z počítače to jde i skriptem (potřebuje Node 18+):

```
node body-recovery/scripts/upload-plan.mjs --pair ABC123 --db https://telo-zpet-default-rtdb.europe-west1.firebasedatabase.app
```

`--db` jde vynechat, když je `databaseURL` v `body-recovery/js/firebase-config.js`. Kód dvojice je v appce v **Nastavení**.

Kdykoli plán v `js/plan.js` změníš, zvyš `version` a nahraj ho znovu. Appka v Nastavení ukáže, když má databáze starší verzi.

## 8. Spáruj druhý telefon

1. V appce v **Nastavení** klikni **Kopírovat** u odkazu pro parťáka. Odkaz má tvar `https://…/body-recovery/?pair=ABC123`.
2. Pošli ho druhému. Po otevření si zvolí druhou roli a od té chvíle vidíte stejná data.
3. Kód se na telefonu uloží, dál stačí otevírat appku bez `?pair=`. Doporučujeme si ji přidat na plochu (Safari: Sdílet → Přidat na plochu, Chrome: menu → Přidat na plochu).

## Potíže

**V Nastavení je u plánu „vestavěný“, i když jsem ho nahrál.**
Nahrání proběhlo pod jiným kódem dvojice. Zkontroluj kód v Nastavení na tom telefonu a nahraj plán z něj, nebo skriptem se správným `--pair`.

**V appce svítí „Lokálně“, i když je konfigurace vložená.**
Otevři konzoli prohlížeče (F12 → Console). Nejčastější příčiny: chybí `databaseURL`, chybí čárka nebo uvozovka v objektu, nebo se nasadila stará verze (zkontroluj na GitHubu **Actions**, zda poslední běh prošel).

**Svítí „Offline“.**
Appka se k Firebase připojila dříve, ale teď nemá spojení. Zkontroluj internet. Zápisy se po obnovení spojení odešlou.

**`PERMISSION_DENIED` v konzoli.**
Pravidla z kroku 3 nejsou publikovaná, nebo se zapisuje mimo `pairs/…`. Zkontroluj záložku **Rules**.

**Chci začít znovu s čistými daty.**
V **Realtime Database → Data** najeď na větev `pairs/<kód>` a klikni na křížek. V appce na obou telefonech **Nastavení → Odhlásit tento telefon**; vznikne nový kód dvojice.

**Chci data zálohovat.**
V appce **Nastavení → Stáhnout zálohu (JSON)**. Nebo v konzoli Firebase u kořene databáze menu ⋮ → **Export JSON**.
