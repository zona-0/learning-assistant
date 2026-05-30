/*
 * ─── AI QUIZ ────────────────────────────────────────────
 *
 *   AI INTEGRATION HOOK:
 *   Search for "TODO-AI" markers below. Replace the mock
 *   question generator with your own AI API call.
 *
 *   The function generateQuestions(topic, count) should
 *   return an array of question objects:
 *
 *     [{
 *       question: "What is ...?",
 *       options:  ["A", "B", "C", "D"],
 *       answer:   0   // index of correct option
 *     }, ...]
 *
 *   Example using OpenAI:
 *     const res = await fetch('https://api.openai.com/v1/chat/...', {
 *       method: 'POST',
 *       headers: { 'Authorization': 'Bearer YOUR_KEY', 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ model: 'gpt-4', messages: [
 *         { role: 'system', content: 'Generate quiz questions as JSON array...' },
 *         { role: 'user', content: `Topic: ${topic}, Count: ${count}` }
 *       ]})
 *     });
 *     return (await res.json()).questions;
 * ─────────────────────────────────────────────────────────
 */

let sidebarCollapsed = false;
let questions = [];
let currentQ = 0;
let score = 0;
let answered = false;
let totalQuestions = 5;

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
});

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

/* ─── COUNT ADJUST ─────────────────────────────────────── */

function adjustCount(delta) {
  totalQuestions = Math.max(1, Math.min(20, totalQuestions + delta));
  document.getElementById('qCount').textContent = totalQuestions;
}

/* ─── START QUIZ ───────────────────────────────────────── */

function startQuiz() {
  const topic = document.getElementById('topicInput').value.trim();
  if (!topic) {
    document.getElementById('topicInput').focus();
    document.getElementById('topicInput').style.borderColor = '#f43f5e';
    setTimeout(() => { document.getElementById('topicInput').style.borderColor = ''; }, 1500);
    return;
  }

  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('quizScreen').style.display = 'flex';

  currentQ = 0;
  score = 0;
  answered = false;

  document.getElementById('qpTopic').textContent = topic;
  document.getElementById('qpScore').textContent = '0 / ' + totalQuestions;
  document.getElementById('qpFill').style.width = '0%';

  /* ───── TODO-AI: Replace with real AI call ──────────── */
  generateMockQuestions(topic, totalQuestions);
  /* ───────────────────────────────────────────────────── */
}

/* ─── TODO-AI: Mock question generator ───────────────────
 *  Replace this function with your AI API call that
 *  returns questions based on the topic and count.
 * ──────────────────────────────────────────────────────── */

const MOCK_QUESTIONS = [
  {
    question: "What is the primary function of the mitochondria in a cell?",
    options: ["Protein synthesis", "Energy production", "Waste elimination", "Cell division"],
    answer: 1
  },
  {
    question: "Which of the following is a renewable energy source?",
    options: ["Coal", "Natural gas", "Solar power", "Nuclear fission"],
    answer: 2
  },
  {
    question: "What does HTML stand for?",
    options: ["Hyper Text Markup Language", "High Tech Modern Language", "Home Tool Markup Language", "Hyper Transfer Markup Language"],
    answer: 0
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Saturn", "Jupiter", "Mars"],
    answer: 3
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    answer: 2
  },
  {
    question: "Which gas do plants absorb from the atmosphere during photosynthesis?",
    options: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"],
    answer: 2
  },
  {
    question: "What is the largest ocean on Earth?",
    options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
    answer: 3
  },
  {
    question: "Who developed the theory of general relativity?",
    options: ["Isaac Newton", "Albert Einstein", "Nikola Tesla", "Galileo Galilei"],
    answer: 1
  },
  {
    question: "What is the boiling point of water at sea level?",
    options: ["90°C", "100°C", "110°C", "120°C"],
    answer: 1
  },
  {
    question: "Which programming language is primarily used for web development?",
    options: ["Python", "C++", "JavaScript", "Swift"],
    answer: 2
  }
];

function generateMockQuestions(topic, count) {
  /* Simulate AI delay */
  const delay = 600 + Math.random() * 600;
  setTimeout(() => {
    questions = MOCK_QUESTIONS.slice(0, Math.min(count, MOCK_QUESTIONS.length));
    if (questions.length < count) {
      for (let i = questions.length; i < count; i++) {
        questions.push({
          question: `Sample question #${i + 1} about ${topic}?`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answer: Math.floor(Math.random() * 4)
        });
      }
    }
    renderQuestion();
  }, delay);
}

/* ─── RENDER QUESTION ──────────────────────────────────── */

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

/* ─── RESULTS ──────────────────────────────────────────── */

function showResults() {
  document.getElementById('quizScreen').style.display = 'none';
  document.getElementById('resultScreen').style.display = 'flex';

  const pct = Math.round((score / questions.length) * 100);

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
}

function backToSetup() {
  document.getElementById('resultScreen').style.display = 'none';
  document.getElementById('quizSetup').style.display = 'flex';
  document.getElementById('topicInput').value = '';
}

/* ─── BG CANVAS ─────────────────────────────────────────── */

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
