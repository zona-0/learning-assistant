const API = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : window.location.origin + '/api';

let sidebarCollapsed = false;
let questions = [];
let currentQ = 0;
let score = 0;
let answered = false;
let totalQuestions = 5;
let selectedFile = null;
let userAnswers = [];
let currentTopic = '';
let currentSubject = '';
let historyOpen = false;
let attempts = [];

window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = '../login/index.html'; return; }

  document.getElementById('udisplay').textContent = user.fullName || user.username;
  document.getElementById('urole').textContent = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (user.fullName || user.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('ua').textContent = ini;

  initBg();

  document.querySelectorAll('.sb-item, .sb-logout').forEach(el => {
    const lbl = el.querySelector('.sb-label');
    if (lbl) el.setAttribute('data-tip', lbl.textContent.trim());
  });

  setupFileDrag();
  setupHistoryBtn();
  loadSubjects();
});

async function loadSubjects() {
  try {
    const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
    if (!user) return;
    const res = await fetch(`${API}/subjects?username=${encodeURIComponent(user.username)}`);
    const d = await res.json();
    if (!d.success || !d.subjects) return;
    const sel = document.getElementById('subjectSelect');
    d.subjects.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  } catch (e) {
    console.log('[Quiz] Subjects API not available');
  }
}

function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
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
  window.location.href = '../login/index.html';
}

/* -- COUNT ADJUST -- */
function adjustCount(delta) {
  totalQuestions = Math.max(1, Math.min(20, totalQuestions + delta));
  document.getElementById('qCount').textContent = totalQuestions;
}

/* -- FILE UPLOAD -- */
function setupFileDrag() {
  const zone = document.getElementById('fileZone');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); const file = e.dataTransfer.files[0]; if (file) handleFile(file); });
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) handleFile(file);
}

function handleFile(file) {
  const allowed = ['.txt', '.md', '.csv'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    alert('Only .txt, .md, and .csv files are supported.');
    document.getElementById('fileInput').value = '';
    return;
  }
  if (file.size > 1048576) {
    alert('File is too large. Maximum size is 1 MB.');
    document.getElementById('fileInput').value = '';
    return;
  }
  selectedFile = file;
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('fileInfo').style.display = 'flex';
  document.getElementById('filePlaceholder').style.display = 'none';
  document.getElementById('fileZone').classList.add('has-file');
}

function removeFile() {
  selectedFile = null;
  document.getElementById('fileInput').value = '';
  document.getElementById('fileInfo').style.display = 'none';
  document.getElementById('filePlaceholder').style.display = 'flex';
  document.getElementById('fileZone').classList.remove('has-file');
}

/* -- START QUIZ -- */
async function startQuiz() {
  const topic = document.getElementById('topicInput').value.trim();
  if (!topic) {
    document.getElementById('topicInput').focus();
    document.getElementById('topicInput').style.borderColor = '#f43f5e';
    setTimeout(() => { document.getElementById('topicInput').style.borderColor = ''; }, 1500);
    return;
  }

  currentTopic = topic;
  currentSubject = document.getElementById('subjectSelect').value;
  closeHistoryPanel();

  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('reviewScreen').style.display = 'none';
  document.getElementById('quizScreen').style.display = 'flex';

  currentQ = 0;
  score = 0;
  answered = false;
  userAnswers = [];

  const label = currentSubject || 'Classifying...';
  document.getElementById('qpTopic').textContent = label + ' · ' + topic;
  document.getElementById('qpScore').textContent = '0 / ' + totalQuestions;
  document.getElementById('qpFill').style.width = '0%';

  let fileContent = null;
  if (selectedFile) {
    fileContent = await readFileContent(selectedFile);
  }
  generateQuestions(topic, currentSubject, totalQuestions, fileContent);
}

function readFileContent(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}

