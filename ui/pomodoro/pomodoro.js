const CIRCUMFERENCE = 2 * Math.PI * 118; 

/* ── Settings config ── */
const cfg = { focus: 25, short: 5, long: 15, sessions: 4 };
const cfgMin = { focus: 5,  short: 1, long: 5,  sessions: 2 };
const cfgMax = { focus: 90, short: 30, long: 60, sessions: 8 };

/* ── Timer state ── */
let mode              = 'focus';
let isRunning         = false;
let interval          = null;
let timeLeft          = cfg.focus * 60;
let totalTime         = cfg.focus * 60;
let completedSessions = 0;
let focusMinutes      = 0;
let breaksCount       = 0;
let bestStreak        = 0;
let currentStreak     = 0;
let toastTimer        = null;
const logEntries      = [];

/* ── Mode display config ── */
const modeConfig = {
  focus: { color: '#06b6d4', label: 'FOCUS',      labelColor: '#67e8f9' },
  short: { color: '#34d399', label: 'SHORT BREAK', labelColor: '#6ee7b7' },
  long:  { color: '#a78bfa', label: 'LONG BREAK',  labelColor: '#c4b5fd' },
};

/* ════════════════════════════════════
   INIT
   ════════════════════════════════════ */
window.addEventListener('load', () => {
  /* User pill */
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (user) {
    const fn  = user.fullName || user.username;
    const ini = fn.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('ua').textContent      = ini;
    document.getElementById('ua-name').textContent = fn;
    document.getElementById('ua-role').textContent =
      (user.role === 'admin' ? 'Administrator' : 'Pelajar').toUpperCase();
  }

  loadSettings();
  buildDots();
  updateRing(1);
  renderDisplay();
  initBg();

  /* ── Wire up SET SETTINGS button ── */
  document.getElementById('btn-apply-settings').addEventListener('click', applySettings);
});

/* ════════════════════════════════════
   SETTINGS
   ════════════════════════════════════ */
function loadSettings() {
  const saved = JSON.parse(localStorage.getItem('pom_settings') || 'null');
  if (saved) Object.assign(cfg, saved);
  document.getElementById('set-focus').textContent    = cfg.focus;
  document.getElementById('set-short').textContent    = cfg.short;
  document.getElementById('set-long').textContent     = cfg.long;
  document.getElementById('set-sessions').textContent = cfg.sessions;

  /* Sync timer to loaded focus duration */
  timeLeft  = cfg.focus * 60;
  totalTime = timeLeft;
}

function adjustSetting(key, delta) {
  if (isRunning) return; /* don't adjust while running */
  cfg[key] = Math.min(Math.max(cfg[key] + delta, cfgMin[key]), cfgMax[key]);
  document.getElementById('set-' + key).textContent = cfg[key];
}

/* ── Called when SET SETTINGS button is clicked ── */
function applySettings() {
  if (isRunning) {
    showToast('⚠ Pause the timer before changing settings.', 'break-end');
    return;
  }

  /* Read whatever values are currently shown in the UI */
  cfg.focus    = parseInt(document.getElementById('set-focus').textContent,    10);
  cfg.short    = parseInt(document.getElementById('set-short').textContent,    10);
  cfg.long     = parseInt(document.getElementById('set-long').textContent,     10);
  cfg.sessions = parseInt(document.getElementById('set-sessions').textContent, 10);

  /* Persist to localStorage */
  localStorage.setItem('pom_settings', JSON.stringify(cfg));

  /* Reset the active timer to reflect the new duration */
  const durations = { focus: cfg.focus, short: cfg.short, long: cfg.long };
  timeLeft  = durations[mode] * 60;
  totalTime = timeLeft;

  renderDisplay();
  updateRing(1);
  buildDots();

  showToast('✓ Settings saved!', 'break-end');
}

/* ════════════════════════════════════
   MODE SWITCHING
   ════════════════════════════════════ */
