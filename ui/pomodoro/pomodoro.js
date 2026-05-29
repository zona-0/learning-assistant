const CIRCUMFERENCE = 2 * Math.PI * 118;

/* ── Settings config ── */
const cfg = { focus: 25, short: 5, long: 15, sessions: 4 };
const cfgMin = { focus: 5, short: 1, long: 5, sessions: 2 };
const cfgMax = { focus: 90, short: 30, long: 60, sessions: 8 };

/* ── Timer state ── */
let mode = "focus";
let isRunning = false;
let interval = null;
let timeLeft = cfg.focus * 60;
let totalTime = cfg.focus * 60;
let completedSessions = 0;
let focusMinutes = 0;
let breaksCount = 0;
let bestStreak = 0;
let currentStreak = 0;
let toastTimer = null;

const API_BASE_URL = "http://localhost:8080/api/pomodoro";

/* ── Event Listener Saat Halaman Dimuat ── */
document.addEventListener("DOMContentLoaded", () => {
  initBackgroundCanvas();
  loadSettingsAndHistoryFromDB();
  updateDisplay();
  renderSessionDots();

  const btnSet = document.getElementById("btn-apply-settings");
  if (btnSet) {
    btnSet.addEventListener("click", applyAndSaveSettings);
  }
});

/* ── 1. FUNGSI AJAX FETCH SINKRONISASI BACKEND ── */
async function loadSettingsAndHistoryFromDB() {
  try {
    const response = await fetch(API_BASE_URL);
    if (!response.ok) throw new Error("Gagal mengambil data dari server");

    const data = await response.json();

    cfg.focus = data.settings.focusDuration;
    cfg.short = data.settings.shortBreak;
    cfg.long = data.settings.longBreak;

    document.getElementById("set-focus").innerText = cfg.focus;
    document.getElementById("set-short").innerText = cfg.short;
    document.getElementById("set-long").innerText = cfg.long;
    document.getElementById("tog-autobreak").checked =
      data.settings.autoStartBreaks;
    document.getElementById("tog-sound").checked = data.settings.soundNotif;

    renderHistoryLogList(data.historyLog);

    if (!isRunning && mode === "focus") {
      timeLeft = cfg.focus * 60;
      totalTime = cfg.focus * 60;
      updateDisplay();
    }
  } catch (error) {
    console.error("Error sinkronisasi DB:", error);
    showToast(
      "Gagal memuat preferensi dari server. Menggunakan mode lokal.",
      "focus-end",
    );
  }
}

async function saveSettingsToDB() {
  const isAutoBreak = document.getElementById("tog-autobreak").checked;
  const isSound = document.getElementById("tog-sound").checked;

  const formData = new URLSearchParams();
  formData.append("focusDuration", cfg.focus);
  formData.append("shortBreak", cfg.short);
  formData.append("longBreak", cfg.long);
  if (isAutoBreak) formData.append("autoStartBreaks", "on");
  if (isSound) formData.append("soundNotif", "on");

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (response.ok) {
      showToast("Pengaturan berhasil disimpan ke cloud!", "focus-end");
    }
  } catch (error) {
    console.error("Gagal mengirim data setting:", error);
  }
}

async function sendSessionLogToDB(modeSesi, durasi) {
  const formData = new URLSearchParams();
  formData.append("action", "save_history");
  formData.append("modePomo", modeSesi);
  formData.append("durasiMenit", durasi);

  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    if (response.ok) {
      loadSettingsAndHistoryFromDB();
    }
  } catch (error) {
    console.error("Gagal mengirim log sesi:", error);
  }
}

function renderHistoryLogList(listHistory) {
  const logListContainer = document.getElementById("log-list");
  if (!listHistory || listHistory.length === 0) {
    logListContainer.innerHTML = `<p class="log-empty">Belum ada sesi hari ini — mari mulai!</p>`;
    return;
  }

  logListContainer.innerHTML = "";
  listHistory.forEach((item) => {
    let modeLabel =
      item.modePomo === "focus"
        ? "Focus Session"
        : item.modePomo === "short_break"
          ? "Short Break"
          : "Long Break";
    let dotClass =
      item.modePomo === "focus"
        ? "focus"
        : item.modePomo === "short_break"
          ? "short"
          : "long";

    const dateObj = new Date(item.waktuMulai);
    const timeString = dateObj.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const logItemHtml = `
      <div class="log-item">
        <div class="log-dot ${dotClass}"></div>
        <div class="log-txt">${modeLabel} (${item.durasiMenit} m)</div>
        <div class="log-time">${timeString}</div>
      </div>
    `;
    logListContainer.innerHTML += logItemHtml;
  });
}