async function generateQuestions(topic, subject, count, fileContent) {
  userAnswers = [];
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  try {
    const body = { topic, count };
    if (subject) body.subject = subject;
    if (fileContent) body.fileContent = fileContent;
    if (user) body.username = user.username;
    const res = await fetch(`${API}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    // Handle rate limit
    if (res.status === 429) {
      const rl = await res.json();
      document.getElementById('quizScreen').style.display = 'none';
      document.getElementById('quizSetup').style.display = 'flex';
      showQuizRateLimit(rl.message || 'Quiz usage limit reached. Please try again tomorrow.');
      return;
    }
    
    const data = await res.json();
    questions = data.questions || [];
    if (data.subject) currentSubject = data.subject;
    if (data.topic) currentTopic = data.topic;
    const label = currentSubject || topic;
    document.getElementById('qpTopic').textContent = label + ' · ' + currentTopic;
    if (!questions.length) throw new Error('No questions returned');
  } catch (e) {
    questions = [
      {
        question: "Could not generate questions from AI. Is the backend running and AI_API_KEY set?",
        options: ["Retry", "Change topic", "Check backend", "All of the above"],
        answer: 3
      }
    ];
  }
  renderQuestion();
}

/* -- RENDER QUESTION -- */
function renderQuestion() {
  if (currentQ >= questions.length) {
    showResults();
    return;
  }

  answered = false;
  const q = questions[currentQ];

  document.getElementById('qNum').textContent = 'Question ' + (currentQ + 1);
  document.getElementById('qText').textContent = q.question;
  document.getElementById('qpFill').style.width = ((currentQ) / questions.length * 100) + '%';
  document.getElementById('qpScore').textContent = score + ' / ' + questions.length;

  const container = document.getElementById('qOptions');
  container.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, i) => {
    const div = document.createElement('div');
    div.className = 'q-opt';
    div.innerHTML = `<span class="q-opt-letter">${letters[i]}</span><span>${opt}</span>`;
    div.addEventListener('click', () => selectOption(i));
    container.appendChild(div);
  });

  const nextBtn = document.createElement('button');
  nextBtn.className = 'q-next-btn';
  nextBtn.id = 'qNextBtn';
  nextBtn.textContent = currentQ === questions.length - 1 ? 'Finish' : 'Next';
  nextBtn.disabled = true;
  nextBtn.addEventListener('click', () => {
    currentQ++;
    renderQuestion();
  });
  container.appendChild(nextBtn);
}

function selectOption(index) {
  if (answered) return;
  answered = true;
  userAnswers[currentQ] = index;

  const opts = document.querySelectorAll('.q-opt');
  const q = questions[currentQ];

  opts.forEach((el, i) => {
    el.classList.add('disabled');
    if (i === q.answer) el.classList.add('correct');
    if (i === index && index !== q.answer) el.classList.add('wrong');
    if (i === index) el.classList.add('selected');
  });

  if (index === q.answer) score++;

  document.getElementById('qNextBtn').disabled = false;
  document.getElementById('qpScore').textContent = score + ' / ' + questions.length;
}

/* -- SAVE RESULT -- */
async function saveQuizResult() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  const qd = questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    answer: q.answer,
    userAnswer: userAnswers[i] !== undefined ? userAnswers[i] : -1
  }));
  try {
    await fetch(`${API}/quiz/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        subject: currentSubject,
        topic: currentTopic,
        score,
        totalQuestions: questions.length,
        questionsData: JSON.stringify(qd)
      })
    });
  } catch (e) {
    console.error('Failed to save quiz result:', e);
  }
}

/* -- HISTORY -- */
function setupHistoryBtn() {
  const btn = document.getElementById('historyToggle');
  if (btn) btn.addEventListener('click', toggleHistoryPanel);
}

function toggleHistoryPanel() {
  historyOpen = !historyOpen;
  document.getElementById('historyPanel').classList.toggle('closed', !historyOpen);
  if (historyOpen) loadHistory();
}

function closeHistoryPanel() {
  historyOpen = false;
  const hp = document.getElementById('historyPanel');
  if (hp) hp.classList.add('closed');
}

async function loadHistory() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  try {
    const res = await fetch(`${API}/quiz/history?username=${encodeURIComponent(user.username)}`);
    const data = await res.json();
    attempts = data.history || [];
  } catch (e) {
    attempts = [];
  }
  renderHistoryList();
}

function renderHistoryList() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('qhEmpty');
  list.innerHTML = '';
  if (attempts.length === 0) {
    list.appendChild(empty);
    return;
  }
  attempts.forEach(a => {
    const div = document.createElement('div');
    div.className = 'qh-item';
    const pct = a.totalQuestions > 0 ? Math.round((a.score / a.totalQuestions) * 100) : 0;
    div.innerHTML = `
      <div class="qh-item-top">
        <span class="qh-item-subject">${escapeHtml(a.subject)}</span>
        <span class="qh-item-score">${a.score}/${a.totalQuestions}</span>
      </div>
      ${a.topic ? `<div class="qh-item-topic">${escapeHtml(a.topic)}</div>` : ''}
      <div class="qh-item-bottom">
        <span class="qh-item-pct ${pct >= 70 ? 'good' : pct >= 50 ? 'mid' : 'low'}">${pct}%</span>
        <span class="qh-item-date">${formatDate(a.date)}</span>
      </div>`;
    div.addEventListener('click', () => showAttemptDetail(a.id));
    list.appendChild(div);
  });
}

