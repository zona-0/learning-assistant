const API = 'http://localhost:8080/api';

window.addEventListener('load', () => {
  renderNotes();
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || 'null');
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
  setTimeout(startTyping, 400);
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

function changePassword() {
  const cur = document.getElementById('pw-current').value;
  const nw  = document.getElementById('pw-new').value;
  const cf  = document.getElementById('pw-confirm').value;
  const al  = document.getElementById('pw-alert');
  al.className = 'pw-alert';
  if (!cur||!nw||!cf) { al.classList.add('error'); al.textContent='Please fill in all fields.'; return; }
  if (nw.length < 6)  { al.classList.add('error'); al.textContent='Password min. 6 characters.'; return; }
  if (nw !== cf)      { al.classList.add('error'); al.textContent='Passwords do not match.'; return; }
  al.classList.add('success');
  al.textContent = 'Password updated successfully!';
  document.getElementById('pw-current').value = '';
  document.getElementById('pw-new').value     = '';
  document.getElementById('pw-confirm').value = '';
  document.getElementById('pw-strength-wrap').style.display = 'none';
  setTimeout(() => { al.className = 'pw-alert hidden'; }, 3000);
}

const pomVals = {focus:25, short:5, long:15, sessions:4};
const pomMin  = {focus:5,  short:1, long:5,  sessions:1};
const pomMax  = {focus:60, short:15,long:45, sessions:8};

function adjustCounter(key, delta) {
  pomVals[key] = Math.min(Math.max(pomVals[key]+delta, pomMin[key]), pomMax[key]);
  document.getElementById(key+'-val').textContent = pomVals[key];
}

function savePomSettings() {
  localStorage.setItem('pom_settings', JSON.stringify(pomVals));
  const btn = event.target;
  const orig = btn.textContent;
  btn.textContent = 'Saved!';
  btn.style.cssText = 'background:rgba(52,211,153,.2);border-color:rgba(52,211,153,.4);color:#6ee7b7';
  setTimeout(() => { btn.textContent=orig; btn.style.cssText=''; }, 2000);
}

function loadPrefs() {
  const saved = JSON.parse(localStorage.getItem('pom_settings') || 'null');
  if (!saved) return;
  Object.assign(pomVals, saved);
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

function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  window.location.href = '../login/index.html';
}

// ======================
// FIXED NOTE SYSTEM
// ======================

let notes = JSON.parse(localStorage.getItem("notes")) || [];
let editIndex = null;

// NORMALIZE DATA (biar tidak error)
notes = notes.map(n => {
  if (typeof n === "string") {
    return { title: "Untitled", content: n };
  }
  return n;
});

// RENDER
function renderNotes() {
  const list = document.getElementById("note-list");
  if (!list) return;

  list.innerHTML += `
  <div class="act-item">
    ...
    <button onclick="viewNote(${i})">View</button>
    <button onclick="editNote(${i})">Edit</button>
    <button onclick="deleteNote(${i})">Delete</button>
  </div>
`;
function renderNotes() {
  const list = document.getElementById("note-list");
  if (!list) return;

  list.innerHTML = "";

  if (notes.length === 0) {
    list.innerHTML = `<p style="color:#5a8f9e;">No notes yet...</p>`;
    return;
  }

  notes.forEach((n, i) => {
    const shortText = n.content.length > 50
      ? n.content.substring(0, 50) + "..."
      : n.content;

    list.innerHTML += `
      <div class="act-item">
        <div class="act-body">
          <p class="act-device"><strong>${n.title}</strong></p>
          <p class="act-time">${shortText}</p>
        </div>

        <button onclick="viewNote(${i})">View</button>
        <button onclick="editNote(${i})">Edit</button>
        <button onclick="deleteNote(${i})">Delete</button>
        <button onclick="exportPDF(${i})">Export PDF</button>
      </div>
    `;
  });
}

function exportPDF(index) {
  const note = notes[index];

  fetch(`${API}/notes/${note.id}/export`)
    .then(res => {
      if (!res.ok) throw new Error("Gagal export");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `note-${note.id}.pdf`;
      a.click();
    })
    .catch(err => {
      alert("Export gagal!");
      console.error(err);
    });
}

  if (notes.length === 0) {
    list.innerHTML = `<p style="color:#5a8f9e;">No notes yet...</p>`;
    return;
  }


    const shortText = n.content.length > 50
      ? n.content.substring(0, 50) + "..."
      : n.content;

    list.innerHTML += `
      <div class="act-item">
        <div class="act-body">
          <p class="act-device"><strong>${n.title}</strong></p>
          <p class="act-time">${shortText}</p>
        </div>

        <button class="act-revoke" onclick="viewNote(${i})">View</button>
        <button class="act-revoke" onclick="editNote(${i})">Edit</button>
        <button class="act-revoke" onclick="deleteNote(${i})">Delete</button>
      </div>
    `;
  }


// ADD / UPDATE
function addNote() {
  const titleEl = document.getElementById("note-title");
  const contentEl = document.getElementById("note-input");

  if (!contentEl) return;

  const title = titleEl ? titleEl.value.trim() : "Untitled";
  const content = contentEl.value.trim();

  if (!content) return;

  const newNote = {
    id: Date.now(), // tambahkan ini
    title,
    content
  }

  if (editIndex !== null) {
    notes[editIndex] = newNote;
    editIndex = null;
  } else {
    notes.push(newNote);
  }

  localStorage.setItem("notes", JSON.stringify(notes));

  if (titleEl) titleEl.value = "";
  contentEl.value = "";

  renderNotes();
}

// DELETE
function deleteNote(i) {
  notes.splice(i, 1);
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
}

// EDIT
function editNote(i) {
  const titleEl = document.getElementById("note-title");
  const contentEl = document.getElementById("note-input");

  if (titleEl) titleEl.value = notes[i].title;
  if (contentEl) contentEl.value = notes[i].content;

  editIndex = i;
}

// VIEW
function viewNote(i) {
  const modal = document.getElementById("noteModal");
  const detail = document.getElementById("noteDetail");

  if (!modal || !detail) return;

  modal.style.display = "block";

  detail.innerHTML = `
    <h4 style="color:#67e8f9;margin-bottom:8px;">${notes[i].title}</h4>
    <p>${notes[i].content}</p>
  `;
}

// CLOSE
function closeNote() {
  const modal = document.getElementById("noteModal");
  if (modal) modal.style.display = "none";
}

// INIT
window.addEventListener('load', () => {
  renderNotes();
});