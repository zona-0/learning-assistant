const API = (!window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:8080/api'
  : window.location.origin + '/api';

window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = '../login/index.html'; return; }

  const fn   = user.fullName || user.username;
  const role = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini  = fn.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('ua').textContent       = ini;
  document.getElementById('ua-name').textContent  = fn;
  document.getElementById('ua-role').textContent  = role.toUpperCase();
  document.getElementById('av-circle').textContent = ini;
  document.getElementById('av-name').textContent  = fn;

  document.getElementById('f-fullname').value = fn;
  document.getElementById('f-username').value = user.username;
  document.getElementById('f-email').value    = user.email || '';
  document.getElementById('f-role').value     = role;

  document.getElementById('acc-username').textContent   = user.username;
  document.getElementById('acc-email').textContent      = user.email || '—';
  document.getElementById('acc-role-badge').textContent = role;

  loadPrefs();
  loadAppPrefs();
  loadGoals();

  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('tab');
  if (tabParam) {
    const btn = document.getElementById('tab-btn-' + tabParam);
    if (btn) setTimeout(() => switchTab(tabParam, btn), 50);
  }

  setTimeout(() => {
    const activeBtn = document.querySelector('.goal-period-btn.active');
    if (activeBtn) switchGoalPeriod('week', activeBtn);
  }, 100);
  setTimeout(startTyping, 400);

  /* ── Auto-save preferences on change ── */
  document.getElementById('pref-language').addEventListener('change', saveAppPrefs);
  document.querySelectorAll('#tab-preferences .toggle input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', saveAppPrefs);
  });
});

function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = -1;
  });
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  btn.tabIndex = 0;
  btn.focus();
}

document.addEventListener('DOMContentLoaded', () => {
  const tablist = document.querySelector('[role="tablist"]');
  if (!tablist) return;
  tablist.addEventListener('keydown', e => {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    const idx = tabs.indexOf(e.target);
    if (idx === -1) return;
    let next;
    switch (e.key) {
      case 'ArrowRight': next = (idx + 1) % tabs.length; break;
      case 'ArrowLeft':  next = (idx - 1 + tabs.length) % tabs.length; break;
      case 'Home':       next = 0; break;
      case 'End':        next = tabs.length - 1; break;
      default: return;
    }
    e.preventDefault();
    tabs[next].click();
  });
});

let collapsed = false;
function toggleSidebar() {
  collapsed = !collapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', collapsed);
}
function openMob() {
  document.getElementById('sidebar').classList.add('mob-open');
  document.getElementById('mob-overlay').classList.add('show');
}
function closeMob() {
  document.getElementById('sidebar').classList.remove('mob-open');
  document.getElementById('mob-overlay').classList.remove('show');
}

function handleAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const circle = document.getElementById('av-circle');
    circle.innerHTML = `<img src="${e.target.result}" alt="avatar">`;
  };
  reader.readAsDataURL(file);
}

function setFieldError(wrapId, errId, show) {
  const wrap = document.getElementById(wrapId);
  const err  = document.getElementById(errId);
  if (!wrap || !err) return;
  if (show) { wrap.classList.add('err'); err.classList.add('show'); }
  else       { wrap.classList.remove('err'); err.classList.remove('show'); }
}

function showProgress() {
  const bar  = document.getElementById('save-progress');
  const fill = document.getElementById('save-progress-bar');
  bar.classList.remove('hidden');
  fill.style.width = '0%';
  let w = 0;
  const iv = setInterval(() => {
    w += 3;
    fill.style.width = Math.min(w, 85) + '%';
    if (w >= 85) clearInterval(iv);
  }, 40);
  return iv;
}
function finishProgress(success) {
  const bar  = document.getElementById('save-progress');
  const fill = document.getElementById('save-progress-bar');
  fill.style.transition = 'width .3s ease';
  fill.style.width = '100%';
  fill.style.background = success ? '#34d399' : '#f43f5e';
  setTimeout(() => { bar.classList.add('hidden'); fill.style.transition=''; fill.style.background=''; }, 600);
}
function showStatus(type, msg) {
  const el  = document.getElementById('save-status');
  const ico = document.getElementById('save-status-ico');
  const txt = document.getElementById('save-status-msg');
  const icons = {
    loading: '⟳',
    success: '✓',
    error:   '✕'
  };
  el.className = 'save-status ' + type;
  ico.textContent = icons[type] || '';
  txt.textContent = msg;
  if (type !== 'loading') {
    setTimeout(() => { el.classList.add('hidden'); }, 4000);
  }
}

