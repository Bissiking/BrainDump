// public/app.js
const noteInput = document.querySelector("#note");
const preview = document.querySelector("#preview");
const notesContainer = document.querySelector("#notes");
const counter = document.querySelector("#counter");

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
}[char]));

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Erreur réseau");
  }
  return response.status === 204 ? null : response.json();
}

function typeBadgeClass(type = "") {
  const t = type.toLowerCase();
  if (t.includes("task") || t.includes("tâche")) return "badge-type-task";
  if (t.includes("idea") || t.includes("idée")) return "badge-type-idea";
  if (t.includes("reminder") || t.includes("rappel")) return "badge-type-reminder";
  if (t.includes("question")) return "badge-type-question";
  return "badge-default";
}

function priorityBadgeClass(priority = "") {
  const p = priority.toLowerCase();
  if (p.includes("high") || p.includes("haute") || p.includes("élevée")) return "badge-prio-high";
  if (p.includes("medium") || p.includes("moyenne")) return "badge-prio-medium";
  if (p.includes("low") || p.includes("basse")) return "badge-prio-low";
  return "badge-default";
}

function renderAnalysis(result) {
  preview.classList.remove("hidden");
  preview.innerHTML = `
    <span class="badge ${typeBadgeClass(result.type)}">${escapeHtml(result.type)}</span>
    &nbsp;<span class="badge ${priorityBadgeClass(result.priority)}">${escapeHtml(result.priority)}</span>
    &nbsp;· confiance ${result.confidence}%
    ${result.project ? ` · <strong>${escapeHtml(result.project)}</strong>` : ""}
    ${result.dueDate ? ` · 📅 ${new Date(result.dueDate).toLocaleString("fr-FR")}` : ""}
  `;
}

async function analyze() {
  const content = noteInput.value.trim();
  if (!content) return;
  try {
    renderAnalysis(await api("/api/analyze", { method: "POST", body: JSON.stringify({ content }) }));
  } catch (error) {
    alert(error.message);
  }
}

async function save() {
  const content = noteInput.value.trim();
  if (!content) return;
  try {
    await api("/api/notes", { method: "POST", body: JSON.stringify({ content }) });
    noteInput.value = "";
    preview.classList.add("hidden");
    await loadNotes();
  } catch (error) {
    alert(error.message);
  }
}

async function removeNote(id) {
  await api(`/api/notes/${id}`, { method: "DELETE" });
  await loadNotes();
}

async function loadNotes() {
  const notes = await api("/api/notes");
  counter.textContent = `${notes.length} note${notes.length > 1 ? "s" : ""}`;

  if (!notes.length) {
    notesContainer.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🧠</div>
        Le cerveau est vide. Profite, c'est rare.
      </div>`;
    return;
  }

  notesContainer.innerHTML = notes.map((note) => `
    <article class="note-card card">
      <div class="note-head">
        <div class="badges">
          <span class="badge ${typeBadgeClass(note.type)}">${escapeHtml(note.type)}</span>
          <span class="badge ${priorityBadgeClass(note.priority)}">${escapeHtml(note.priority)}</span>
          ${note.project ? `<span class="badge badge-default">${escapeHtml(note.project)}</span>` : ""}
        </div>
      </div>
      <p>${escapeHtml(note.content)}</p>
      <div class="note-footer">
        <div class="meta">
          <span>Confiance ${note.confidence}%</span>
          ${note.dueDate ? `<span>📅 ${new Date(note.dueDate).toLocaleString("fr-FR")}</span>` : ""}
          ${note.tags.map((tag) => `<span>#${escapeHtml(tag)}</span>`).join("")}
        </div>
        <button class="danger" data-delete="${note.id}">Supprimer</button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => removeNote(Number(button.dataset.delete)));
  });
}

document.querySelector("#analyze").addEventListener("click", analyze);
document.querySelector("#save").addEventListener("click", save);
noteInput.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") save();
});

loadNotes().catch((error) => alert(error.message));