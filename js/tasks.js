// ============================================================
// tasks.js — bērna uzdevumu dēlis
// ============================================================

const Tasks = {
  render(container) {
    const child = App.currentChild();
    if (!child) {
      container.innerHTML = `<div class="empty-state"><div class="ee">🔒</div>Šis skats ir bērna profilam.</div>`;
      return;
    }
    const today = Utils.todayISO();
    const myTasks = App.state.tasks.filter((t) => t.active !== false && (t.assignedTo === "all" || t.assignedTo === child.id));

    const findSub = (taskId) => App.state.submissions
      .filter((s) => s.taskId === taskId && s.childId === child.id && s.date === today)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];

    const groups = [
      { key: "majas", title: "🏠 Mājas darbi" },
      { key: "macibas", title: "📚 Citi uzdevumi" }
    ];

    let html = "";
    if (myTasks.length === 0) {
      html = `<div class="empty-state"><div class="ee">🌤️</div>Šodien vēl nav neviena uzdevuma.<br>Vecāki var pievienot uzdevumus sadaļā "Vecākiem".</div>`;
    } else {
      groups.forEach((g) => {
        const items = myTasks.filter((t) => (t.category || "majas") === g.key);
        if (items.length === 0) return;
        html += `<div class="section-title">${g.title}</div>`;
        items.forEach((t) => {
          const sub = findSub(t.id);
          let btnClass = "check-btn", btnIcon = "○", badge = "";
          if (sub && sub.status === "approved") { btnClass += " done"; btnIcon = "✓"; badge = `<span class="badge badge-approved">Ieskaitīts +${sub.pointsAwarded}</span>`; }
          else if (sub && sub.status === "pending") { btnClass += " pending"; btnIcon = "⏳"; badge = `<span class="badge badge-pending">Gaida apstiprinājumu</span>`; }
          else if (sub && sub.status === "rejected") { badge = `<span class="badge badge-rejected">Noraidīts — mēģini vēl</span>`; }

          html += `
          <div class="item-card">
            <div class="item-icon">${t.icon || "📌"}</div>
            <div class="item-body">
              <div class="item-title">${t.title}</div>
              <div class="item-sub">⭐ ${t.points} punkti ${t.requiresApproval ? "· vajag vecāku apstiprinājumu" : "· punkti uzreiz"}</div>
              ${badge ? `<div style="margin-top:6px;">${badge}</div>` : ""}
            </div>
            <button class="${btnClass}" data-task="${t.id}" ${sub && sub.status !== "rejected" ? "disabled" : ""}>${btnIcon}</button>
          </div>`;
        });
      });
    }
    container.innerHTML = html;

    container.querySelectorAll("[data-task]").forEach((btn) => {
      btn.onclick = () => this.openCompleteModal(App.state.tasks.find((t) => t.id === btn.dataset.task), child);
    });
  },

  openCompleteModal(task, child) {
    if (!task.requiresApproval) {
      this.instantComplete(task, child);
      return;
    }
    App.openModal(`
      <h2>${task.icon || "📌"} ${task.title}</h2>
      <p class="muted">Uzņem foto kā pierādījumu (nav obligāti), tad iesniedz — vecāki to apstiprinās un tu saņemsi ⭐ ${task.points} punktus.</p>
      <input type="file" accept="image/*" capture="environment" id="task-photo-input">
      <img id="task-photo-preview" class="photo-preview hidden">
      <textarea id="task-note" placeholder="Piezīme (nav obligāti)" rows="2"></textarea>
      <button class="btn btn-primary btn-lg" id="btn-submit-task">Iesniegt pārbaudei</button>
      <button class="btn btn-ghost" id="btn-cancel-task">Atcelt</button>
    `);
    let photoData = null;
    const fileInput = App.el("task-photo-input");
    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files[0]) {
        photoData = await Utils.compressImageFile(fileInput.files[0]);
        const img = App.el("task-photo-preview");
        img.src = photoData; img.classList.remove("hidden");
      }
    };
    App.el("btn-cancel-task").onclick = () => App.closeModal();
    App.el("btn-submit-task").onclick = async () => {
      const note = App.el("task-note").value.trim();
      await DB.addSubmission({
        taskId: task.id, childId: child.id, date: Utils.todayISO(),
        status: "pending", photo: photoData, note, pointsAwarded: 0,
        createdAt: new Date().toISOString()
      });
      App.closeModal();
      App.showToast("Iesniegts! Gaidi vecāku apstiprinājumu ⏳");
    };
  },

  async instantComplete(task, child) {
    await DB.addSubmission({
      taskId: task.id, childId: child.id, date: Utils.todayISO(),
      status: "approved", photo: null, note: "", pointsAwarded: task.points,
      createdAt: new Date().toISOString()
    });
    await DB.adjustChildPoints(child.id, task.points);
    App.showToast(`Lieliski! +${task.points} punkti ⭐`);
  }
};

window.Tasks = Tasks;
