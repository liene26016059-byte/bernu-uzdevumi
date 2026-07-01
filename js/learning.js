// ============================================================
// learning.js — mācību modulis (matemātika + latviešu valoda)
// Jautājumi ģenerējas / tiek izvēlēti nejauši, punkti tiek piešķirti
// automātiski uzreiz pēc pareizas atbildes.
// ============================================================

const Learning = {
  POINTS_PER_CORRECT: 3,
  BONUS_FULL: 10,
  MAX_SCORED_SESSIONS_PER_DAY: 3,
  QUESTIONS_PER_SESSION: 5,

  session: null,

  // ---------- MATEMĀTIKA — jautājumu ģenerators ----------
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },

  genMathQuestion() {
    const type = this.randInt(1, 6);
    let q, correct, unit = "";
    if (type === 1) {
      const a = this.randInt(20, 400), b = this.randInt(10, 300);
      q = `${a} + ${b} = ?`; correct = a + b;
    } else if (type === 2) {
      let a = this.randInt(20, 500), b = this.randInt(10, a);
      q = `${a} − ${b} = ?`; correct = a - b;
    } else if (type === 3) {
      const a = this.randInt(2, 12), b = this.randInt(2, 12);
      q = `${a} × ${b} = ?`; correct = a * b;
    } else if (type === 4) {
      const b = this.randInt(2, 12), correctQ = this.randInt(2, 12);
      const a = b * correctQ;
      q = `${a} ÷ ${b} = ?`; correct = correctQ;
    } else if (type === 5) {
      const whole = this.randInt(4, 20) * 2;
      q = `Cik ir puse no ${whole}?`; correct = whole / 2;
    } else {
      const names = ["Annai", "Jānim", "Laurai", "Tomam", "Evai", "Kārlim"];
      const name = names[this.randInt(0, names.length - 1)];
      const start = this.randInt(15, 60), give = this.randInt(3, Math.min(14, start - 1));
      q = `${name} bija ${start} konfektes. Viņš/viņa iedeva draugam ${give}. Cik konfekšu palika?`;
      correct = start - give;
    }
    const options = new Set([correct]);
    while (options.size < 4) {
      const delta = this.randInt(-8, 8) || 1;
      const wrong = correct + delta;
      if (wrong >= 0) options.add(wrong);
    }
    return { question: q, options: this.shuffle([...options]), correct };
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // ---------- LATVIEŠU VALODA — jautājumu banka ----------
  LANGUAGE_BANK: [
    { q: "Kurš vārds ir sinonīms vārdam 'jautrs'?", options: ["Priecīgs", "Skumjš", "Dusmīgs", "Nogurušs"], correct: 0 },
    { q: "Kurš vārds ir antonīms vārdam 'liels'?", options: ["Garš", "Mazs", "Plats", "Smags"], correct: 1 },
    { q: "Kā pareizi: 'Es __ uz skolu.'", options: ["eju", "iju", "eiju", "aiju"], correct: 0 },
    { q: "Kurš teikums ir pareizs?", options: ["Man ir divi māsas.", "Man ir divas māsas.", "Man ir divām māsas.", "Man ir divi māsu."], correct: 1 },
    { q: "Kurš vārds rakstāms ar garo 'ā'?", options: ["Vards", "Vārds", "Varrds", "Vaards"], correct: 1 },
    { q: "Kāds ir daudzskaitlis vārdam 'grāmata'?", options: ["Grāmatas", "Grāmatām", "Grāmatu", "Grāmatai"], correct: 0 },
    { q: "Kurš vārds ir lietvārds?", options: ["Skriet", "Skaists", "Skola", "Ātri"], correct: 2 },
    { q: "Kurš vārds ir darbības vārds?", options: ["Saule", "Lasīt", "Dzeltens", "Logs"], correct: 1 },
    { q: "Kā pareizi raksta: 'suns __ pagalmā'?", options: ["skrien", "skrjen", "skryen", "skrein"], correct: 0 },
    { q: "Kurš no vārdiem ir sinonīms 'runāt'?", options: ["Klusēt", "Sacīt", "Gulēt", "Skatīties"], correct: 1 },
    { q: "Kāds burts trūkst: 'z_le' (telpa mājā)?", options: ["a", "ā", "o", "u"], correct: 1 },
    { q: "Kurš teikums beidzas ar jautājuma zīmi?", options: ["Šodien ir saulains.", "Cik ir pulkstenis?", "Es eju mājās.", "Lieliski!"], correct: 1 },
    { q: "Kurš vārds ir īpašības vārds?", options: ["Skrien", "Zaļš", "Koks", "Ātri"], correct: 1 },
    { q: "Kā skan vārda 'auksts' antonīms?", options: ["Silts", "Slapjš", "Sauss", "Karsts"], correct: 0 },
    { q: "Kurš vārds rakstāms kopā?", options: ["Nezinu", "Ne zinu", "Nez inu", "N ezinu"], correct: 0 },
    { q: "Kāds ir pareizais daudzskaitlis 'bērns'?", options: ["Bērni", "Bērnas", "Bērniem", "Bērnu"], correct: 0 },
    { q: "Kurš vārds apzīmē krāsu?", options: ["Ātrs", "Sarkans", "Skaļš", "Garšīgs"], correct: 1 },
    { q: "Kā pareizi: 'Vakar es __ grāmatu.'", options: ["lasu", "lasīšu", "lasīju", "lasīt"], correct: 2 },
    { q: "Kurš vārds ir pareizi uzrakstīts?", options: ["Draugs", "Draux", "Drugs", "Draugz"], correct: 0 },
    { q: "Kurš no šiem ir apstākļa vārds?", options: ["Ātri", "Māja", "Zils", "Kaķis"], correct: 0 },
    { q: "Kā sauc teikuma daļu, kas parāda darbību?", options: ["Teicējs", "Izteicējs", "Papildinātājs", "Apzīmētājs"], correct: 1 },
    { q: "Kurš vārds ir daudzskaitlī?", options: ["Ābols", "Āboli", "Ābolam", "Ābola"], correct: 1 },
    { q: "Kā pareizi: 'Rīt mēs __ uz zoodārzu.'", options: ["gājām", "iesim", "ejam", "gāja"], correct: 1 },
    { q: "Kurš vārds ir sinonīms 'skaists'?", options: ["Neglīts", "Jauks", "Nogurošs", "Auksts"], correct: 1 },
    { q: "Kā pareizi raksta ciparu 100 vārdiem?", options: ["Simts", "Simt", "Simc", "Sims"], correct: 0 }
  ],

  // ---------- Sesiju kontrole ----------
  todaySessionCount(childId, subject) {
    const today = Utils.todayISO();
    return App.state.quizResults.filter((r) => r.childId === childId && r.subject === subject && r.date === today).length;
  },

  render(container) {
    const child = App.currentChild();
    if (!child) {
      container.innerHTML = `<div class="empty-state"><div class="ee">🔒</div>Šis skats ir bērna profilam.</div>`;
      return;
    }
    if (this.session) {
      // Ja sesija vēl aktīva UN jautājuma indekss ir derīgā robežās, rādām jautājumu.
      // Ja finishSession() jau aprēķina rezultātu (starp DB izsaukumiem var pienākt
      // "starpposma" pārzīmēšana no citiem datu klausītājiem) — neko nedarām, jo
      // finishSession() pats tūlīt uzzīmēs rezultātu ekrānu.
      if (this.session.index < this.session.questions.length) this.renderQuestion(container);
      return;
    }

    const mathCount = this.todaySessionCount(child.id, "matematika");
    const valCount = this.todaySessionCount(child.id, "valoda");

    container.innerHTML = `
      <div class="section-title">Izvēlies mācību jomu</div>
      <div class="item-card" id="start-math">
        <div class="item-icon">➕</div>
        <div class="item-body">
          <div class="item-title">Matemātika</div>
          <div class="item-sub">${this.QUESTIONS_PER_SESSION} jautājumi · ⭐ līdz ${this.QUESTIONS_PER_SESSION * this.POINTS_PER_CORRECT + this.BONUS_FULL} punkti</div>
          <div class="item-sub">Šodien spēlēts: ${mathCount}/${this.MAX_SCORED_SESSIONS_PER_DAY} (punktus dod tikai pirmās ${this.MAX_SCORED_SESSIONS_PER_DAY} reizes)</div>
        </div>
        <button class="check-btn" style="border-color:var(--blue);color:var(--blue);">▶</button>
      </div>
      <div class="item-card" id="start-valoda">
        <div class="item-icon">📚</div>
        <div class="item-body">
          <div class="item-title">Latviešu valoda</div>
          <div class="item-sub">${this.QUESTIONS_PER_SESSION} jautājumi · ⭐ līdz ${this.QUESTIONS_PER_SESSION * this.POINTS_PER_CORRECT + this.BONUS_FULL} punkti</div>
          <div class="item-sub">Šodien spēlēts: ${valCount}/${this.MAX_SCORED_SESSIONS_PER_DAY} (punktus dod tikai pirmās ${this.MAX_SCORED_SESSIONS_PER_DAY} reizes)</div>
        </div>
        <button class="check-btn" style="border-color:var(--blue);color:var(--blue);">▶</button>
      </div>
    `;
    container.querySelector("#start-math").onclick = () => this.startSession(child, "matematika");
    container.querySelector("#start-valoda").onclick = () => this.startSession(child, "valoda");
  },

  startSession(child, subject) {
    let questions;
    if (subject === "matematika") {
      questions = Array.from({ length: this.QUESTIONS_PER_SESSION }, () => this.genMathQuestion());
    } else {
      questions = this.shuffle(this.LANGUAGE_BANK).slice(0, this.QUESTIONS_PER_SESSION).map((q) => ({
        question: q.q, options: q.options, correct: q.options[q.correct]
      }));
    }
    this.session = { child, subject, questions, index: 0, correctCount: 0, answered: false };
    this.renderQuestion(App.el("view-learning"));
  },

  renderQuestion(container) {
    const s = this.session;
    const q = s.questions[s.index];
    container.innerHTML = `
      <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${(s.index / s.questions.length) * 100}%"></div></div>
      <div class="section-title">Jautājums ${s.index + 1} no ${s.questions.length}</div>
      <div class="item-card" style="display:block;">
        <div class="item-title" style="font-size:19px;margin-bottom:6px;">${q.question}</div>
      </div>
      <div id="quiz-options"></div>
    `;
    const optWrap = container.querySelector("#quiz-options");
    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "quiz-option";
      b.textContent = opt;
      b.onclick = () => this.answer(opt, b, container);
      optWrap.appendChild(b);
    });
  },

  answer(chosen, btnEl, container) {
    const s = this.session;
    if (s.answered) return;
    s.answered = true;
    const q = s.questions[s.index];
    const isCorrect = chosen === q.correct;
    if (isCorrect) s.correctCount++;
    container.querySelectorAll(".quiz-option").forEach((b) => {
      if (b.textContent == q.correct) b.classList.add("correct");
      else if (b === btnEl) b.classList.add("wrong");
    });
    setTimeout(() => {
      s.index++;
      s.answered = false;
      if (s.index >= s.questions.length) this.finishSession(container);
      else this.renderQuestion(container);
    }, 800);
  },

  async finishSession(container) {
    const s = this.session;
    const scoredSessionsToday = this.todaySessionCount(s.child.id, s.subject);
    const willScore = scoredSessionsToday < this.MAX_SCORED_SESSIONS_PER_DAY;
    let pointsEarned = 0;
    if (willScore) {
      pointsEarned = s.correctCount * this.POINTS_PER_CORRECT;
      if (s.correctCount === s.questions.length) pointsEarned += this.BONUS_FULL;
      if (pointsEarned > 0) await DB.adjustChildPoints(s.child.id, pointsEarned);
    }
    await DB.addQuizResult({
      childId: s.child.id, subject: s.subject, date: Utils.todayISO(),
      correct: s.correctCount, total: s.questions.length, pointsEarned,
      createdAt: new Date().toISOString()
    });

    container.innerHTML = `
      <div class="empty-state">
        <div class="ee">${s.correctCount === s.questions.length ? "🏆" : "🎉"}</div>
        <h2 style="margin-top:0;">Rezultāts: ${s.correctCount} / ${s.questions.length}</h2>
        <p>${willScore ? `Nopelnīti ⭐ ${pointsEarned} punkti!` : "Šodien punktu limits šai jomai sasniegts, bet paldies par vingrināšanos! 💪"}</p>
        <button class="btn btn-primary btn-lg" id="btn-quiz-again">Spēlēt vēlreiz</button>
        <button class="btn btn-ghost" id="btn-quiz-done">Gatavs</button>
      </div>
    `;
    container.querySelector("#btn-quiz-again").onclick = () => { this.session = null; this.startSession(s.child, s.subject); };
    container.querySelector("#btn-quiz-done").onclick = () => { this.session = null; this.render(container); };
  }
};

window.Learning = Learning;