async function saveProfile() {
  const fnEl    = document.getElementById('f-fullname');
  const emailEl = document.getElementById('f-email');
  const user    = JSON.parse(sessionStorage.getItem('cleverai_user') || '{}');
  const btn     = document.getElementById('btn-save');

  const fn    = fnEl.value.trim();
  const email = emailEl.value.trim() || user.email || '';

  let hasError = false;
  if (!fn) {
    setFieldError('wrap-fullname','err-fullname', true);
    fnEl.focus();
    hasError = true;
  } else {
    setFieldError('wrap-fullname','err-fullname', false);
  }
  if (!email || !email.includes('@')) {
    setFieldError('wrap-email','err-email', true);
    if (!hasError) emailEl.focus();
    hasError = true;
  } else {
    setFieldError('wrap-email','err-email', false);
  }
  if (hasError) return;

  if (!emailEl.value.trim()) emailEl.value = email;

  btn.disabled = true;
  btn.style.opacity = '.6';

  const iv = showProgress();
  showStatus('loading', 'Saving changes...');

  try {
    const res = await fetch(`${API}/profile/update`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: user.username, fullName: fn, email: email })
    });
    const d = await res.json();

    clearInterval(iv);
    finishProgress(d.success);

    if (d.success) {
      document.getElementById('av-name').textContent = fn;
      document.getElementById('ua-name').textContent = fn;
      const ini = fn.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
      const circle = document.getElementById('av-circle');
      if (!circle.querySelector('img')) circle.textContent = ini;
      document.getElementById('ua').textContent = ini;

      user.fullName = fn;
      user.email    = email;
      sessionStorage.setItem('cleverai_user', JSON.stringify(user));

      showStatus('success', 'Profile updated successfully!');
    } else {
      showStatus('error', d.message || 'Failed to save. Try again.');
    }
  } catch (e) {
    clearInterval(iv);
    finishProgress(false);
    showStatus('error', 'Cannot connect to server (port 8080).');
  } finally {
    btn.disabled = false;
    btn.style.opacity = '';
  }
}

function resetProfileForm() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || '{}');
  document.getElementById('f-fullname').value = user.fullName || user.username;
  document.getElementById('f-email').value    = user.email || '';
}

function togglePw(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

function checkPwStrength() {
  const pw   = document.getElementById('pw-new').value;
  const wrap = document.getElementById('pw-strength-wrap');
  const fill = document.getElementById('pw-fill');
  const lbl  = document.getElementById('pw-label');
  if (!pw) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    {w:'20%',c:'#f43f5e',t:'Weak'},
    {w:'40%',c:'#f59e0b',t:'Fair'},
    {w:'60%',c:'#f59e0b',t:'Fair'},
    {w:'80%',c:'#06b6d4',t:'Good'},
    {w:'100%',c:'#34d399',t:'Strong'},
  ];
  const l = levels[Math.min(score-1,4)] || levels[0];
  fill.style.width      = l.w;
  fill.style.background = l.c;
  lbl.textContent       = l.t;
  lbl.style.color       = l.c;
}