function setMode(m, btn) {
  if (isRunning) pauseTimer();
  mode = m;

  /* Update tab buttons */
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  /* Reset timer for this mode */
  const durations = { focus: cfg.focus, short: cfg.short, long: cfg.long };
  timeLeft  = durations[m] * 60;
  totalTime = timeLeft;

  /* Update labels & colours */
  const mc = modeConfig[m];
  document.getElementById('mode-label').textContent = mc.label;
  document.getElementById('mode-label').style.color = mc.labelColor;

  /* Update play button colour */
  const mainBtn = document.getElementById('main-btn');
  mainBtn.classList.remove('running', 'short-mode', 'long-mode');
  if (m === 'short') mainBtn.classList.add('short-mode');
  if (m === 'long')  mainBtn.classList.add('long-mode');

  renderDisplay();
  updateRing(1);
  showPlayIcon();
  buildDots();
}

/* ════════════════════════════════════
   TIMER CORE
   ════════════════════════════════════ */
function toggleTimer() {
  isRunning ? pauseTimer() : startTimer();
}

function startTimer() {
  isRunning = true;
  document.getElementById('main-btn').classList.add('running');
  showPauseIcon();

  interval = setInterval(() => {
    timeLeft--;
    renderDisplay();
    updateRing(timeLeft / totalTime);

    if (timeLeft <= 0) {
      clearInterval(interval);
      isRunning = false;
      onSessionEnd(false);
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(interval);
  document.getElementById('main-btn').classList.remove('running');
  showPlayIcon();
}

function resetTimer() {
  pauseTimer();
  const durations = { focus: cfg.focus, short: cfg.short, long: cfg.long };
  timeLeft  = durations[mode] * 60;
  totalTime = timeLeft;
  renderDisplay();
  updateRing(1);
}

function skipSession() {
  pauseTimer();
  onSessionEnd(true);
}

/* ════════════════════════════════════
   SESSION END LOGIC  (Pomodoro method)
   ════════════════════════════════════ */
function onSessionEnd(skipped) {
  playSound(mode);

  if (mode === 'focus') {
    /* ── Completed a focus block ── */
    if (!skipped) {
      completedSessions++;
      focusMinutes  += cfg.focus;
      currentStreak++;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentStreak = 0; /* streak broken on skip */
    }

    addLog('focus', skipped
      ? 'Focus session skipped'
      : `Focus — ${cfg.focus} min completed`);
    updateStats();

    /* After every N sessions → long break, otherwise → short break */
    const nextBreak = (completedSessions % cfg.sessions === 0 && completedSessions > 0)
      ? 'long' : 'short';

    if (nextBreak === 'long') {
      showToast('🎉 Great work! Time for a long break.', 'focus-end');
    } else {
      showToast('✓ Focus done! Take a short break.', 'focus-end');
    }

    if (document.getElementById('tog-autobreak').checked) {
      setTimeout(() => {
        setMode(nextBreak, document.querySelector(`.mode-btn.${nextBreak}`));
        startTimer();
      }, 1500);
    } else {
      setMode(nextBreak, document.querySelector(`.mode-btn.${nextBreak}`));
    }

  } else {
    /* ── Completed a break ── */
    if (!skipped) breaksCount++;

    addLog(mode, mode === 'short'
      ? 'Short break finished'
      : 'Long break finished');
    updateStats();
    showToast('⚡ Break over! Ready to focus?', 'break-end');

    /* Update session badge for next focus block */
    const nextSession = (completedSessions % cfg.sessions) + 1;
    document.getElementById('session-badge').textContent =
      `Session ${nextSession} of ${cfg.sessions}`;

    setMode('focus', document.querySelector('.mode-btn.focus'));
  }
}

/* ════════════════════════════════════
   SVG RING
   ════════════════════════════════════ */
function updateRing(fraction) {
  const ring   = document.getElementById('ring-progress');
  const glow   = document.getElementById('ring-glow');
  const offset = CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, fraction)));
  const col    = modeConfig[mode].color;

  ring.style.strokeDashoffset = offset;
  glow.style.strokeDashoffset = offset;
  ring.style.stroke = col;
  glow.style.stroke = col;
}

/* ════════════════════════════════════
   DISPLAY
   ════════════════════════════════════ */
