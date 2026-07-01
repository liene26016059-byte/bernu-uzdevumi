// ============================================================
// shop.js — virtuālais veikals un apbalvojumu sistēma
// ============================================================

const Shop = {
  render(container) {
    const child = App.currentChild();
    if (!child) {
      container.innerHTML = `<div class="empty-state"><div class="ee">🔒</div>Šis skats ir bērna profilam.</div>`;
      return;
    }
    const rewards = App.state.rewards.filter((r) => r.active !== false);
    const myRedemptions = App.state.redemptions
      .filter((r) => r.childId === child.id)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    let html = `<div class="section-title">Tavi punkti: ⭐ ${child.points || 0}</div>`;

    if (rewards.length === 0) {
      html += `<div class="empty-state"><div class="ee">🛍️</div>Vēl nav balvu. Vecāki var pievienot balvas sadaļā "Vecākiem".</div>`;
    } else {
      html += `<div class="section-title">Veikals</div>`;
      rewards.forEach((r) => {
        const canAfford = (child.points || 0) >= r.pointsCost;
        html += `
        <div class="item-card">
          <div class="item-icon">${r.icon || "🎁"}</div>
          <div class="item-body">
            <div class="item-title">${r.title}</div>
            <div class="item-sub">⭐ ${r.pointsCost} punkti</div>
          </div>
          <button class="btn ${canAfford ? "btn-primary" : "btn-ghost"}" style="width:auto;padding:10px 16px;margin:0;" data-reward="${r.id}" ${canAfford ? "" : "disabled"}>Pirkt</button>
        </div>`;
      });
    }

    if (myRedemptions.length > 0) {
      html += `<div class="section-title">Tavi pirkumi</div>`;
      myRedemptions.slice(0, 10).forEach((red) => {
        const reward = App.state.rewards.find((r) => r.id === red.rewardId);
        const badge = red.status === "izsniegts"
          ? `<span class="badge badge-approved">Saņemts</span>`
          : `<span class="badge badge-pending">Gaida izsniegšanu</span>`;
        html += `
        <div class="item-card">
          <div class="item-icon">${reward ? reward.icon : "🎁"}</div>
          <div class="item-body">
            <div class="item-title">${reward ? reward.title : "Balva vairs nav pieejama"}</div>
            <div class="item-sub">−⭐ ${red.pointsSpent} · ${new Date(red.createdAt).toLocaleDateString("lv-LV")}</div>
            <div style="margin-top:6px;">${badge}</div>
          </div>
        </div>`;
      });
    }

    container.innerHTML = html;
    container.querySelectorAll("[data-reward]").forEach((btn) => {
      btn.onclick = () => this.confirmRedeem(App.state.rewards.find((r) => r.id === btn.dataset.reward), child);
    });
  },

  confirmRedeem(reward, child) {
    App.openModal(`
      <h2>${reward.icon || "🎁"} ${reward.title}</h2>
      <p>Vai tiešām vēlies iztērēt <b>⭐ ${reward.pointsCost} punktus</b> šai balvai?</p>
      <p class="muted">Pēc pirkuma pastāsti vecākiem — viņi to atzīmēs kā izsniegtu.</p>
      <button class="btn btn-primary btn-lg" id="btn-redeem-confirm">Jā, pirkt!</button>
      <button class="btn btn-ghost" id="btn-redeem-cancel">Atcelt</button>
    `);
    App.el("btn-redeem-cancel").onclick = () => App.closeModal();
    App.el("btn-redeem-confirm").onclick = async () => {
      if ((child.points || 0) < reward.pointsCost) { App.showToast("Diemžēl vairs nepietiek punktu."); App.closeModal(); return; }
      await DB.adjustChildPoints(child.id, -reward.pointsCost);
      await DB.addRedemption({
        childId: child.id, rewardId: reward.id, pointsSpent: reward.pointsCost,
        status: "gaida", createdAt: new Date().toISOString()
      });
      App.closeModal();
      App.showToast("Nopirkts! 🎉 Pastāsti vecākiem!");
    };
  }
};

window.Shop = Shop;