async function changePassword() {
  const cur = document.getElementById('pw-current').value;
  const nw  = document.getElementById('pw-new').value;
  const cf  = document.getElementById('pw-confirm').value;
  const al  = document.getElementById('pw-alert');
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || '{}');
  al.className = 'pw-alert';
  if (!cur||!nw||!cf) { al.classList.add('error'); al.textContent='Please fill in all fields.'; return; }
  if (nw.length < 6)  { al.classList.add('error'); al.textContent='Password min. 6 characters.'; return; }
  if (nw !== cf)      { al.classList.add('error'); al.textContent='Passwords do not match.'; return; }
  try {
    const res = await fetch(`${API}/password/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, oldPassword: cur, newPassword: nw })
    });
    const d = await res.json();
    if (d.success) {
      al.classList.add('success');
      al.textContent = 'Password updated successfully!';
      document.getElementById('pw-current').value = '';
      document.getElementById('pw-new').value     = '';
      document.getElementById('pw-confirm').value = '';
      document.getElementById('pw-strength-wrap').style.display = 'none';
    } else {
      al.classList.add('error');
      al.textContent = d.message || 'Failed to change password.';
    }
  } catch (e) {
    al.classList.add('error');
    al.textContent = 'Cannot connect to server.';
  }
  setTimeout(() => { al.className = 'pw-alert hidden'; }, 3000);
}

const pomVals = {focus:25, short:5, long:15, sessions:4};
const pomMin  = {focus:5,  short:1, long:5,  sessions:1};
const pomMax  = {focus:60, short:15,long:45, sessions:8};

function adjustCounter(key, delta) {
  pomVals[key] = Math.min(Math.max(pomVals[key]+delta, pomMin[key]), pomMax[key]);
  document.getElementById(key+'-val').textContent = pomVals[key];
}

function savePomSettings(btn) {
  localStorage.setItem('pom_settings', JSON.stringify(pomVals));
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (user) {
    fetch(API + '/pomodoro/save-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: user.username,
        focusDuration: pomVals.focus,
        shortBreak: pomVals.short,
        longBreak: pomVals.long,
        sessionsBeforeLong: pomVals.sessions
      })
    }).catch(() => {});
  }
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  btn.style.cssText = 'background:rgba(52,211,153,.2);border-color:rgba(52,211,153,.4);color:#6ee7b7';
  setTimeout(() => { btn.textContent=orig; btn.style.cssText=''; }, 2000);
}

function loadPrefs() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (user) {
    fetch(API + '/pomodoro/settings?username=' + encodeURIComponent(user.username))
      .then(r => r.json())
      .then(d => {
        if (d && d.focusDuration) {
          pomVals.focus = d.focusDuration;
          pomVals.short = d.shortBreak;
          pomVals.long = d.longBreak;
          pomVals.sessions = d.sessionsBeforeLong;
          localStorage.setItem('pom_settings', JSON.stringify(pomVals));
          applyPomVals();
          return;
        }
        fallbackPrefs();
      })
      .catch(() => fallbackPrefs());
  } else {
    fallbackPrefs();
  }
}

function fallbackPrefs() {
  const saved = JSON.parse(localStorage.getItem('pom_settings') || 'null');
  if (!saved) return;
  Object.assign(pomVals, saved);
  applyPomVals();
}

function applyPomVals() {
  Object.keys(pomVals).forEach(k => {
    const el = document.getElementById(k+'-val');
    if (el) el.textContent = pomVals[k];
  });
}

function startTyping() {
  const el = document.getElementById('maint-typing');
  if (!el) return;
  const text = 'Under Maintenance';
  let i = 0;
  el.textContent = '';
  const iv = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= text.length) {
      clearInterval(iv);
      setTimeout(() => eraseTyping(el, text), 2200);
    }
  }, 90);
}

function eraseTyping(el, text) {
  let i = text.length;
  const iv = setInterval(() => {
    el.textContent = text.substring(0, i);
    i--;
    if (i < 0) { clearInterval(iv); setTimeout(() => startTyping(), 400); }
  }, 45);
}

/* ── App Preferences (persistent) ── */
function loadAppPrefs() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  fetch(API + '/preferences?username=' + encodeURIComponent(user.username))
    .then(r => r.json())
    .then(d => {
      if (!d || !d.language) return;
      document.getElementById('pref-language').value = d.language || 'en';
      document.getElementById('pref-sound').checked       = d.soundNotifications !== false;
      document.getElementById('pref-desktop-notif').checked = !!d.desktopNotifications;
      document.getElementById('pref-auto-save').checked   = d.autoSaveNotes !== false;
      document.getElementById('pref-show-progress').checked = d.showProgressDashboard !== false;
    })
    .catch(() => {});
}

function saveAppPrefs() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  fetch(API + '/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: user.username,
      language: document.getElementById('pref-language').value,
      soundNotifications: document.getElementById('pref-sound').checked,
      desktopNotifications: document.getElementById('pref-desktop-notif').checked,
      autoSaveNotes: document.getElementById('pref-auto-save').checked,
      showProgressDashboard: document.getElementById('pref-show-progress').checked,
    })
  }).catch(() => {});
}

/* ── Learning Goals ── */
const goalData = { week: { focusGoal: 10, quizGoal: 5, notesGoal: 7 }, month: { focusGoal: 40, quizGoal: 20, notesGoal: 28 }, year: { focusGoal: 480, quizGoal: 240, notesGoal: 336 } };
let currentGoalPeriod = 'week';

function loadGoals() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  fetch(API + '/goals?username=' + encodeURIComponent(user.username))
    .then(r => r.json())
    .then(d => {
      if (!d || !d.success) return;
      ['week', 'month', 'year'].forEach(p => {
        if (d[p]) {
          goalData[p].focusGoal = d[p].focusGoal || goalData[p].focusGoal;
          goalData[p].quizGoal = d[p].quizGoal || goalData[p].quizGoal;
          goalData[p].notesGoal = d[p].notesGoal || goalData[p].notesGoal;
        }
      });
      applyGoalVals();
    })
    .catch(() => {});
}

function switchGoalPeriod(period, btn) {
  currentGoalPeriod = period;
  document.querySelectorAll('.goal-period-btn').forEach(b => {
    b.style.background = 'transparent';
    b.style.color = '#94c9d4';
  });
  btn.style.background = 'rgba(6,182,212,0.2)';
  btn.style.color = '#06b6d4';
  applyGoalVals();
}

function adjustGoal(key, delta) {
  goalData[currentGoalPeriod][key] = Math.max(1, (goalData[currentGoalPeriod][key] || 0) + delta);
  applyGoalVals();
}

function applyGoalVals() {
  const g = goalData[currentGoalPeriod];
  document.getElementById('goal-focus-val').textContent = g.focusGoal;
  document.getElementById('goal-quiz-val').textContent = g.quizGoal;
  document.getElementById('goal-notes-val').textContent = g.notesGoal;
}

function saveGoals(btn) {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  const g = goalData[currentGoalPeriod];
  fetch(API + '/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: user.username,
      period: currentGoalPeriod,
      focusGoal: g.focusGoal,
      quizGoal: g.quizGoal,
      notesGoal: g.notesGoal
    })
  }).then(r => r.json()).then(d => {
    const orig = btn.textContent;
    btn.textContent = d.success ? 'Saved!' : 'Failed';
    btn.style.cssText = d.success ? 'background:rgba(52,211,153,.2);border-color:rgba(52,211,153,.4);color:#6ee7b7' : 'background:rgba(244,63,94,.2);border-color:rgba(244,63,94,.4);color:#fb7185';
    setTimeout(() => { btn.textContent = orig; btn.style.cssText = ''; }, 2000);
  }).catch(() => {});
}

/* ── Danger Zone ── */
function deactivateAccount() {
  if (!confirm('Are you sure you want to deactivate your account? You can reactivate later by contacting support.')) return;
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  fetch(API + '/account/deactivate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        alert('Account deactivated. Redirecting to login.');
        doLogout();
      } else {
        alert(d.message || 'Failed to deactivate.');
      }
    })
    .catch(() => alert('Cannot connect to server.'));
}

function deleteAccount() {
  if (!confirm('⚠️ This will permanently delete ALL your data including notes, quizzes, chat history, and pomodoro logs. Are you absolutely sure?')) return;
  if (!confirm('Type "DELETE" to confirm permanent deletion.')) return;
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) return;
  fetch(API + '/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user.username, confirm: 'DELETE' })
  })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        alert('Account permanently deleted. Goodbye.');
        doLogout();
      } else {
        alert(d.message || 'Failed to delete account.');
      }
    })
    .catch(() => alert('Cannot connect to server.'));
}

function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  localStorage.removeItem('cleverai_user');
  window.location.href = '../login/index.html';
}