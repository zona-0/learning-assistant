const API = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : window.location.origin + '/api';

const DEFAULT_DATA = {
  week: {
    activity: { labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], focus: [0, 0, 0, 0, 0, 0, 0], brk: [0, 0, 0, 0, 0, 0, 0] },
    quiz: [0, 0, 0, 0, 0, 0], streak: [0, 0, 0, 0, 0, 0, 0], subjects: []
  },
  month: {
    activity: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], focus: [0, 0, 0, 0], brk: [0, 0, 0, 0] },
    quiz: [0, 0, 0, 0, 0, 0], streak: [0, 0, 0, 0], subjects: []
  },
  year: {
    activity: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], focus: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], brk: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    quiz: [0, 0, 0, 0, 0, 0], streak: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], subjects: []
  }
};

let DATA = JSON.parse(JSON.stringify(DEFAULT_DATA));
let currentPeriod = 'week';
let charts = {};
let sidebarCollapsed = false;
let currentUser = null;

window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = '../login/index.html'; return; }
  currentUser = user;

  document.getElementById('udisplay').textContent = user.fullName || user.username;
  document.getElementById('urole').textContent = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (user.fullName || user.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('ua').textContent = ini;

  buildCharts();
  initBg();

  // Tooltip untuk collapsed sidebar
  document.querySelectorAll('.sb-item, .sb-logout').forEach(el => {
    const lbl = el.querySelector('.sb-label');
    if (lbl) el.setAttribute('data-tip', lbl.textContent.trim());
  });

  fetchAllDashboardData(user.username, currentPeriod);
  fetchSubjects(user.username);
});

async function fetchAllDashboardData(username, period) {
  await Promise.all([
    fetchStats(username, period),
    fetchActivities(username),
    fetchSummary(username)
  ]);
}

async function fetchStats(username, period) {
  period = period || currentPeriod;
  try {
    const res = await fetch(`${API}/dashboard/stats?username=${encodeURIComponent(username)}&period=${period}`);
    const d = await res.json();
    if (!d.success) return;

    updateStatCard(0, d.totalFocusHours || 0);
    updateStatCard(1, d.totalNotes || 0);
    updateStatCard(2, d.quizScoreAvg || 0);
    updateStatCard(3, d.totalSesiPomodoro || 0);

    const streakEl = document.getElementById('goal-streak');
    if (streakEl) streakEl.textContent = d.currentStreak || 0;

    if (d.weeklyProgress) {
      const wp = d.weeklyProgress;
      updateGoalBar('goal-focus-fill', 'goal-focus-pct', wp.focusHours, wp.focusGoal);
      updateGoalBar('goal-quiz-fill', 'goal-quiz-pct', wp.quizzes, wp.quizGoal);
      updateGoalBar('goal-note-fill', 'goal-note-pct', wp.notes, wp.notesGoal);
    }

    const periodLen = period === 'month' ? 4 : period === 'year' ? 12 : 7;

    if (d.weeklyFocus && d.weeklyFocus.length === periodLen) {
      DATA[period].activity.focus = d.weeklyFocus;
    }
    if (d.weeklyBreak && d.weeklyBreak.length === periodLen) {
      DATA[period].activity.brk = d.weeklyBreak;
    }
    if (d.weeklyStreak && d.weeklyStreak.length === periodLen) {
      DATA[period].streak = d.weeklyStreak;
    }
    if (d.quizScores && d.quizScores.length > 0) {
      DATA[period].quiz = d.quizScores;
    }
    if (d.subjects && d.subjects.length > 0) {
      DATA.week.subjects = d.subjects;
      DATA.month.subjects = d.subjects;
      DATA.year.subjects = d.subjects;
    }

    updateCharts();
  } catch (e) {
    console.log('[Dashboard] Stats API not available, using defaults');
  }
}

function updateGoalBar(fillId, pctId, actual, goal) {
  const fillEl = document.getElementById(fillId);
  const pctEl = document.getElementById(pctId);
  if (!fillEl || !pctEl) return;
  const pct = goal > 0 ? Math.min(Math.round(actual / goal * 100), 100) : 0;
  fillEl.style.width = pct + '%';
  pctEl.textContent = pct + '%';
}

async function fetchActivities(username) {
  try {
    const res = await fetch(`${API}/dashboard/activities?username=${encodeURIComponent(username)}&limit=6`);
    const d = await res.json();
    if (!d.success) return;
    renderActivities(d.activities);
  } catch (e) {
    console.log('[Dashboard] Activities API not available');
  }
}

async function fetchSummary(username) {
  try {
    const res = await fetch(`${API}/dashboard/summary?username=${encodeURIComponent(username)}`);
    const d = await res.json();
    if (!d.success) return;
    renderSummary(d.summary);
  } catch (e) {
    console.log('[Dashboard] Summary API not available');
  }
}

function updateStatCard(index, value) {
  const cards = document.querySelectorAll('.scard-num');
  if (cards[index]) {
    cards[index].setAttribute('data-t', Math.round(value));
    animateSingleCounter(cards[index]);
  }
}

