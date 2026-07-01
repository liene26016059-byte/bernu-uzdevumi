// ============================================================
// app.js — galvenais kontrolieris: navigācija, stāvoklis, modāļi
// ============================================================

const App = {
  state: {
    meta: { parentPinHash: null, children: [] },
    tasks: [],
    rewards: [],
    submissions: [],
    redemptions: [],
    quizResults: [],
    activeProfile: null, // { childId }
    parentUnlocked: false,
    currentView: "tasks"
  },

  el(id) { return document.getElementById(id); },

  showToast(msg, ms = 2200) {
    const t = this.el("toast");
    t.textContent = msg;
    t.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
  },

  openModal(html) {
    this.el("modal-content").innerHTML = html;
    this.el("modal-backdrop").classList.remove("hidden");
  },
  closeModal() {
    this.el("modal-backdrop").classList.add("hidden");
    this.el("modal-content").innerHTML = "";
  },

  currentChild() {
    if (!this.state.activeProfile) return null;
    return this.state.meta.children.find((c) => c.id === this.state.activeProfile.childId) || null;
  },

  screen(name) {
    ["setup", "profile", "pin"].forEach((s) => this.el("screen-" + s).classList.add("hidden"));
    this.el("app").classList.add("hidden");
    if (name === "app") {
      this.el("app").classList.remove("hidden");
    } else {
      this.el("screen-" + name).classList.remove("hidden");
    }
  },

  async boot() {
    this.el("modal-backdrop").addEventListener("click", (e) => {
      if (e.target.id === "modal-backdrop") this.closeModal();
    });

    const { mode, familyCode, needsSetup } = await DB.init();
    this._mode = mode;

    if (needsSetup) {
      this.wireSetupScreen();
      this.screen("setup");
      return;
    }
    this.afterFamilyReady();
  },

  wireSetupScreen() {
    this.el("setup-mode-hint").textContent =
      "Sinhronizācija ieslēgta (Firebase). Pirmajā ierīcē izveido jaunu ģimeni, pārējās — pievienojies ar kodu.";
    this.el("btn-create-family").onclick = async () => {
      try {
        const code = await DB.createFamily();
        this.openModal(`
          <h2>Ģimene izveidota! 🎉</h2>
          <p>Šis ir jūsu ģimenes kods. <b>Pieraksti vai nofotografē to</b> — tas būs vajadzīgs, iestatot lietotni otrā bērna telefonā:</p>
          <p class="pin-input" style="font-size:26px;letter-spacing:2px;">${code}</p>
          <button class="btn btn-primary btn-lg" id="btn-code-ok">Sapratu, turpināt</button>
        `);
        this.el("btn-code-ok").onclick = () => { this.closeModal(); this.afterFamilyReady(); };
      } catch (e) { this.showToast("Kļūda: " + e.message); }
    };
    this.el("btn-join-family").onclick = async () => {
      const code = this.el("input-family-code").value;
      if (!code.trim()) { this.showToast("Ievadi ģimenes kodu"); return; }
      try {
        await DB.joinFamily(code);
        this.showToast("Pievienots ģimenei!");
        this.afterFamilyReady();
      } catch (e) { this.showToast(e.message, 3500); }
    };
  },

  afterFamilyReady() {
    DB.onMeta((meta) => {
      this.state.meta = meta;
      this.renderProfileScreen();
      if (!this.el("app").classList.contains("hidden")) this.updateHeader();
      this.rerenderCurrentView();
    });
    DB.onTasks((tasks) => { this.state.tasks = tasks; this.rerenderCurrentView(); });
    DB.onRewards((rewards) => { this.state.rewards = rewards; this.rerenderCurrentView(); });
    DB.onSubmissions((subs) => { this.state.submissions = subs; this.rerenderCurrentView(); });
    DB.onRedemptions((reds) => { this.state.redemptions = reds; this.rerenderCurrentView(); });
    DB.onQuizResults((qr) => { this.state.quizResults = qr; this.rerenderCurrentView(); });

    const saved = localStorage.getItem("activeProfile");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        this.state.activeProfile = p;
        this.openApp();
        return;
      } catch (e) {}
    }
    this.screen("profile");
    this.renderProfileScreen();
  },

  renderProfileScreen() {
    if (this.el("screen-profile").classList.contains("hidden")) return;
    const list = this.el("profile-list");
    list.innerHTML = "";
    (this.state.meta.children || []).forEach((c) => {
      const btn = document.createElement("button");
      btn.className = "profile-item";
      btn.innerHTML = `<span class="pa">${c.avatar || "🙂"}</span><span>${c.name}</span><span class="pp">⭐ ${c.points || 0}</span>`;
      btn.onclick = () => {
        this.state.activeProfile = { childId: c.id };
        localStorage.setItem("activeProfile", JSON.stringify(this.state.activeProfile));
        this.openApp();
      };
      list.appendChild(btn);
    });
    this.el("btn-open-parent-from-profile").onclick = () => {
      this.requestParentPin(() => {
        this.state.activeProfile = null;
        localStorage.removeItem("activeProfile");
        this.openApp(true);
      });
    };
    this.el("btn-show-family-code").onclick = () => {
      this.openModal(`<h2>Ģimenes kods</h2><p class="pin-input" style="font-size:24px;">${DB.getFamilyCode()}</p>
      <p class="muted">Ievadi šo kodu citās ierīcēs, lai tās redzētu tos pašus uzdevumus un punktus.</p>
      <button class="btn btn-primary" id="btn-code-close">Aizvērt</button>`);
      this.el("btn-code-close").onclick = () => this.closeModal();
    };
  },

  requestParentPin(onSuccess) {
    const hasPin = !!this.state.meta.parentPinHash;
    this.screen("pin");
    this.el("pin-title").textContent = hasPin ? "Vecāku PIN" : "Izveido vecāku PIN";
    this.el("pin-subtitle").textContent = hasPin
      ? "Ievadi PIN, lai piekļūtu vecāku sadaļai."
      : "Šis PIN aizsargās uzdevumu, punktu un veikala iestatījumus.";
    this.el("input-pin").value = "";
    this.el("input-pin-confirm").value = "";
    this.el("pin-confirm-wrap").classList.toggle("hidden", hasPin);
    this.el("pin-error").classList.add("hidden");
    this.el("input-pin").focus();

    this.el("btn-pin-cancel").onclick = () => {
      if (this.state.activeProfile) this.openApp(); else this.screen("profile");
    };

    this.el("btn-pin-submit").onclick = async () => {
      const pin = this.el("input-pin").value.trim();
      if (!/^\d{4,6}$/.test(pin)) {
        this.el("pin-error").textContent = "PIN jābūt 4-6 ciparu garam.";
        this.el("pin-error").classList.remove("hidden");
        return;
      }
      if (!hasPin) {
        const confirm = this.el("input-pin-confirm").value.trim();
        if (pin !== confirm) {
          this.el("pin-error").textContent = "PIN kodi nesakrīt. Mēģini vēlreiz.";
          this.el("pin-error").classList.remove("hidden");
          return;
        }
        const hash = await Utils.sha256(pin);
        await DB.setParentPinHash(hash);
        this.state.parentUnlocked = true;
        onSuccess();
        return;
      }
      const hash = await Utils.sha256(pin);
      if (hash === this.state.meta.parentPinHash) {
        this.state.parentUnlocked = true;
        onSuccess();
      } else {
        this.el("pin-error").textContent = "Nepareizs PIN. Mēģini vēlreiz.";
        this.el("pin-error").classList.remove("hidden");
      }
    };
  },

  openApp(intoParent = false) {
    this.screen("app");
    this.updateHeader();
    this.wireNav();
    this.switchView(intoParent ? "parent" : "tasks");
  },

  updateHeader() {
    const child = this.currentChild();
    if (child) {
      this.el("header-avatar").textContent = child.avatar || "🙂";
      this.el("header-name").textContent = child.name;
      this.el("header-points").textContent = `⭐ ${child.points || 0} punkti`;
    } else {
      this.el("header-avatar").textContent = "🔒";
      this.el("header-name").textContent = "Vecāku skats";
      this.el("header-points").textContent = "";
    }
   this.el("btn-switch-profile").onclick = () => {
      this.requestParentPin(() => {
        this.state.activeProfile = null;
        localStorage.removeItem("activeProfile");
        this.screen("profile");
        this.renderProfileScreen();
      });
    };

  wireNav() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.onclick = () => {
        const view = btn.dataset.view;
        if (view === "parent" && !this.state.parentUnlocked) {
          this.requestParentPin(() => this.switchView("parent"));
          return;
        }
        this.switchView(view);
      };
    });
  },

  switchView(view) {
    this.state.currentView = view;
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
    this.el("view-" + view).classList.remove("hidden");
    this.rerenderCurrentView();
  },

  rerenderCurrentView() {
    if (this.el("app").classList.contains("hidden")) return;
    const view = this.state.currentView;
    if (view === "tasks") Tasks.render(this.el("view-tasks"));
    else if (view === "learning") Learning.render(this.el("view-learning"));
    else if (view === "shop") Shop.render(this.el("view-shop"));
    else if (view === "parent") Parent.render(this.el("view-parent"));
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.boot());
