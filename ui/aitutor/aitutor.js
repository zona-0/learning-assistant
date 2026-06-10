const API = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : window.location.origin + '/api';

let sidebarCollapsed = false;
let currentUser = null;
let currentSessionId = null;
let sessions = [];

window.addEventListener('load', () => {
  currentUser = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!currentUser) { window.location.href = '../login/index.html'; return; }

  document.getElementById('udisplay').textContent = currentUser.fullName || currentUser.username;
  document.getElementById('urole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (currentUser.fullName || currentUser.username).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('ua').textContent = ini;

  initBg();
  setupChatInput();
  setupSuggestions();
  setupWelcomeInput();

  document.querySelectorAll('.sb-item, .sb-logout').forEach(el => {
    const lbl = el.querySelector('.sb-label');
    if (lbl) el.setAttribute('data-tip', lbl.textContent.trim());
  });

  loadSessions();
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

/* ─── SESSIONS ──────────────────────────────────── */

async function loadSessions() {
  try {
    const res = await fetch(`${API}/chat/sessions?username=${encodeURIComponent(currentUser.username)}`);
    if (!res.ok) return;
    sessions = await res.json();
    renderSessionList();
    if (sessions.length > 0) {
      switchSession(sessions[0].id);
    }
  } catch (e) {
    console.error('Failed to load sessions:', e);
  }
}

function renderSessionList() {
  const list = document.getElementById('sessionList');
  const empty = document.getElementById('spEmpty');
  list.innerHTML = '';
  if (sessions.length === 0) {
    list.appendChild(empty);
    return;
  }
  sessions.forEach(s => {
    const div = document.createElement('div');
    div.className = 'sp-item' + (s.id === currentSessionId ? ' active' : '');
    div.innerHTML = `
      <span class="sp-item-title">${escapeHtml(s.title)}</span>
      <button class="sp-item-del" onclick="event.stopPropagation();deleteSession(${s.id})" title="Delete">
        <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
          <line x1="2" y1="2" x2="12" y2="12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
          <line x1="12" y1="2" x2="2" y2="12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      </button>`;
    div.addEventListener('click', () => switchSession(s.id));
    list.appendChild(div);
  });
}

async function switchSession(sessionId) {
  if (sessionId === currentSessionId) return;
  currentSessionId = sessionId;
  renderSessionList();
  document.getElementById('msgList').innerHTML = '';
  document.getElementById('welcomeCard').style.display = 'none';

  try {
    const res = await fetch(`${API}/chat/history?username=${encodeURIComponent(currentUser.username)}&sessionId=${sessionId}`);
    if (!res.ok) return;
    const messages = await res.json();
    messages.forEach(msg => appendMessage(msg.role, msg.message, false));
    if (messages.length === 0) {
      document.getElementById('welcomeCard').style.display = '';
    }
  } catch (e) {
    console.error('Failed to load history:', e);
  }
}

async function newSession() {
  const tempId = -Date.now();
  sessions.unshift({ id: tempId, title: 'New Chat' });
  currentSessionId = tempId;
  document.getElementById('msgList').innerHTML = '';
  document.getElementById('welcomeCard').style.display = '';
  renderSessionList();
  closeSessionsPanel();

  try {
    const res = await fetch(`${API}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, title: 'New Chat' })
    });
    const data = await res.json();
    if (data.success) {
      const s = sessions.find(x => x.id === tempId);
      if (s) s.id = data.sessionId;
      if (currentSessionId === tempId) currentSessionId = data.sessionId;
      renderSessionList();
    }
  } catch (e) {
    console.error('Using local session (backend unavailable):', e);
  }
}

async function deleteSession(sessionId) {
  if (!confirm('Delete this chat?')) return;
  try {
    await fetch(`${API}/chat/sessions`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, sessionId: String(sessionId) })
    });
    sessions = sessions.filter(s => s.id !== sessionId);
    if (currentSessionId === sessionId) {
      currentSessionId = null;
      document.getElementById('msgList').innerHTML = '';
      document.getElementById('welcomeCard').style.display = '';
    }
    renderSessionList();
    if (sessions.length > 0 && !currentSessionId) {
      switchSession(sessions[0].id);
    }
  } catch (e) {
    console.error('Failed to delete session:', e);
  }
}

function toggleSessionsPanel() {
  document.getElementById('sessionsPanel').classList.toggle('closed');
}

function closeSessionsPanel() {
  document.getElementById('sessionsPanel').classList.add('closed');
}

/* ─── CHAT ──────────────────────────────────────── */

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

function setupWelcomeInput() {
  const input = document.getElementById('wcInput');
  const btn = document.getElementById('wcGoBtn');
  if (!input) return;
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendWelcomeMsg();
    }
  });
}

async function sendWelcomeMsg() {
  const input = document.getElementById('wcInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  await doSendMessage(msg);
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

async function ensureSession() {
  if (currentSessionId) return;
  const tempId = -Date.now();
  sessions.unshift({ id: tempId, title: 'New Chat' });
  currentSessionId = tempId;
  renderSessionList();

  try {
    const res = await fetch(`${API}/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, title: 'New Chat' })
    });
    const data = await res.json();
    if (data.success) {
      const s = sessions.find(x => x.id === tempId);
      if (s) s.id = data.sessionId;
      if (currentSessionId === tempId) currentSessionId = data.sessionId;
      renderSessionList();
    }
  } catch (e) {
    console.error('Using local session (backend unavailable):', e);
  }
}