/* ── 2. LOGIKA UTAMA ENGINE POMODORO ── */
function updateDisplay() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const strMins = String(mins).padStart(2, "0");
  const strSecs = String(secs).padStart(2, "0");

  document.getElementById("timer-display").innerText = `${strMins}:${strSecs}`;

  const progressCircle = document.getElementById("ring-progress");
  const glowCircle = document.getElementById("ring-glow");
  const offset = CIRCUMFERENCE - (timeLeft / totalTime) * CIRCUMFERENCE;

  if (progressCircle && glowCircle) {
    progressCircle.style.strokeDashoffset = offset;
    glowCircle.style.strokeDashoffset = offset;
  }

  document.title = `${strMins}:${strSecs} | CleverAI`;
}

function toggleTimer() {
  if (isRunning) pauseEngine();
  else startEngine();
}

function startEngine() {
  isRunning = true;
  const mainBtn = document.getElementById("main-btn");
  if (mainBtn) mainBtn.classList.add("running");
  document.getElementById("play-ico").style.display = "none";
  document.getElementById("pause-ico").style.display = "block";

  interval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      clearInterval(interval);
      handleSessionCompleted();
    }
  }, 1000);
}

function pauseEngine() {
  isRunning = false;
  const mainBtn = document.getElementById("main-btn");
  if (mainBtn) mainBtn.classList.remove("running");
  document.getElementById("play-ico").style.display = "block";
  document.getElementById("pause-ico").style.display = "none";
  clearInterval(interval);
}

function resetTimer() {
  pauseEngine();
  if (mode === "focus") timeLeft = cfg.focus * 60;
  else if (mode === "short") timeLeft = cfg.short * 60;
  else if (mode === "long") timeLeft = cfg.long * 60;

  totalTime = timeLeft;
  updateDisplay();
}

function handleSessionCompleted() {
  pauseEngine();
  playNotificationSound();

  let durasiSesiTerlewati = Math.floor(totalTime / 60);
  let modeSesiSelesai = mode;

  sendSessionLogToDB(modeSesiSelesai, durasiSesiTerlewati);

  if (mode === "focus") {
    completedSessions++;
    focusMinutes += durasiSesiTerlewati;
    currentStreak++;
    if (currentStreak > bestStreak) bestStreak = currentStreak;

    showToast(
      "Kerja bagus! Sesi fokus selesai. Waktunya istirahat.",
      "focus-end",
    );

    if (completedSessions % cfg.sessions === 0) setModeAutomatic("long");
    else setModeAutomatic("short");
  } else {
    breaksCount++;
    showToast("Waktu istirahat selesai! Siap fokus kembali?", "break-end");
    setModeAutomatic("focus");
  }

  updateStatsDashboardElements();
  renderSessionDots();

  if (document.getElementById("tog-autobreak").checked) {
    setTimeout(() => startEngine(), 1200);
  }
}