function renderDisplay() {
  const m = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const s = String(timeLeft % 60).padStart(2, '0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
  document.title = `${m}:${s} — CleverAI Pomodoro`;
}

/* ════════════════════════════════════
   SESSION DOTS
   ════════════════════════════════════ */
function buildDots() {
  const container = document.getElementById('session-dots');
  container.innerHTML = '';
  const inCycle = completedSessions % cfg.sessions;

  for (let i = 0; i < cfg.sessions; i++) {
    const dot = document.createElement('div');
    dot.className = 's-dot';
    if (i < inCycle)                            dot.classList.add('done');
    else if (i === inCycle && mode === 'focus') dot.classList.add('current');
    container.appendChild(dot);
  }
}

/* ════════════════════════════════════
   STATS
   ════════════════════════════════════ */
function updateStats() {
  document.getElementById('stat-sessions').textContent = completedSessions;
  document.getElementById('stat-focus').textContent    = focusMinutes + 'm';
  document.getElementById('stat-breaks').textContent   = breaksCount;
  document.getElementById('stat-streak').textContent   = bestStreak;
}

/* ════════════════════════════════════
   SESSION LOG
   ════════════════════════════════════ */
function addLog(type, text) {
  const now  = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  logEntries.unshift({ type, text, time });
  renderLog();
}

function renderLog() {
  const list = document.getElementById('log-list');
  if (logEntries.length === 0) {
    list.innerHTML = '<p class="log-empty">No sessions yet — start your first!</p>';
    return;
  }
  list.innerHTML = logEntries.slice(0, 10).map(e => `
    <div class="log-item">
      <div class="log-dot ${e.type}"></div>
      <span class="log-txt">${e.text}</span>
      <span class="log-time">${e.time}</span>
    </div>
  `).join('');
}

/* ════════════════════════════════════
   SOUND  (Web Audio API — no files needed)
   ════════════════════════════════════ */
function playSound(type) {
  if (!document.getElementById('tog-sound').checked) return;
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    /* ascending = focus done, descending = break done */
    const notes = type === 'focus'
      ? [{ f: 523, d: 0.12 }, { f: 659, d: 0.12 }, { f: 784, d: 0.22 }]
      : [{ f: 784, d: 0.12 }, { f: 659, d: 0.12 }, { f: 523, d: 0.22 }];
    let t = ctx.currentTime;
    notes.forEach(n => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = n.f;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d + 0.08);
      osc.start(t);
      osc.stop(t + n.d + 0.1);
      t += n.d;
    });
  } catch (e) { /* AudioContext blocked — silent fail */ }
}

/* ════════════════════════════════════
   TOAST NOTIFICATION
   ════════════════════════════════════ */
function showToast(msg, cls) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.className = `toast ${cls} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ════════════════════════════════════
   ICON HELPERS
   ════════════════════════════════════ */
function showPlayIcon() {
  document.getElementById('play-ico').style.display  = '';
  document.getElementById('pause-ico').style.display = 'none';
}
function showPauseIcon() {
  document.getElementById('play-ico').style.display  = 'none';
  document.getElementById('pause-ico').style.display = '';
}

/* ════════════════════════════════════
   SIDEBAR
   ════════════════════════════════════ */
let sidebarCollapsed = false;

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
}
function openMob() {
  document.getElementById('sidebar').classList.add('mob-open');
  document.getElementById('mob-overlay').classList.add('show');
}
function closeMob() {
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
}

/* ════════════════════════════════════
   LOGOUT
   ════════════════════════════════════ */
function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  localStorage.removeItem('cleverai_user');
  window.location.href = '../login/index.html';
}

/* ════════════════════════════════════
   BACKGROUND CANVAS
   ════════════════════════════════════ */
function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');

  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize();
  window.addEventListener('resize', resize);

  const cols = ['6,182,212', '244,63,94', '245,158,11', '167,139,250'];
  const pts  = Array.from({ length: 35 }, () => ({
    x:  Math.random() * innerWidth,
    y:  Math.random() * innerHeight,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
    r:  Math.random() * 1.1 + 0.3,
    a:  Math.random() * 0.26 + 0.05,
    c:  cols[Math.floor(Math.random() * cols.length)],
  }));

  (function draw() {
    ctx.clearRect(0, 0, cv.width, cv.height);

    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = cv.width;  if (p.x > cv.width)  p.x = 0;
      if (p.y < 0) p.y = cv.height; if (p.y > cv.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c},${p.a})`;
      ctx.fill();
    });

    pts.forEach((p, i) => {
      for (let j = i + 1; j < pts.length; j++) {
        const q  = pts[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 85) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(6,182,212,${0.04 * (1 - d / 85)})`;
          ctx.lineWidth   = 0.4;
          ctx.stroke();
        }
      }
    });

    requestAnimationFrame(draw);
  })();
}
