// Konfigurace Firebase pro sdílení dat mezi dvěma telefony.
// Hodnoty nejsou tajné: přístup k datům řídí pravidla v database.rules.json.
// Návod je v docs/FIREBASE.md. Pro lokální režim nastav `null`.
// Sdílí databázi s appkou Koleno zpět (projekt koleno-zpet). Data jsou oddělená
// vlastním kódem dvojice pod pairs/<kód>, pravidla obou appek jsou stejná.

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDloBlwPlMuLObyOyDuk7kswGlufOllAQM",
  authDomain: "koleno-zpet.firebaseapp.com",
  databaseURL: "https://koleno-zpet-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "koleno-zpet",
  storageBucket: "koleno-zpet.firebasestorage.app",
  messagingSenderId: "405129774690",
  appId: "1:405129774690:web:c199b8b4c47e6d2969333b"
};
