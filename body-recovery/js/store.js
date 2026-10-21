// Úložiště: Firebase Realtime Database, když je nastavená; jinak localStorage.
// Obě varianty mají stejné rozhraní: subscribe / set / update / push / remove.
(function () {
  const LS_KEY = "telo-zpet:data";

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function localStore() {
    let data = {};
    try { data = JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {}; } catch (e) { data = {}; }
    const subs = new Map();

    const parts = p => p.split("/").filter(Boolean);
    function get(path) {
      return parts(path).reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), data);
    }
    function setAt(path, val) {
      const ps = parts(path);
      let o = data;
      for (let i = 0; i < ps.length - 1; i++) {
        if (typeof o[ps[i]] !== "object" || o[ps[i]] === null) o[ps[i]] = {};
        o = o[ps[i]];
      }
      const last = ps[ps.length - 1];
      if (val === null || val === undefined) delete o[last]; else o[last] = val;
    }
    function persist() { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch (e) { /* soukromý režim */ } }
    function notify() { subs.forEach((set, path) => set.forEach(cb => cb(get(path)))); }

    window.addEventListener("storage", e => {
      if (e.key !== LS_KEY) return;
      try { data = JSON.parse(e.newValue || "{}") || {}; } catch (err) { return; }
      notify();
    });

    return {
      mode: "local",
      subscribe(path, cb) {
        if (!subs.has(path)) subs.set(path, new Set());
        subs.get(path).add(cb);
        cb(get(path));
        return () => subs.get(path).delete(cb);
      },
      set(path, val) { setAt(path, val); persist(); notify(); return Promise.resolve(); },
      update(path, obj) { Object.entries(obj).forEach(([k, v]) => setAt(path + "/" + k, v)); persist(); notify(); return Promise.resolve(); },
      push(path, val) { const id = uid(); setAt(path + "/" + id, val); persist(); notify(); return Promise.resolve(id); },
      remove(path) { return this.set(path, null); },
      onConnection(cb) { cb(true); }
    };
  }

  function firebaseStore(config) {
    firebase.initializeApp(config);
    const db = firebase.database();
    return {
      mode: "cloud",
      subscribe(path, cb) {
        const ref = db.ref(path);
        const h = ref.on("value", s => cb(s.val()), err => console.error("Firebase read", err));
        return () => ref.off("value", h);
      },
      set(path, val) { return db.ref(path).set(val); },
      update(path, obj) { return db.ref(path).update(obj); },
      push(path, val) { const r = db.ref(path).push(); return r.set(val).then(() => r.key); },
      remove(path) { return db.ref(path).remove(); },
      onConnection(cb) { db.ref(".info/connected").on("value", s => cb(!!s.val())); }
    };
  }

  window.createStore = function () {
    const cfg = window.FIREBASE_CONFIG;
    if (cfg && cfg.databaseURL && typeof firebase !== "undefined") {
      try { return firebaseStore(cfg); } catch (e) { console.warn("Firebase se nepodařilo spustit, běžím lokálně.", e); }
    }
    return localStore();
  };
})();