async function sendMessage() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = 'auto';
  await doSendMessage(msg);
}

async function doSendMessage(msg) {
  hideWelcome();
  appendMessage('user', msg);
  disableInput(true);

  await ensureSession();

  const s = sessions.find(x => x.id === currentSessionId);
  const isFirstMessage = s && s.title === 'New Chat';

  await saveMessage('user', msg);

  const aiMsgId = appendTyping();
  simulateAIResponse(msg, aiMsgId, isFirstMessage);
}

async function handleAIResponse(aiReply, typingId) {
  removeTyping(typingId);
  const row = await typeMessage(aiReply);
  disableInput(false);
  scrollToBottom();
  await saveMessage('ai', aiReply);
}

function typeMessage(text) {
  return new Promise(resolve => {
    const list = document.getElementById('msgList');
    const row = document.createElement('div');
    row.className = 'msg-row ai';
    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = 'AI';
    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    row.appendChild(avatar);
    row.appendChild(bubble);
    list.appendChild(row);

    let i = 0;
    const speed = 15;
    function tick() {
      if (i < text.length) {
        const chunk = text.slice(i, i + 3);
        bubble.textContent += chunk;
        i += 3;
        scrollToBottom();
        setTimeout(tick, speed);
      } else {
        resolve(row);
      }
    }
    tick();
  });
}

function appendMessage(role, text, scroll = true) {
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
  if (scroll) scrollToBottom();
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

async function saveMessage(role, message) {
  if (!currentSessionId) return;
  try {
    const res = await fetch(`${API}/chat/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: currentUser.username, sessionId: String(currentSessionId), role, message })
    });
    if (!res.ok) return;
    const s = sessions.find(x => x.id === currentSessionId);
    if (s && role === 'user') {
      s.title = message.length > 70 ? [...message].slice(0, 70).join('') + '...' : message;
      renderSessionList();
    }
  } catch (e) {
    console.error('Failed to save message:', e);
  }
}

async function simulateAIResponse(userMsg, typingId, generateTitle) {
  try {
    const res = await fetch(`${API}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg, generateTitle: generateTitle ? 'true' : 'false' })
    });

    if (res.status === 429) {
      const rl = await res.json();
      removeTyping(typingId);
      showRateLimitBanner(rl.message || 'Usage limit reached. Please try again later.', rl.resetAt);
      disableInput(false);
      scrollToBottom();
      return;
    }
    
    const data = await res.json();
    const reply = data.reply || data.error || 'Sorry, I could not process that request.';

    if (generateTitle && data.title) {
      const cleanTitle = data.title.trim();
      if (cleanTitle) {
        const s = sessions.find(x => x.id === currentSessionId);
        if (s) {
          s.title = cleanTitle;
          renderSessionList();
          fetch(`${API}/chat/title`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.username, sessionId: String(currentSessionId), title: cleanTitle })
          }).catch(e => console.error('Failed to persist title:', e));
        }
      }
    }

    await handleAIResponse(reply, typingId);
  } catch (e) {
    removeTyping(typingId);
    appendMessage('ai', 'Sorry, I could not reach the AI service. The backend might be down or AI_API_KEY is not set.');
    disableInput(false);
    scrollToBottom();
  }
}

/* ─── HELPERS ───────────────────────────────────── */

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ─── RATE LIMIT BANNER ────────────────────────── */

function showRateLimitBanner(message, resetAt) {
  hideRateLimitBanner();
  const banner = document.getElementById('rateLimitBanner');
  if (!banner) return;
  const msgEl = banner.querySelector('.rl-msg');
  const timeEl = banner.querySelector('.rl-time');
  if (msgEl) msgEl.textContent = message;
  if (timeEl && resetAt) {
    timeEl.textContent = 'Reset: ' + resetAt;
    timeEl.style.display = '';
  } else if (timeEl) {
    timeEl.style.display = 'none';
  }
  banner.classList.add('show');
  setTimeout(() => hideRateLimitBanner(), 15000);
}

function hideRateLimitBanner() {
  const banner = document.getElementById('rateLimitBanner');
  if (banner) banner.classList.remove('show');
}

/* ─── BG CANVAS ─────────────────────────────────── */

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
