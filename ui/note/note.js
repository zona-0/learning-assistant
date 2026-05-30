let notes = [];
let currentNote = null;
let quill = null;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(sessionStorage.getItem('cleverai_user') || localStorage.getItem('cleverai_user') || 'null');
  if (!user) { window.location.href = '../login/index.html'; return; }

  document.getElementById('udisplay').textContent = user.fullName || user.username;
  document.getElementById('urole').textContent    = user.role === 'admin' ? 'Administrator' : 'Pelajar';
  const ini = (user.fullName || user.username).split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  document.getElementById('ua').textContent = ini;

  initTheme();
  initEditor();
  loadNotes();
  renderNotes();
  setupSearch();
  initBg();

  document.querySelectorAll('.sb-item, .sb-logout').forEach(el => {
    const lbl = el.querySelector('.sb-label');
    if (lbl) el.setAttribute('data-tip', lbl.textContent.trim());
  });
});

/* =========================
   THEME
========================= */
function initTheme() {
  const saved = localStorage.getItem("cleverai-theme") || "dark";

  if (saved === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

function toggleTheme() {
  const dark = document.body.classList.toggle("dark");

  localStorage.setItem(
    "cleverai-theme",
    dark ? "dark" : "light"
  );
}

/* =========================
   EDITOR
========================= */
function initEditor() {
  const editor = document.getElementById("noteContentEditor");

  if (!editor) {
    console.error("Editor container missing");
    return;
  }

  if (typeof Quill === "undefined") {
    console.error("Quill not loaded");
    return;
  }

  quill = new Quill("#noteContentEditor", {
    theme: "snow",
    modules: {
      toolbar: "#editor-toolbar",
      history: {
        delay: 1000,
        maxStack: 100,
        userOnly: true
      }
    }
  });
}

/* =========================
   STORAGE
========================= */
function loadNotes() {
  try {
    const raw = localStorage.getItem("cleverai-notes");

    if (!raw) {
      notes = [];
      return;
    }

    const parsed = JSON.parse(raw);

    notes = parsed
      .map(note => {
        if (!note) return null;

        // migrate old format
        if (note.text && !note.content) {
          return {
            id: note.id || generateId(),
            title: note.title || note.text.substring(0, 40),
            content: note.text,
            createdAt: note.createdAt || new Date().toISOString(),
            updatedAt: note.updatedAt || new Date().toISOString()
          };
        }

        if (note.content) {
          return note;
        }

        return null;
      })
      .filter(Boolean);

    saveNotes();
  } catch (err) {
    console.error(err);
    notes = [];
  }
}

function saveNotes() {
  localStorage.setItem(
    "cleverai-notes",
    JSON.stringify(notes)
  );
}

function generateId() {
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

/* =========================
   CRUD
========================= */
function createNewNote() {
  currentNote = null;

  document.getElementById("noteTitle").value = "";

  if (quill) {
    quill.root.innerHTML = "";
  }

  openModal();
}

function saveNote() {
  if (!quill) {
    showToast("Editor failed to load", "error");
    return;
  }

  const title = document.getElementById("noteTitle").value.trim();
  const content = quill.root.innerHTML;
  const plainText = quill.getText().trim();

  if (!title) {
    showToast("Please enter a title", "error");
    return;
  }

  if (!plainText) {
    showToast("Please enter note content", "error");
    return;
  }

  const now = new Date().toISOString();

  if (currentNote) {
    notes[currentNote.index] = {
      ...notes[currentNote.index],
      title,
      content,
      updatedAt: now
    };

    showToast("Note updated");
  } else {
    notes.unshift({
      id: generateId(),
      title,
      content,
      createdAt: now,
      updatedAt: now
    });

    showToast("Note created");
  }

  saveNotes();
  renderNotes();
  closeNoteEditor();
}

function editNote(index) {
  const note = notes[index];

  if (!note) return;

  currentNote = {
    note,
    index
  };

  document.getElementById("noteTitle").value = note.title;

  if (quill) {
    quill.root.innerHTML = note.content || "";
  }

  openModal();
}

function deleteNote(index) {
  const note = notes[index];

  if (!note) return;

  const confirmDelete = confirm("Delete this note?");
  if (!confirmDelete) return;

  notes = notes.filter((_, i) => i !== index);

  saveNotes();
  renderNotes();
  showToast("Note deleted");
}

/* =========================
   MODAL
========================= */
function openModal() {
  const modal = document.getElementById("noteEditorModal");

  if (!modal) return;

  modal.classList.add("show");
}

function closeNoteEditor() {
  const modal = document.getElementById("noteEditorModal");

  if (!modal) return;

  modal.classList.remove("show");
  currentNote = null;
}

/* =========================
   RENDER
========================= */
function renderNotes(list = notes) {
  const grid = document.getElementById("notes-grid");

  if (!grid) return;

  grid.innerHTML = "";

  if (!list.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <h3>No notes yet</h3>
        <p>Create your first note to begin.</p>
      </div>
    `;
    return;
  }

  list.forEach(note => {
    const index = notes.findIndex(n => n.id === note.id);

    const temp = document.createElement("div");
    temp.innerHTML = note.content;

    const preview = temp.innerText.substring(0, 140);

    const card = document.createElement("div");
    card.className = "note-card";

    card.innerHTML = `
      <div class="note-top">
        <div class="note-title">${escapeHtml(note.title)}</div>

        <div class="note-actions">
          <button class="icon-btn edit-btn" data-index="${index}">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path d="M4 13.5V16H6.5L14.2 8.3L11.7 5.8L4 13.5Z" stroke="currentColor" stroke-width="1.5"/>
              <path d="M10.8 6.7L13.3 9.2" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>

          <button class="icon-btn delete-btn" data-index="${index}">
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none">
              <path d="M5 6H15" stroke="currentColor" stroke-width="1.5"/>
              <path d="M7 6V15" stroke="currentColor" stroke-width="1.5"/>
              <path d="M13 6V15" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 3H12" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <p class="note-preview">${escapeHtml(preview)}...</p>
    `;

    card.querySelector(".edit-btn").addEventListener("click", e => {
      e.stopPropagation();
      editNote(index);
    });

    card.querySelector(".delete-btn").addEventListener("click", e => {
      e.stopPropagation();
      deleteNote(index);
    });

    card.addEventListener("click", () => {
      editNote(index);
    });

    grid.appendChild(card);
  });
}

/* =========================
   SEARCH
========================= */
function setupSearch() {
  const input = document.getElementById("search-input");

  if (!input) return;

  input.addEventListener("input", e => {
    const query = e.target.value.trim().toLowerCase();

    if (!query) {
      renderNotes();
      return;
    }

    const filtered = notes.filter(note => {
      const temp = document.createElement("div");
      temp.innerHTML = note.content;

      return (
        note.title.toLowerCase().includes(query) ||
        temp.innerText.toLowerCase().includes(query)
      );
    });

    renderNotes(filtered);
  });
}

/* =========================
   SIDEBAR
========================= */
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");

  if (!sidebar) return;

  sidebar.classList.toggle("collapsed");
}

function openMob() {
  document.getElementById("sidebar").classList.add("mob-open");
  document.getElementById("mob-overlay").classList.add("show");
}

function closeMob() {
  document.getElementById("sidebar").classList.remove("mob-open");
  document.getElementById("mob-overlay").classList.remove("show");
}

/* =========================
   LOGOUT
========================= */
function doLogout() {
  sessionStorage.removeItem('cleverai_user');
  window.location.href = '../login/index.html';
}

/* =========================
   BG CANVAS
========================= */
function initBg() {
  const cv = document.getElementById('bgCanvas');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  resize(); window.addEventListener('resize', resize);
  const cols = ['6,182,212','244,63,94','245,158,11','167,139,250'];
  const pts = Array.from({length:35}, () => ({
    x:Math.random()*cv.width, y:Math.random()*cv.height,
    vx:(Math.random()-.5)*.18, vy:(Math.random()-.5)*.18,
    r:Math.random()*1.1+.3, a:Math.random()*.26+.05,
    c:cols[Math.floor(Math.random()*cols.length)]
  }));
  (function draw() {
    ctx.clearRect(0,0,cv.width,cv.height);
    pts.forEach(p => {
      p.x+=p.vx; p.y+=p.vy;
      if(p.x<0)p.x=cv.width; if(p.x>cv.width)p.x=0;
      if(p.y<0)p.y=cv.height; if(p.y>cv.height)p.y=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(${p.c},${p.a})`; ctx.fill();
    });
    pts.forEach((p,i) => {
      for(let j=i+1;j<pts.length;j++){
        const q=pts[j],dx=p.x-q.x,dy=p.y-q.y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<85){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
          ctx.strokeStyle=`rgba(6,182,212,${.04*(1-d/85)})`;ctx.lineWidth=.4;ctx.stroke();}
      }
    });
    requestAnimationFrame(draw);
  })();
}

/* =========================
   TOAST
========================= */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
  }, 2500);
}

/* =========================
   HELPERS
========================= */
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/* =========================
   ESC CLOSE
========================= */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    closeNoteEditor();
  }
});
