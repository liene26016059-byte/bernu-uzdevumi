// ============================================================
// parent.js — vecāku vadības un apstiprināšanas panelis
// (pieejams tikai pēc PIN ievades — sk. app.js requestParentPin)
// ============================================================

const Parent = {
  subview: "apstiprinasana",
  ICON_PRESET: ["🛏️","🍽️","🧹","📖","🧦","🐶","🪥","🧺","📚","✏️","🎒","🧸","🎁","📱","🍕","🎬","🎮","🍦","⭐","🚴"],

  render(container) {
    const tabs = [
      { key: "apstiprinasana", label: "Apstiprināt" },
      { key: "uzdevumi", label: "Uzdevumi" },
      { key: "balvas", label: "Balvas" },
      { key: "berni", label: "Bērni" },
      { key: "statistika", label: "Statistika" },
      { key: "iestatijumi", label: "Iestatījumi" }
    ];
    container.innerHTML = `
      <div class="tag-row">
        ${tabs.map((t) => `<div class="tag ${this.subview === t.key ? "active" : ""}" data-tab="${t.key}">${t.label}</div>`).join("")}
      </div>
      <div id="parent-subcontent"></div>
    `;
    container.querySelectorAll("[data-tab]").forEach((el) => {
      el.onclick = () => { this.subview = el.dataset.tab; this.render(container); };
    });
    const sub = container.querySelector("#parent-subcontent");
    if (this.subview === "apstiprinasana") this.renderApprovals(sub);
    else if (this.subview === "uzdevumi") this.renderTasks(sub);
    else if (this.subview === "balvas") this.renderRewards(sub);
    else if (this.subview === "berni") this.renderChildren(sub);
    else if (this.subview === "statistika") Stats.render(sub);
    else if (this.subview === "iestatijumi") this.renderSettings(sub);
  },

  childName(id) { const c = App.state.meta.children.find((x) => x.id === id); return c ? `${c.avatar} ${c.name}` : "?"; },

  // ---------------- APSTIPRINĀŠANA ----------------
  renderApprovals(container) {
    const pending = App.state.submissions.filter((s) => s.status === "pending").sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    const pendingRedemptions = App.state.redemptions.filter((r) => r.status === "gaida").sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));

    let html = `<div class="section-title">Uzdevumi, kas gaida apstiprinājumu</div>`;
    if (pending.length === 0) {
      html += `<div class="empty-state"><div class="ee">✅</div>Viss apstiprināts! Nekas negaida.</div>`;
    } else {
      pending.forEach((s) => {
        const task = App.state.tasks.find((t) => t.id === s.taskId);
        html += `
        <div class="item-card" style="align-items:flex-start;">
          <div class="item-icon">${task ? task.icon : "📌"}</div>
          <div class="item-body">
            <div class="item-title">${task ? task.title : "Uzdevums"}</div>
            <div class="item-sub">${this.childName(s.childId)} · ${new Date(s.createdAt).toLocaleString("lv-LV")}</div>
            ${s.note ? `<div class="item-sub">📝 ${s.note}</div>` : ""}
            ${s.photo ? `<img src="${s.photo}" class="photo-preview" style="max-height:180px;cursor:pointer;" data-view-photo="${s.id}">` : ""}
            <div class="list-actions">
              <button class="btn btn-secondary" data-approve="${s.id}">✓ Apstiprināt (+${task ? task.points : 0})</button>
              <button class="btn btn-danger" data-reject="${s.id}">✗ Noraidīt</button>
            </div>
          </div>
        </div>`;
      });
    }

    html += `<div class="section-title">Nopirktās balvas — jāizsniedz</div>`;
    if (pendingRedemptions.length === 0) {
      html += `<div class="empty-state"><div class="ee">🛍️</div>Nekas negaida izsniegšanu.</div>`;
    } else {
      pendingRedemptions.forEach((r) => {
        const reward = App.state.rewards.find((x) => x.id === r.rewardId);
        html += `
        <div class="item-card">
          <div class="item-icon">${reward ? reward.icon : "🎁"}</div>
          <div class="item-body">
            <div class="item-title">${reward ? reward.title : "Balva"}</div>
            <div class="item-sub">${this.childName(r.childId)} · −⭐ ${r.pointsSpent}</div>
          </div>
          <button class="btn btn-secondary" style="width:auto;padding:10px 14px;margin:0;" data-fulfill="${r.id}">Izsniegts</button>
        </div>`;
      });
    }

    container.innerHTML = html;

    container.querySelectorAll("[data-approve]").forEach((btn) => btn.onclick = async () => {
      const s = App.state.submissions.find((x) => x.id === btn.dataset.approve);
      const task = App.state.tasks.find((t) => t.id === s.taskId);
      const pts = task ? task.points : 0;
      await DB.updateSubmission(s.id, { status: "approved", pointsAwarded: pts });
      await DB.adjustChildPoints(s.childId, pts);
      App.showToast("Apstiprināts! Punkti piešķirti.");
    });
    container.querySelectorAll("[data-reject]").forEach((btn) => btn.onclick = async () => {
      await DB.updateSubmission(btn.dataset.reject, { status: "rejected", pointsAwarded: 0 });
      App.showToast("Noraidīts. Bērns var mēģināt vēlreiz.");
    });
    container.querySelectorAll("[data-fulfill]").forEach((btn) => btn.onclick = async () => {
      await DB.updateRedemption(btn.dataset.fulfill, { status: "izsniegts" });
      App.showToast("Atzīmēts kā izsniegts.");
    });
    container.querySelectorAll("[data-view-photo]").forEach((img) => img.onclick = () => {
      App.openModal(`<img src="${img.src}" style="width:100%;border-radius:16px;"><button class="btn btn-primary" id="photo-close">Aizvērt</button>`);
      App.el("photo-close").onclick = () => App.closeModal();
    });
  },

  // ---------------- UZDEVUMI (CRUD) ----------------
  renderTasks(container) {
    let html = `<button class="btn btn-primary" id="btn-new-task">+ Jauns uzdevums</button>`;
    if (App.state.tasks.length === 0) html += `<div class="empty-state">Vēl nav uzdevumu.</div>`;
    App.state.tasks.forEach((t) => {
      html += `
      <div class="item-card">
        <div class="item-icon">${t.icon}</div>
        <div class="item-body">
          <div class="item-title">${t.title} ${t.active === false ? '<span class="badge badge-rejected">Neaktīvs</span>' : ""}</div>
          <div class="item-sub">⭐ ${t.points} · ${t.category === "macibas" ? "Citi" : "Mājas"} · ${t.assignedTo === "all" ? "Abiem" : this.childName(t.assignedTo)} ${t.requiresApproval ? "· vajag foto/apstiprinājumu" : "· uzreiz punkti"}</div>
        </div>
        <div class="list-actions">
          <button class="btn btn-ghost" style="width:auto;margin:0;padding:8px;" data-edit-task="${t.id}">✏️</button>
          <button class="btn btn-ghost" style="width:auto;margin:0;padding:8px;color:var(--red);" data-del-task="${t.id}">🗑️</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelector("#btn-new-task").onclick = () => this.taskForm();
    container.querySelectorAll("[data-edit-task]").forEach((b) => b.onclick = () => this.taskForm(App.state.tasks.find((t) => t.id === b.dataset.editTask)));
    container.querySelectorAll("[data-del-task]").forEach((b) => b.onclick = async () => {
      if (confirm("Vai tiešām dzēst šo uzdevumu?")) { await DB.deleteTask(b.dataset.delTask); App.showToast("Dzēsts."); }
    });
  },

  taskForm(existing) {
    const children = App.state.meta.children || [];
    App.openModal(`
      <h2>${existing ? "Rediģēt uzdevumu" : "Jauns uzdevums"}</h2>
      <label>Nosaukums</label>
      <input type="text" id="f-title" value="${existing ? existing.title.replace(/"/g, "&quot;") : ""}" placeholder="piem. Saklāt gultu">
      <label>Ikona (emocijzīme)</label>
      <input type="text" id="f-icon" value="${existing ? existing.icon : "📌"}" maxlength="4">
      <div class="tag-row">${this.ICON_PRESET.map((i) => `<div class="tag" data-pick-icon="${i}">${i}</div>`).join("")}</div>
      <label>Punkti</label>
      <input type="number" id="f-points" value="${existing ? existing.points : 5}" min="1" max="200">
      <label>Kategorija</label>
      <select id="f-category">
        <option value="majas" ${existing && existing.category === "majas" ? "selected" : ""}>Mājas darbs</option>
        <option value="macibas" ${existing && existing.category === "macibas" ? "selected" : ""}>Cits / mācību uzdevums</option>
      </select>
      <label>Kuram bērnam</label>
      <select id="f-assigned">
        <option value="all" ${!existing || existing.assignedTo === "all" ? "selected" : ""}>Abiem bērniem</option>
        ${children.map((c) => `<option value="${c.id}" ${existing && existing.assignedTo === c.id ? "selected" : ""}>${c.avatar} ${c.name}</option>`).join("")}
      </select>
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <input type="checkbox" id="f-requires" style="width:20px;height:20px;" ${!existing || existing.requiresApproval ? "checked" : ""}>
        Vajag foto / vecāku apstiprinājumu
      </label>
      <label style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="f-active" style="width:20px;height:20px;" ${!existing || existing.active !== false ? "checked" : ""}>
        Aktīvs (redzams bērna sarakstā)
      </label>
      <button class="btn btn-primary btn-lg" id="btn-save-task">Saglabāt</button>
      <button class="btn btn-ghost" id="btn-cancel-task-form">Atcelt</button>
    `);
    App.el("modal-content").querySelectorAll("[data-pick-icon]").forEach((t) => t.onclick = () => { App.el("f-icon").value = t.dataset.pickIcon; });
    App.el("btn-cancel-task-form").onclick = () => App.closeModal();
    App.el("btn-save-task").onclick = async () => {
      const title = App.el("f-title").value.trim();
      if (!title) { App.showToast("Ievadi nosaukumu."); return; }
      const payload = {
        title,
        icon: App.el("f-icon").value.trim() || "📌",
        points: parseInt(App.el("f-points").value, 10) || 1,
        category: App.el("f-category").value,
        assignedTo: App.el("f-assigned").value,
        requiresApproval: App.el("f-requires").checked,
        active: App.el("f-active").checked
      };
      if (existing) await DB.updateTask(existing.id, payload);
      else await DB.addTask(payload);
      App.closeModal();
      App.showToast("Saglabāts!");
    };
  },

  // ---------------- BALVAS (CRUD) ----------------
  renderRewards(container) {
    let html = `<button class="btn btn-primary" id="btn-new-reward">+ Jauna balva</button>`;
    if (App.state.rewards.length === 0) html += `<div class="empty-state">Vēl nav balvu.</div>`;
    App.state.rewards.forEach((r) => {
      html += `
      <div class="item-card">
        <div class="item-icon">${r.icon}</div>
        <div class="item-body">
          <div class="item-title">${r.title} ${r.active === false ? '<span class="badge badge-rejected">Neaktīva</span>' : ""}</div>
          <div class="item-sub">⭐ ${r.pointsCost} punkti</div>
        </div>
        <div class="list-actions">
          <button class="btn btn-ghost" style="width:auto;margin:0;padding:8px;" data-edit-reward="${r.id}">✏️</button>
          <button class="btn btn-ghost" style="width:auto;margin:0;padding:8px;color:var(--red);" data-del-reward="${r.id}">🗑️</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelector("#btn-new-reward").onclick = () => this.rewardForm();
    container.querySelectorAll("[data-edit-reward]").forEach((b) => b.onclick = () => this.rewardForm(App.state.rewards.find((r) => r.id === b.dataset.editReward)));
    container.querySelectorAll("[data-del-reward]").forEach((b) => b.onclick = async () => {
      if (confirm("Vai tiešām dzēst šo balvu?")) { await DB.deleteReward(b.dataset.delReward); App.showToast("Dzēsta."); }
    });
  },

  rewardForm(existing) {
    App.openModal(`
      <h2>${existing ? "Rediģēt balvu" : "Jauna balva"}</h2>
      <label>Nosaukums</label>
      <input type="text" id="f-title" value="${existing ? existing.title.replace(/"/g, "&quot;") : ""}" placeholder="piem. 30 min ekrāna laiks">
      <label>Ikona</label>
      <input type="text" id="f-icon" value="${existing ? existing.icon : "🎁"}" maxlength="4">
      <div class="tag-row">${this.ICON_PRESET.map((i) => `<div class="tag" data-pick-icon="${i}">${i}</div>`).join("")}</div>
      <label>Punktu maksa</label>
      <input type="number" id="f-cost" value="${existing ? existing.pointsCost : 20}" min="1" max="1000">
      <label style="display:flex;align-items:center;gap:8px;margin-top:10px;">
        <input type="checkbox" id="f-active" style="width:20px;height:20px;" ${!existing || existing.active !== false ? "checked" : ""}>
        Aktīva (redzama veikalā)
      </label>
      <button class="btn btn-primary btn-lg" id="btn-save-reward">Saglabāt</button>
      <button class="btn btn-ghost" id="btn-cancel-reward-form">Atcelt</button>
    `);
    App.el("modal-content").querySelectorAll("[data-pick-icon]").forEach((t) => t.onclick = () => { App.el("f-icon").value = t.dataset.pickIcon; });
    App.el("btn-cancel-reward-form").onclick = () => App.closeModal();
    App.el("btn-save-reward").onclick = async () => {
      const title = App.el("f-title").value.trim();
      if (!title) { App.showToast("Ievadi nosaukumu."); return; }
      const payload = {
        title,
        icon: App.el("f-icon").value.trim() || "🎁",
        pointsCost: parseInt(App.el("f-cost").value, 10) || 1,
        active: App.el("f-active").checked
      };
      if (existing) await DB.updateReward(existing.id, payload);
      else await DB.addReward(payload);
      App.closeModal();
      App.showToast("Saglabāts!");
    };
  },

  // ---------------- BĒRNI ----------------
  renderChildren(container) {
    let html = `<div class="section-title">Bērnu profili</div>`;
    (App.state.meta.children || []).forEach((c) => {
      html += `
      <div class="item-card">
        <div class="item-icon">${c.avatar}</div>
        <div class="item-body">
          <div class="item-title">${c.name}</div>
          <div class="item-sub">⭐ ${c.points || 0} punkti</div>
        </div>
        <button class="btn btn-ghost" style="width:auto;margin:0;padding:8px;" data-edit-child="${c.id}">✏️</button>
      </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll("[data-edit-child]").forEach((b) => b.onclick = () => this.childForm(App.state.meta.children.find((c) => c.id === b.dataset.editChild)));
  },

  childForm(child) {
    const avatarPreset = ["🦁","🐼","🐯","🐶","🐱","🦊","🐨","🐸","🦄","🐵","🐰","🐻"];
    App.openModal(`
      <h2>${child.avatar} ${child.name}</h2>
      <label>Vārds</label>
      <input type="text" id="f-name" value="${child.name.replace(/"/g, "&quot;")}">
      <label>Avatārs</label>
      <input type="text" id="f-avatar" value="${child.avatar}" maxlength="4">
      <div class="tag-row">${avatarPreset.map((a) => `<div class="tag" data-pick-avatar="${a}">${a}</div>`).join("")}</div>
      <label>Punktu korekcija (ievadi +5 vai -5, u.tml.)</label>
      <input type="number" id="f-adjust" value="0">
      <button class="btn btn-primary btn-lg" id="btn-save-child">Saglabāt</button>
      <button class="btn btn-ghost" id="btn-cancel-child-form">Atcelt</button>
    `);
    App.el("modal-content").querySelectorAll("[data-pick-avatar]").forEach((t) => t.onclick = () => { App.el("f-avatar").value = t.dataset.pickAvatar; });
    App.el("btn-cancel-child-form").onclick = () => App.closeModal();
    App.el("btn-save-child").onclick = async () => {
      const name = App.el("f-name").value.trim();
      if (!name) { App.showToast("Ievadi vārdu."); return; }
      await DB.updateChild(child.id, { name, avatar: App.el("f-avatar").value.trim() || "🙂" });
      const adjust = parseInt(App.el("f-adjust").value, 10) || 0;
      if (adjust !== 0) await DB.adjustChildPoints(child.id, adjust);
      App.closeModal();
      App.showToast("Saglabāts!");
    };
  },

  // ---------------- IESTATĪJUMI ----------------
  renderSettings(container) {
    container.innerHTML = `
      <div class="stat-card">
        <h3>Ģimenes kods</h3>
        <p class="pin-input" style="font-size:20px;">${DB.getFamilyCode()}</p>
        <p class="muted small">Izmanto šo kodu, lai citās ierīcēs (piem., otra bērna telefonā) pieslēgtos tiem pašiem datiem.</p>
        <p class="muted small">Režīms: ${DB.mode() === "firebase" ? "Sinhronizēts (Firebase)" : "Lokāls (dati tikai šajā ierīcē)"}</p>
      </div>
      <div class="stat-card">
        <h3>Vecāku PIN</h3>
        <button class="btn btn-secondary" id="btn-change-pin">Mainīt PIN</button>
      </div>
      <button class="btn btn-ghost" id="btn-lock-parent">🔒 Aizvērt vecāku skatu</button>
    `;
    container.querySelector("#btn-change-pin").onclick = async () => {
      await DB.setParentPinHash(null);
      App.state.meta.parentPinHash = null;
      App.showToast("PIN atiestatīts — tagad izveido jaunu.");
      App.requestParentPin(() => Parent.render(App.el("view-parent")));
    };
    container.querySelector("#btn-lock-parent").onclick = () => {
      App.state.parentUnlocked = false;
      App.screen("profile");
      App.renderProfileScreen();
    };
  }
};

window.Parent = Parent;