async function showAttemptDetail(attemptId) {
  closeHistoryPanel();
  try {
    const res = await fetch(`${API}/quiz/history?id=${attemptId}`);
    const data = await res.json();
    if (!data.questionsData) return;
    const qd = typeof data.questionsData === 'string' ? JSON.parse(data.questionsData) : data.questionsData;
    renderReview(data.subject, data.topic, data.score, data.totalQuestions, qd);
  } catch (e) {
    console.error('Failed to load attempt:', e);
  }
}

function renderReview(subject, topic, score, total, qd) {
  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('reviewScreen').style.display = 'flex';

  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  document.getElementById('rvTitle').textContent = subject + (topic ? ' · ' + topic : '');
  document.getElementById('rvScore').textContent = score + ' / ' + total + ' (' + pct + '%)';

  const container = document.getElementById('rvQuestions');
  container.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];

  qd.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'rv-q';
    const ua = q.userAnswer;
    const ca = q.answer;
    div.innerHTML = `<div class="rv-q-num">Question ${i + 1}</div>
      <div class="rv-q-text">${escapeHtml(q.question)}</div>
      <div class="rv-q-opts">` +
      q.options.map((opt, j) => {
        let cls = 'rv-opt';
        if (j === ca) cls += ' correct';
        if (ua !== -1 && j === ua && ua !== ca) cls += ' wrong';
        if (ua !== -1 && j === ua) cls += ' selected';
        return `<div class="${cls}"><span class="rv-opt-letter">${letters[j]}</span><span>${escapeHtml(opt)}</span></div>`;
      }).join('') +
      `</div>`;
    container.appendChild(div);
  });
}

function backToQuiz() {
  document.getElementById('reviewScreen').style.display = 'none';
  document.getElementById('quizSetup').style.display = 'flex';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* -- RESULTS -- */
async function showResults() {
  document.getElementById('quizScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';

  const total = questions.length || 1;
  const pct = Math.round((score / total) * 100);

  document.getElementById('rsScore').textContent = score;
  document.getElementById('rsTotal').textContent = '/ ' + questions.length;
  document.getElementById('rsPct').textContent = pct + '%';

  let msg, color;
  if (pct >= 90) { msg = 'Outstanding! You really know your stuff.'; color = '#34d399'; }
  else if (pct >= 70) { msg = 'Great job! Keep up the good work.'; color = '#f59e0b'; }
  else if (pct >= 50) { msg = 'Good effort! Review the topics you missed.'; color = '#f59e0b'; }
  else { msg = 'Keep practicing! Try reviewing the material and take the quiz again.'; color = '#f43f5e'; }

  document.getElementById('rsMsg').textContent = msg;

  const icon = document.getElementById('rsIcon');
  icon.innerHTML = pct >= 70
    ? '<svg viewBox="0 0 24 24" fill="none" width="40" height="40"><circle cx="12" cy="12" r="9" stroke="#34d399" stroke-width="1.8"/><path d="M8 12L11 15L16 9" stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" width="40" height="40"><circle cx="12" cy="12" r="9" stroke="#f59e0b" stroke-width="1.8"/><path d="M12 8V13" stroke="#f59e0b" stroke-width="1.8" stroke-linecap="round"/><circle cx="12" cy="16" r="1" fill="#f59e0b"/></svg>';

  document.getElementById('rsTitle').style.color = color;

  await saveQuizResult();
}

function backToSetup() {
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('reviewScreen').style.display = 'none';
  document.getElementById('quizSetup').style.display = 'flex';
  document.getElementById('topicInput').value = '';
  removeFile();
}

/* -- HELPERS -- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* -- RATE LIMIT -- */
function showQuizRateLimit(message) {
  hideQuizRateLimit();
  const el = document.getElementById('quizRateLimit');
  if (!el) return;
  const msgEl = el.querySelector('.rl-msg');
  if (msgEl) msgEl.textContent = message;
  el.classList.add('show');
  setTimeout(() => hideQuizRateLimit(), 15000);
}

function hideQuizRateLimit() {
  const el = document.getElementById('quizRateLimit');
  if (el) el.classList.remove('show');
}

/* -- BG CANVAS -- */
function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const cols = ['245,158,11', '6,182,212', '167,139,250'];
  const pts = Array.from({ length: 30 }, () => ({
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
          ctx.strokeStyle = `rgba(245,158,11,${.04 * (1 - d / 85)})`; ctx.lineWidth = .4; ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  })();
}
