// ============================================================
// stats.js — progresa un statistikas pārskati (vecākiem)
// Vienkārši, atkarību nesaturoši josla-grafiki (bez ārējām bibliotēkām).
// ============================================================

const Stats = {
  selectedChildId: null,

  last7Days() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  },

  dayLabel(iso) {
    const names = ["Sv", "P", "O", "T", "C", "Pk", "S"];
    return names[new Date(iso).getDay()];
  },

  barChart(values, labels, maxHint) {
    const max = Math.max(maxHint || 1, ...values, 1);
    return `<div style="display:flex;align-items:flex-end;gap:8px;height:110px;">
      ${values.map((v, i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
          <div style="font-size:11px;font-weight:700;color:var(--muted);margin-bottom:2px;">${v || ""}</div>
          <div style="width:100%;background:var(--blue);border-radius:6px 6px 0 0;height:${v ? Math.max(6, (v / max) * 80) : 2}px;"></div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">${labels[i]}</div>
        </div>
      `).join("")}
    </div>`;
  },

  render(container) {
    const children = App.state.meta.children || [];
    if (children.length === 0) {
      container.innerHTML = `<div class="empty-state">Nav bērnu profilu.</div>`;
      return;
    }
    if (!this.selectedChildId || !children.find((c) => c.id === this.selectedChildId)) {
      this.selectedChildId = children[0].id;
    }
    const child = children.find((c) => c.id === this.selectedChildId);
    const days = this.last7Days();
    const labels = days.map((d) => this.dayLabel(d));

    const completions = days.map((d) =>
      App.state.submissions.filter((s) => s.childId === child.id && s.date === d && s.status === "approved").length
    );

    const mathResults = App.state.quizResults.filter((r) => r.childId === child.id && r.subject === "matematika");
    const valResults = App.state.quizResults.filter((r) => r.childId === child.id && r.subject === "valoda");
    const accByDay = (results) => days.map((d) => {
      const dayResults = results.filter((r) => r.date === d);
      if (dayResults.length === 0) return 0;
      const c = dayResults.reduce((s, r) => s + r.correct, 0);
      const t = dayResults.reduce((s, r) => s + r.total, 0);
      return t ? Math.round((c / t) * 100) : 0;
    });

    const weekApproved = completions.reduce((a, b) => a + b, 0);
    const weekQuizzes = days.reduce((sum, d) => sum + App.state.quizResults.filter((r) => r.childId === child.id && r.date === d).length, 0);
    const pendingCount = App.state.submissions.filter((s) => s.childId === child.id && s.status === "pending").length;

    container.innerHTML = `
      <div class="child-tab-row">
        ${children.map((c) => `<div class="child-tab ${c.id === this.selectedChildId ? "active" : ""}" data-child="${c.id}">${c.avatar} ${c.name}</div>`).join("")}
      </div>

      <div class="stat-card">
        <h3>📌 Kopsavilkums</h3>
        <div class="stat-row"><span>Punkti šobrīd</span><b>⭐ ${child.points || 0}</b></div>
        <div class="stat-row"><span>Izpildīti uzdevumi (7 dienās)</span><b>${weekApproved}</b></div>
        <div class="stat-row"><span>Mācību testi (7 dienās)</span><b>${weekQuizzes}</b></div>
        <div class="stat-row"><span>Gaida apstiprinājumu</span><b>${pendingCount}</b></div>
      </div>

      <div class="stat-card">
        <h3>✅ Izpildītie uzdevumi pēdējās 7 dienās</h3>
        ${this.barChart(completions, labels, 3)}
      </div>

      <div class="stat-card">
        <h3>➕ Matemātikas rezultāti (% pareizu, pēdējās 7 dienās)</h3>
        ${this.barChart(accByDay(mathResults), labels, 100)}
      </div>

      <div class="stat-card">
        <h3>📚 Valodas rezultāti (% pareizu, pēdējās 7 dienās)</h3>
        ${this.barChart(accByDay(valResults), labels, 100)}
      </div>
    `;

    container.querySelectorAll("[data-child]").forEach((el) => {
      el.onclick = () => { this.selectedChildId = el.dataset.child; this.render(container); };
    });
  }
};

window.Stats = Stats;
