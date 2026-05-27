let notes = [];
let currentNote = null;
let quill = null;

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initEditor();
  loadNotes();
  renderNotes();
  setupSearch();
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
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mob-overlay");

  if (sidebar) sidebar.style.display = "flex";
  if (overlay) overlay.style.display = "block";
}

function closeMob() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("mob-overlay");

  if (window.innerWidth <= 900) {
    if (sidebar) sidebar.style.display = "none";
    if (overlay) overlay.style.display = "none";
  }
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