function animateSingleCounter(el) {
  const t = parseInt(el.dataset.t || 0);
  let c = 0;
  const iv = setInterval(() => {
    c = Math.min(c + Math.max(t / 40, 1), t);
    el.textContent = Math.floor(c);
    if (c >= t) clearInterval(iv);
  }, 18);
}

function renderActivities(activities) {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  if (!activities || activities.length === 0) {
    feed.innerHTML = '<div class="empty-state">No recent activity yet</div>';
    return;
  }

  const colorMap = { pomodoro: 'c', notes: 'r', quiz: 'a', tutor: 'v' };

  const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  feed.innerHTML = activities.map(a => `
    <div class="act-row">
      <div class="act-dot ${colorMap[a.tipe] || 'c'}"></div>
      <div class="act-info">
        <p class="act-txt">${escapeHtml(a.deskripsi)}</p> <!-- Ganti disini -->
        <p class="act-time">${a.waktu}</p>
      </div>
    </div>
  `).join('');
}

async function fetchSubjects(username) {
  try {
    const res = await fetch(`${API}/subjects?username=${encodeURIComponent(username)}`);
    const d = await res.json();
    if (!d.success) return;
    renderSubjects(d.subjects);
  } catch (e) {
    console.log('[Dashboard] Subjects API not available');
  }
}

function renderSubjects(subjects) {
  const container = document.getElementById('subj-list');
  if (!container) return;

  if (!subjects || subjects.length === 0) {
    container.innerHTML = '<div class="empty-state">No subjects. Add one above.</div>';
    return;
  }

  const escapeHtml = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  container.innerHTML = subjects.map(s => `
    <div class="subj-item">
      <span class="subj-swatch" style="background:${escapeHtml(s.color)}"></span>
      <span class="subj-name">${escapeHtml(s.name)}</span>
      <button class="subj-del" onclick="deleteSubject(${s.id},'${escapeHtml(s.name)}')" title="Delete ${escapeHtml(s.name)}">&times;</button>
    </div>
  `).join('');
}