function setMode(newMode, btnElement) {
  pauseEngine();
  mode = newMode;

  document
    .querySelectorAll(".mode-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btnElement) btnElement.add("active");

  const label = document.getElementById("mode-label");
  const mainBtn = document.getElementById("main-btn");

  if (mainBtn) mainBtn.className = "ctrl-btn ctrl-main";

  if (mode === "focus") {
    timeLeft = cfg.focus * 60;
    if (label) {
      label.innerText = "FOCUS";
      label.style.color = "#67e8f9";
    }
  } else if (mode === "short") {
    timeLeft = cfg.short * 60;
    if (label) {
      label.innerText = "SHORT BREAK";
      label.style.color = "#6ee7b7";
    }
    if (mainBtn) mainBtn.classList.add("short-mode");
  } else if (mode === "long") {
    timeLeft = cfg.long * 60;
    if (label) {
      label.innerText = "LONG BREAK";
      label.style.color = "#c4b5fd";
    }
    if (mainBtn) mainBtn.classList.add("long-mode");
  }

  totalTime = timeLeft;
  updateDisplay();
}

function setModeAutomatic(newMode) {
  const btnClass =
    newMode === "focus"
      ? ".mode-btn.focus"
      : newMode === "short"
        ? ".mode-btn.short"
        : ".mode-btn.long";
  const targetBtn = document.querySelector(btnClass);
  setMode(newMode, targetBtn);
}

function skipSession() {
  pauseEngine();
  if (mode === "focus") {
    currentStreak = 0;
    if (completedSessions % cfg.sessions === 0) setModeAutomatic("long");
    else setModeAutomatic("short");
  } else {
    setModeAutomatic("focus");
  }
  updateStatsDashboardElements();
}

/* ── 3. PREFERENSI UI KONTROL (HANYA MENGUBAH TEKS LOKAL) ── */
function adjustSetting(type, amount) {
  if (type === "focus") {
    cfg.focus = Math.max(
      cfgMin.focus,
      Math.min(cfgMax.focus, cfg.focus + amount),
    );
    document.getElementById("set-focus").innerText = cfg.focus;
  } else if (type === "short") {
    cfg.short = Math.max(
      cfgMin.short,
      Math.min(cfgMax.short, cfg.short + amount),
    );
    document.getElementById("set-short").innerText = cfg.short;
  } else if (type === "long") {
    cfg.long = Math.max(cfgMin.long, Math.min(cfgMax.long, cfg.long + amount));
    document.getElementById("set-long").innerText = cfg.long;
  } else if (type === "sessions") {
    cfg.sessions = Math.max(
      cfgMin.sessions,
      Math.min(cfgMax.sessions, cfg.sessions + amount),
    );
    document.getElementById("set-sessions").innerText = cfg.sessions;
  }
}

function applyAndSaveSettings() {
  saveSettingsToDB();

  if (!isRunning) {
    if (mode === "focus") timeLeft = cfg.focus * 60;
    else if (mode === "short") timeLeft = cfg.short * 60;
    else if (mode === "long") timeLeft = cfg.long * 60;

    totalTime = timeLeft;
    updateDisplay();
  }

  renderSessionDots();
  updateStatsDashboardElements();
  showToast("Sesi aktif berhasil diperbarui!", "focus-end");
}

/* ── 4. UTILITY VIEW UI HELPER ── */
function updateStatsDashboardElements() {
  document.getElementById("stat-sessions").innerText = completedSessions;
  document.getElementById("stat-focus").innerText = `${focusMinutes}m`;
  document.getElementById("stat-breaks").innerText = breaksCount;
  document.getElementById("stat-streak").innerText = bestStreak;

  const currentSessionIndex = (completedSessions % cfg.sessions) + 1;
  document.getElementById("session-badge").innerText =
    `Session ${currentSessionIndex} of ${cfg.sessions}`;
}

function renderSessionDots() {
  const dotsContainer = document.getElementById("session-dots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";
  const currentSessionIndex = completedSessions % cfg.sessions;

  for (let i = 0; i < cfg.sessions; i++) {
    const dot = document.createElement("div");
    dot.className = "s-dot";
    if (i < currentSessionIndex) dot.classList.add("done");
    else if (i === currentSessionIndex && isRunning && mode === "focus")
      dot.classList.add("current");
    dotsContainer.appendChild(dot);
  }
}

function playNotificationSound() {
  if (!document.getElementById("tog-sound").checked) return;
  try {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(587.33, context.currentTime);
    oscillator.frequency.setValueAtTime(880, context.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.2, context.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch (e) {
    console.log("Audio API blocked by safety policy.");
  }
}

function showToast(msg, typeClass) {
  clearTimeout(toastTimer);
  const t = document.getElementById("toast");
  if (!t) return;
  document.getElementById("toast-msg").innerText = msg;
  t.className = `toast show ${typeClass}`;

  toastTimer = setTimeout(() => {
    t.classList.remove("show");
  }, 4000);
}

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("collapsed");
}
function openMob() {
  document.getElementById("sidebar").classList.add("mob-open");
  document.getElementById("mob-overlay").classList.add("show");
}
function closeMob() {
  document.getElementById("sidebar").classList.remove("mob-open");
  document.getElementById("mob-overlay").classList.remove("show");
}

function initBackgroundCanvas() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let pts = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  for (let i = 0; i < 35; i++) {
    pts.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
    });
  }

  function anim() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
    });
    requestAnimationFrame(anim);
  }
  anim();
}

function doLogout() {
  window.location.href = "../auth/login.html";
}
