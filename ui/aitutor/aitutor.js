/*
 * ─── AI TUTOR CHAT ──────────────────────────────────────
 *
 *   AI INTEGRATION HOOK:
 *   Search for "TODO-AI" markers below. Replace the mock
 *   response with your own API call (e.g. OpenAI, Gemini).
 *
 *   Example:
 *     const res = await fetch('https://api.openai.com/v1/chat/...', {
 *       method: 'POST',
 *       headers: { 'Authorization': 'Bearer YOUR_KEY', 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ model: 'gpt-4', messages: [...history, { role: 'user', content: msg }] })
 *     });
 *     const data = await res.json();
 *     return data.choices[0].message.content;
 * ─────────────────────────────────────────────────────────
 */

let sidebarCollapsed = false;
let messageCount = 0;

window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = '../login/index.html'; return; }

  document.getElementById('udisplay').textContent = user.fullName || user.username;
  document.getElementById('urole').textContent = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (user.fullName || user.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('ua').textContent = ini;

  initBg();
  setupChatInput();
  setupSuggestions();

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

/* ─── CHAT ─────────────────────────────────────────────── */

function setupChatInput() {
  const input = document.getElementById('chatInput');
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  input.addEventListener('input', () => autoResize(input));
}

function setupSuggestions() {
  document.querySelectorAll('.sug-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('chatInput').value = btn.dataset.msg;
      sendMessage();
    });
  });
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  input.style.height = 'auto';

  hideWelcome();
  appendMessage('user', msg);
  disableInput(true);

  const aiMsgId = appendTyping();

  /* ─── TODO-AI: Replace with your AI API call ────────── */
  simulateAIResponse(msg, aiMsgId);
  /* ───────────────────────────────────────────────────── */
}

function appendMessage(role, text) {
  const list = document.getElementById('msgList');
  const row = document.createElement('div');
  row.className = `msg-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = role === 'ai' ? 'AI' : 'U';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);
  list.appendChild(row);
  scrollToBottom();

  messageCount++;
  return row;
}

function appendTyping() {
  const list = document.getElementById('msgList');
  const row = document.createElement('div');
  row.className = 'msg-row ai';
  row.id = 'typing-' + Date.now();

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.textContent = 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';

  row.appendChild(avatar);
  row.appendChild(bubble);
  list.appendChild(row);
  scrollToBottom();
  return row.id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function scrollToBottom() {
  const scroll = document.getElementById('chatScroll');
  requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
}

function disableInput(disabled) {
  document.getElementById('sendBtn').disabled = disabled;
  document.getElementById('chatInput').disabled = disabled;
}

function hideWelcome() {
  const card = document.getElementById('welcomeCard');
  if (card) card.style.display = 'none';
}

/* ─── TODO-AI: Mock AI response ──────────────────────────
 *  Replace the body of this function with your real AI
 *  integration. It receives the user's message and the
 *  typing indicator element ID. Call removeTyping(typingId)
 *  and appendMessage('ai', response) when done.
 * ──────────────────────────────────────────────────────── */

const MOCK_REPLIES = [
  "Great question! Here's a helpful explanation to get you started. The key concept involves understanding the fundamental principles and how they apply to different scenarios. Would you like me to go deeper into any specific aspect?",
  "That's an interesting topic! Let me break it down into simpler parts. First, we need to understand the core idea, then we can explore how it connects to related subjects you're studying. Feel free to ask follow-up questions!",
  "I'd be happy to help with that! Here's a concise overview of what you need to know. The main points are: (1) understand the basics, (2) practice with examples, and (3) review common pitfalls. Let me know if you'd like more detail on any of these.",
  "Think of it this way — every complex topic becomes manageable when you break it into smaller pieces. Start with the foundation, build up gradually, and don't hesitate to revisit concepts you find tricky. That's the best way to learn effectively!",
  "Here's a practical approach: try working through an example step by step. When you encounter something unfamiliar, take a moment to look up the underlying concept. This active learning method helps reinforce your understanding much better than passive reading."
];

function simulateAIResponse(userMsg, typingId) {
  const delay = 800 + Math.random() * 1200;

  setTimeout(() => {
    removeTyping(typingId);

    const reply = MOCK_REPLIES[Math.floor(Math.random() * MOCK_REPLIES.length)];
    appendMessage('ai', reply);
    disableInput(false);
    scrollToBottom();
  }, delay);
}

/* ─── BG CANVAS ─────────────────────────────────────────── */

function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const cols = ['167,139,250', '6,182,212', '245,158,11'];
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
          ctx.strokeStyle = `rgba(167,139,250,${.04 * (1 - d / 85)})`; ctx.lineWidth = .4; ctx.stroke();
        }
      }
    });
    requestAnimationFrame(draw);
  })();
}
