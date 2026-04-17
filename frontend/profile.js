window.addEventListener('load', () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = 'index.html'; return; }

  const fn   = user.fullName || user.username;
  const role = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini  = fn.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  document.getElementById('ua').textContent      = ini;
  document.getElementById('ua-name').textContent = fn;
  document.getElementById('ua-role').textContent = role.toUpperCase();

  document.getElementById('av-circle').textContent    = ini;
  document.getElementById('av-name').textContent      = fn;
  document.getElementById('av-role-badge').textContent = role;

  document.getElementById('f-fullname').value = fn;
  document.getElementById('f-username').value = user.username;
  document.getElementById('f-email').value    = user.email || '';
  document.getElementById('f-role').value     = role;

  document.getElementById('acc-username').textContent = user.username;
  document.getElementById('acc-email').textContent    = user.email || '—';
  document.getElementById('acc-role-badge').textContent = role;
  document.getElementById('acc-role-badge').className = user.role === 'admin'
    ? 'role-badge' : 'role-badge';

//   animateNum('st-pomodoro', 48);
//   animateNum('st-notes', 23);
//   animateNum('st-quiz', 87);

  loadPrefs();
});

function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  btn.classList.add('active');
}

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

function saveProfile() {
  const fn   = document.getElementById('f-fullname').value.trim();
  const toast = document.getElementById('save-toast');
  if (!fn) return;

  document.getElementById('av-name').textContent = fn;
  const ini = fn.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const circle = document.getElementById('av-circle');
  if (!circle.querySelector('img')) circle.textContent = ini;
  document.getElementById('ua').textContent      = ini;
  document.getElementById('ua-name').textContent = fn;

  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || '{}');
  user.fullName = fn;
  sessionStorage.setItem('cleverai_user', JSON.stringify(user));

  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3000);
}

function resetProfileForm() {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || '{}');
  document.getElementById('f-fullname').value = user.fullName || user.username;
  document.getElementById('f-email').value    = user.email || '';
  document.getElementById('f-jurusan').value  = '';
  document.getElementById('f-semester').value = '';
  document.getElementById('f-target').value   = '';
  document.getElementById('f-bio').value      = '';
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
    { w:'20%', c:'#f43f5e', t:'Weak' },
    { w:'40%', c:'#f59e0b', t:'Fair' },
    { w:'60%', c:'#f59e0b', t:'Fair' },
    { w:'80%', c:'#06b6d4', t:'Good' },
    { w:'100%',c:'#34d399', t:'Strong' },
  ];
  const l = levels[Math.min(score - 1, 4)] || levels[0];
  fill.style.width      = l.w;
  fill.style.background = l.c;
  lbl.textContent       = l.t;
  lbl.style.color       = l.c;
}

function changePassword() {
  const cur = document.getElementById('pw-current').value;
  const nw  = document.getElementById('pw-new').value;
  const cf  = document.getElementById('pw-confirm').value;
  const al  = document.getElementById('pw-alert');

  al.className = 'pw-alert';
  if (!cur || !nw || !cf) { al.classList.add('error'); al.textContent = 'Please fill in all fields.'; return; }
  if (nw.length < 6)      { al.classList.add('error'); al.textContent = 'New password must be at least 6 characters.'; return; }
  if (nw !== cf)          { al.classList.add('error'); al.textContent = 'Passwords do not match.'; return; }

  al.classList.add('success');
  al.textContent = 'Password updated successfully!';
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value     = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-strength-wrap').style.display = 'none';
  setTimeout(() => { al.className = 'pw-alert hidden'; }, 3000);
}

const pomVals = { focus: 25, short: 5, long: 15, sessions: 4 };
const pomMin  = { focus: 5,  short: 1, long: 5,  sessions: 1 };
const pomMax  = { focus: 60, short: 15, long: 45, sessions: 8 };

function adjustCounter(key, delta) {
  pomVals[key] = Math.min(Math.max(pomVals[key] + delta, pomMin[key]), pomMax[key]);
  document.getElementById(key + '-val').textContent = pomVals[key];
}

function savePomSettings() {
  localStorage.setItem('pom_settings', JSON.stringify(pomVals));
  const btn = event.target;
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  btn.style.background = 'rgba(52,211,153,.2)';
  btn.style.borderColor = 'rgba(52,211,153,.4)';
  btn.style.color = '#6ee7b7';
  setTimeout(() => {
    btn.textContent = orig;
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
  }, 2000);
}

function loadPrefs() {
  const saved = JSON.parse(localStorage.getItem('pom_settings') || 'null');
  if (!saved) return;
  Object.assign(pomVals, saved);
  Object.keys(pomVals).forEach(k => {
    const el = document.getElementById(k + '-val');
    if (el) el.textContent = pomVals[k];
  });
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let c = 0;
  const iv = setInterval(() => {
    c = Math.min(c + target / 40, target);
    el.textContent = Math.floor(c);
    if (c >= target) clearInterval(iv);
  }, 20);
}

function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  window.location.href = 'index.html';
}