async function addSubject() {
  const input = document.getElementById('subj-input');
  const colorPicker = document.getElementById('subj-color');
  const name = input.value.trim();
  if (!name) return;
  const color = colorPicker.value;

  try {
    const res = await fetch(`${API}/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, name, color })
    });
    const d = await res.json();
    if (d.success) {
      input.value = '';
      fetchSubjects(currentUser.username);
      fetchStats(currentUser.username);
    }
  } catch (e) {
    console.error('[Dashboard] Failed to add subject');
  }
}

async function deleteSubject(id, name) {
  if (!confirm(`Delete subject "${name}"?`)) return;

  try {
    const res = await fetch(`${API}/subjects`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, id })
    });
    const d = await res.json();
    if (d.success) {
      fetchSubjects(currentUser.username);
      fetchStats(currentUser.username);
    }
  } catch (e) {
    console.error('[Dashboard] Failed to delete subject');
  }
}

function renderSummary(summary) {
  const items = [
    { id: 'sum-focus', value: (summary.totalFokusHariIni || 0).toFixed(1) + 'h' },
    { id: 'sum-sessions', value: summary.totalSesiHariIni || 0 },
    { id: 'sum-notes', value: summary.totalNotesHariIni || 0 },
    { id: 'sum-quiz', value: summary.totalQuizHariIni || 0 }
  ];

  items.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.textContent = item.value;
  });
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}

function setPeriod(p, btn) {
  currentPeriod = p;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (currentUser) {
    fetchStats(currentUser.username, currentPeriod);
  } else {
    updateCharts();
  }
}

function animateCounters() {
  document.querySelectorAll('.scard-num').forEach(el => animateSingleCounter(el));
}

const BASE = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 100,
  plugins: {
    legend: { display: false }, tooltip: {
      backgroundColor: 'rgba(6,13,18,0.92)',
      borderColor: 'rgba(6,182,212,0.3)', borderWidth: 1,
      titleColor: '#e2f8fc', bodyColor: '#94c9d4',
      padding: 10, cornerRadius: 8
    }
  },
};

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    Object.values(charts).forEach(c => { if (c) c.resize(); });
  }, 150);
});
const gridCfg = { color: 'rgba(6,182,212,0.07)', drawBorder: false };

function buildCharts() {
  const d = DATA.week;

  charts.activity = new Chart(document.getElementById('chartActivity'), {
    type: 'bar',
    data: {
      labels: d.activity.labels, datasets: [
        { label: 'Focus', data: d.activity.focus, backgroundColor: 'rgba(6,182,212,0.5)', borderColor: '#06b6d4', borderWidth: 1, borderRadius: 5, borderSkipped: false },
        { label: 'Break', data: d.activity.brk, backgroundColor: 'rgba(244,63,94,0.35)', borderColor: '#f43f5e', borderWidth: 1, borderRadius: 5, borderSkipped: false }
      ]
    },
    options: {
      ...BASE, scales: {
        x: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { family: 'JetBrains Mono', size: 11 } } },
        y: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { family: 'JetBrains Mono', size: 11 } } }
      }
    }
  });

  charts.doughnut = new Chart(document.getElementById('chartDoughnut'), {
    type: 'doughnut',
    data: {
      labels: [], datasets: [{
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 1.5, hoverOffset: 6
      }]
    },
    options: {
      ...BASE, cutout: '68%', plugins: {
        ...BASE.plugins, legend: {
          display: true, position: 'bottom',
          labels: { color: '#94c9d4', font: { family: 'Plus Jakarta Sans', size: 11 }, padding: 12, boxWidth: 11, borderRadius: 3 }
        }
      }
    }
  });

  charts.quiz = new Chart(document.getElementById('chartQuiz'), {
    type: 'line',
    data: {
      labels: ['Quiz 1', 'Quiz 2', 'Quiz 3', 'Quiz 4', 'Quiz 5', 'Quiz 6'], datasets: [{
        data: d.quiz, borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
        borderWidth: 2, pointBackgroundColor: '#f59e0b', pointRadius: 4, pointHoverRadius: 6,
        fill: true, tension: 0.4
      }]
    },
    options: {
      ...BASE, scales: {
        x: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { size: 11 } } },
        y: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { size: 11 } }, min: 0, max: 100 }
      }
    }
  });

  charts.streak = new Chart(document.getElementById('chartStreak'), {
    type: 'bar',
    data: {
      labels: d.activity.labels, datasets: [{
        data: d.streak,
        backgroundColor: ctx => { const v = ctx.parsed.y; return v >= 6 ? 'rgba(52,211,153,0.6)' : v >= 4 ? 'rgba(6,182,212,0.5)' : 'rgba(167,139,250,0.4)'; },
        borderRadius: 4, borderSkipped: false
      }]
    },
    options: {
      ...BASE, scales: {
        x: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { size: 11 } } },
        y: { grid: gridCfg, ticks: { color: '#5a8f9e', font: { size: 11 } }, beginAtZero: true }
      }
    }
  });

  charts.radar = new Chart(document.getElementById('chartRadar'), {
    type: 'radar',
    data: {
      labels: [], datasets: [{
        label: 'Performance', data: [],
        borderColor: '#06b6d4', backgroundColor: 'rgba(6,182,212,0.1)',
        pointBackgroundColor: '#06b6d4', pointRadius: 4, borderWidth: 2
      }]
    },
    options: {
      ...BASE, scales: {
        r: {
          grid: { color: 'rgba(6,182,212,0.1)' },
          pointLabels: { color: '#94c9d4', font: { size: 11 } },
          ticks: { display: false },
          angleLines: { color: 'rgba(6,182,212,0.1)' },
          min: 0, max: 100
        }
      }
    }
  });
}

function updateCharts() {
  const d = DATA[currentPeriod];
  charts.activity.data.labels = d.activity.labels;
  charts.activity.data.datasets[0].data = d.activity.focus;
  charts.activity.data.datasets[1].data = d.activity.brk;
  charts.activity.update();

  const subs = d.subjects || [];
  charts.doughnut.data.labels = subs.map(s => s.name);
  charts.doughnut.data.datasets[0].data = subs.map(s => s.count);
  charts.doughnut.data.datasets[0].backgroundColor = subs.map(s => s.color + 'b3');
  charts.doughnut.data.datasets[0].borderColor = subs.map(s => s.color);
  charts.doughnut.update();

  charts.quiz.data.datasets[0].data = d.quiz;
  charts.quiz.update();
  charts.streak.data.labels = d.activity.labels;
  charts.streak.data.datasets[0].data = d.streak;
  charts.streak.update();

  charts.radar.data.labels = subs.map(s => s.name);
  charts.radar.data.datasets[0].data = subs.map(s => s.count);
  charts.radar.update();
}

function openMobSidebar() {
  document.getElementById('sidebar').classList.add('mob-open');
  document.getElementById('mob-overlay').classList.add('show');
}
function closeMobSidebar() {
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
}

function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  localStorage.removeItem('cleverai_user');
  window.location.href = '../login/index.html';
}

function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const cols = ['6,182,212', '244,63,94', '245,158,11', '167,139,250'];
  const pts = Array.from({ length: 35 }, () => ({
    x: Math.random() * cv.width, y: Math.random() * cv.height,
    vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18,
    r: Math.random() * 1.1 + .3, a: Math.random() * .26 + .05,
    c: cols[Math.floor(Math.random() * cols.length)]
  }));
  (function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = cv.width; if (p.x > cv.width) p.x = 0;
      if (p.y < 0) p.y = cv.height; if (p.y > cv.height) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`; ctx.fill();
    });
    pts.forEach((p, i) => {
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 85) {
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(6,182,212,${.04 * (1 - d / 85)})`; ctx.lineWidth = .4; ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  })();
}
