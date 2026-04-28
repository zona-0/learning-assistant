
let notes = JSON.parse(localStorage.getItem("notes")) || [];


function renderNotes() {
  const list = document.getElementById("note-list");
  list.innerHTML = "";

  notes.forEach((note, index) => {
    const item = document.createElement("div");
    item.className = "act-item";
    item.style.cursor = "pointer";

    
    let text = typeof note === "string" ? note : note.text;
    let date = typeof note === "string" ? "" : note.date;

    item.innerHTML = `
      <div class="act-body">
        <p class="act-device">${text.substring(0, 40)}...</p>
        <p class="act-time">${date || "Click to view"}</p>
      </div>
      <button onclick="deleteNote(${index})" class="act-revoke">Delete</button>
    `;

    
    item.onclick = () => openNote(note);

    list.appendChild(item);
  });
}


function addNote() {
  const input = document.getElementById("note-input");
  const value = input.value.trim();

  if (!value) return alert("Note tidak boleh kosong");

  
  const now = new Date();

  const hari = now.toLocaleDateString("id-ID", { weekday: "long" });
  const tanggal = now.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  const fullDate = `${hari}, ${tanggal}`;

  
  const newNote = {
    text: value,
    date: fullDate
  };

  notes.push(newNote);

  
  localStorage.setItem("notes", JSON.stringify(notes));

  input.value = "";
  renderNotes();
}


function deleteNote(index) {
  event.stopPropagation();
  notes.splice(index, 1);
  localStorage.setItem("notes", JSON.stringify(notes));
  renderNotes();
}


function openNote(note) {
  const detail = document.getElementById("noteDetail");

  if (typeof note === "string") {
    detail.innerText = note;
  } else {
    detail.innerText = `${note.text}\n\n${note.date}`;
  }

  document.getElementById("noteModal").style.display = "block";
}


function closeNote() {
  document.getElementById("noteModal").style.display = "none";
}


window.onload = renderNotes;



const pdfScript = document.createElement("script");
pdfScript.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
document.head.appendChild(pdfScript);


const originalRender = renderNotes;

// override render untuk tambah tombol PDF
renderNotes = function () {
  originalRender();

  const items = document.querySelectorAll("#note-list .act-item");

  items.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.innerText = "PDF";
    btn.className = "act-revoke";
    btn.style.marginLeft = "6px";

    btn.onclick = function (e) {
      e.stopPropagation();
      exportNoteToPDF(index);
    };

    item.appendChild(btn);
  });
};


function exportNoteToPDF(index) {
  const note = notes[index];

  const text = typeof note === "string" ? note : note.text;
  const date = typeof note === "string" ? "" : note.date;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  
  doc.setFontSize(16);
  doc.text("Note", 10, 15);

  
  if (date) {
    doc.setFontSize(10);
    doc.text(date, 10, 22);
  }

  
  doc.setFontSize(12);
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 10, 30);

  
  doc.save("note.pdf");
}
