// ============================================================
// db.js — datu slānis
// Nodrošina VIENU API neatkarīgi no tā, vai dati glabājas:
//  - LOKĀLI (localStorage) — viena ierīce, nav vajadzīgs internets
//  - FIREBASE (Firestore)  — sinhronizācija starp vairākām ierīcēm
// Režīms tiek izvēlēts automātiski pēc js/firebase-config.js satura.
// ============================================================

const Utils = {
  uid() {
    return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
  },
  genFamilyCode() {
    const words = ["SAULE", "ZVAIGZNE", "VASARA", "PUPA", "AVOTS", "MEZS", "VILNIS", "PUKE"];
    const w = words[Math.floor(Math.random() * words.length)];
    const n = Math.floor(1000 + Math.random() * 9000);
    return `${w}-${n}`;
  },
  todayISO() {
    return new Date().toISOString().slice(0, 10);
  },
  async sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  },
  compressImageFile(file, maxDim = 480, quality = 0.55) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
};

const DB = (() => {
  let mode = "local";
  let familyCode = null;
  let firestore = null;
  const LOCAL_KEY = () => "familyData_" + familyCode;
  const listeners = {}; // collectionName -> [callback]

  function isFirebaseConfigured() {
    const c = window.FIREBASE_CONFIG || {};
    return c.apiKey && !String(c.apiKey).startsWith("IELIKT_");
  }

  // ---------------- LOCAL BACKEND ----------------
  function localLoad() {
    const raw = localStorage.getItem(LOCAL_KEY());
    return raw ? JSON.parse(raw) : null;
  }
  function localSave(data) {
    localStorage.setItem(LOCAL_KEY(), JSON.stringify(data));
  }
  function localNotify(collection) {
    if (collection === "meta") {
      // "meta" (bērni + PIN) nav parasta masīva kolekcija — tai ir sava datu forma,
      // tāpēc to apstrādājam atsevišķi un NEIZSAUCAM vispārīgo dispečeru zemāk
      // (citādi klausītāji saņemtu nepareizu tukšu masīvu vietā, kur gaidīts objekts).
      (listeners["meta"] || []).forEach((cb) => cb(localMetaObj()));
      return;
    }
    (listeners[collection] || []).forEach((cb) => cb(localLoad()[collection] || []));
  }
  function localMetaObj() {
    const d = localLoad();
    return { parentPinHash: d.parentPinHash || null, children: d.children || [] };
  }

  function defaultFamilyPayload() {
    return {
      parentPinHash: null,
      createdAt: new Date().toISOString(),
      children: [
        { id: "c1", name: "Bērns 1", avatar: "🦁", points: 0 },
        { id: "c2", name: "Bērns 2", avatar: "🐼", points: 0 }
      ],
      tasks: [
        { id: Utils.uid(), title: "Uzklāt gultu", icon: "🛏️", points: 5, category: "majas", requiresApproval: true, assignedTo: "all", active: true },
        { id: Utils.uid(), title: "Izņemt traukus no mašīnas", icon: "🍽️", points: 8, category: "majas", requiresApproval: true, assignedTo: "all", active: true },
        { id: Utils.uid(), title: "Palasīt grāmatu 20 min", icon: "📖", points: 10, category: "macibas", requiresApproval: true, assignedTo: "all", active: true },
        { id: Utils.uid(), title: "Sakārtot savu istabu", icon: "🧹", points: 6, category: "majas", requiresApproval: true, assignedTo: "all", active: true }
      ],
      rewards: [
        { id: Utils.uid(), title: "30 min papildu ekrāna laiks", icon: "📱", pointsCost: 20, active: true },
        { id: Utils.uid(), title: "Izvēlies vakariņas", icon: "🍕", pointsCost: 40, active: true },
        { id: Utils.uid(), title: "Ģimenes filmu vakars — tavs izvēles filma", icon: "🎬", pointsCost: 30, active: true }
      ],
      submissions: [],
      redemptions: [],
      quizResults: []
    };
  }

  // ---------------- PUBLIC API ----------------
  const api = {
    mode: () => mode,

    async init() {
      familyCode = localStorage.getItem("familyCode");
      if (isFirebaseConfigured()) {
        mode = "firebase";
        if (familyCode && familyCode.startsWith("LOCAL-")) {
          familyCode = null;
        }
        try {
          if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
          firestore = firebase.firestore();
        } catch (e) {
          console.error("Firebase init kļūda:", e);
          mode = "local";
        }
      } else {
        mode = "local";
      }

      if (mode === "local" && !familyCode) {
        // Lokālajā režīmā ģimeni izveidojam automātiski, klusībā.
        familyCode = "LOCAL-" + Utils.uid().slice(0, 6).toUpperCase();
        localStorage.setItem("familyCode", familyCode);
        localSave(defaultFamilyPayload());
      }
      return { mode, familyCode, needsSetup: mode === "firebase" && !familyCode };
    },

    getFamilyCode: () => familyCode,

    async createFamily() {
      const code = Utils.genFamilyCode();
      if (mode === "firebase") {
        const payload = defaultFamilyPayload();
        const famRef = firestore.collection("families").doc(code);
        await famRef.set({ parentPinHash: null, createdAt: new Date().toISOString() });
        for (const child of payload.children) {
          await famRef.collection("children").doc(child.id).set({ name: child.name, avatar: child.avatar, points: child.points });
        }
        for (const t of payload.tasks) await famRef.collection("tasks").doc(t.id).set(t);
        for (const r of payload.rewards) await famRef.collection("rewards").doc(r.id).set(r);
      } else {
        familyCode = code;
        localSave(defaultFamilyPayload());
      }
      familyCode = code;
      localStorage.setItem("familyCode", code);
      return code;
    },

    async joinFamily(code) {
      code = code.trim().toUpperCase();
      if (mode === "firebase") {
        const doc = await firestore.collection("families").doc(code).get();
        if (!doc.exists) throw new Error("Ģimene ar šādu kodu nav atrasta. Pārbaudi kodu un mēģini vēlreiz.");
      } else {
        throw new Error("Pievienoties ar kodu var tikai tad, ja iestatīta Firebase sinhronizācija.");
      }
      familyCode = code;
      localStorage.setItem("familyCode", code);
      return code;
    },

    clearDeviceFamily() {
      localStorage.removeItem("familyCode");
      localStorage.removeItem("activeProfile");
      familyCode = null;
    },

    // ---------- META (bērni + PIN) ----------
    onMeta(callback) {
      if (mode === "local") {
        listeners.meta = listeners.meta || [];
        listeners.meta.push(callback);
        callback(localMetaObj());
        return () => { listeners.meta = listeners.meta.filter((c) => c !== callback); };
      } else {
        const famRef = firestore.collection("families").doc(familyCode);
        let currentMeta = { parentPinHash: null, children: [] };
        const unsubFam = famRef.onSnapshot((doc) => {
          currentMeta.parentPinHash = doc.exists ? doc.data().parentPinHash : null;
          callback({ ...currentMeta });
        });
        const unsubChildren = famRef.collection("children").onSnapshot((snap) => {
          currentMeta.children = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback({ ...currentMeta });
        });
        return () => { unsubFam(); unsubChildren(); };
      }
    },

    async setParentPinHash(hash) {
      if (mode === "local") {
        const d = localLoad(); d.parentPinHash = hash; localSave(d); localNotify("meta");
      } else {
        await firestore.collection("families").doc(familyCode).set({ parentPinHash: hash }, { merge: true });
      }
    },

    async updateChild(id, patch) {
      if (mode === "local") {
        const d = localLoad();
        d.children = d.children.map((c) => (c.id === id ? { ...c, ...patch } : c));
        localSave(d); localNotify("meta");
      } else {
        await firestore.collection("families").doc(familyCode).collection("children").doc(id).set(patch, { merge: true });
      }
    },

    async adjustChildPoints(id, delta) {
      if (mode === "local") {
        const d = localLoad();
        d.children = d.children.map((c) => (c.id === id ? { ...c, points: Math.max(0, (c.points || 0) + delta) } : c));
        localSave(d); localNotify("meta");
      } else {
        const ref = firestore.collection("families").doc(familyCode).collection("children").doc(id);
        await firestore.runTransaction(async (tx) => {
          const doc = await tx.get(ref);
          const cur = doc.exists ? doc.data().points || 0 : 0;
          tx.set(ref, { points: Math.max(0, cur + delta) }, { merge: true });
        });
      }
    },

    // ---------- Generic collection helpers (tasks, rewards, submissions, redemptions, quizResults) ----------
    _on(collection, callback) {
      if (mode === "local") {
        listeners[collection] = listeners[collection] || [];
        listeners[collection].push(callback);
        callback(localLoad()[collection] || []);
        return () => { listeners[collection] = listeners[collection].filter((c) => c !== callback); };
      } else {
        const unsub = firestore.collection("families").doc(familyCode).collection(collection)
          .onSnapshot((snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
        return unsub;
      }
    },
    async _add(collection, item) {
      const id = item.id || Utils.uid();
      const full = { ...item, id };
      if (mode === "local") {
        const d = localLoad(); d[collection] = d[collection] || []; d[collection].push(full);
        localSave(d); localNotify(collection);
      } else {
        await firestore.collection("families").doc(familyCode).collection(collection).doc(id).set(full);
      }
      return id;
    },
    async _update(collection, id, patch) {
      if (mode === "local") {
        const d = localLoad();
        d[collection] = (d[collection] || []).map((it) => (it.id === id ? { ...it, ...patch } : it));
        localSave(d); localNotify(collection);
      } else {
        await firestore.collection("families").doc(familyCode).collection(collection).doc(id).set(patch, { merge: true });
      }
    },
    async _delete(collection, id) {
      if (mode === "local") {
        const d = localLoad();
        d[collection] = (d[collection] || []).filter((it) => it.id !== id);
        localSave(d); localNotify(collection);
      } else {
        await firestore.collection("families").doc(familyCode).collection(collection).doc(id).delete();
      }
    },

    onTasks(cb) { return this._on("tasks", cb); },
    addTask(t) { return this._add("tasks", t); },
    updateTask(id, p) { return this._update("tasks", id, p); },
    deleteTask(id) { return this._delete("tasks", id); },

    onRewards(cb) { return this._on("rewards", cb); },
    addReward(r) { return this._add("rewards", r); },
    updateReward(id, p) { return this._update("rewards", id, p); },
    deleteReward(id) { return this._delete("rewards", id); },

    onSubmissions(cb) { return this._on("submissions", cb); },
    addSubmission(s) { return this._add("submissions", s); },
    updateSubmission(id, p) { return this._update("submissions", id, p); },

    onRedemptions(cb) { return this._on("redemptions", cb); },
    addRedemption(r) { return this._add("redemptions", r); },
    updateRedemption(id, p) { return this._update("redemptions", id, p); },

    onQuizResults(cb) { return this._on("quizResults", cb); },
    addQuizResult(r) { return this._add("quizResults", r); }
  };

  return api;
})();

window.Utils = Utils;
window.DB = DB;
