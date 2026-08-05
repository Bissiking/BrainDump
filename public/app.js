import { apiRequest, logout, requireSession } from "/auth.js";

const elements = {
  note: document.querySelector("#note"),
  preview: document.querySelector("#preview"),
  notes: document.querySelector("#notes"),
  counter: document.querySelector("#counter"),
  topCounter: document.querySelector("#top-counter"),
  status: document.querySelector("#app-status"),
  analyze: document.querySelector("#analyze"),
  save: document.querySelector("#save"),
  characterCount: document.querySelector("#character-count"),
  logout: document.querySelector("#logout")
};

let analyzedContent = "";

const icons = {
  calendar: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3v3m10-3v3M3 8h14M4 5h12a1 1 0 0 1 1 1v10H3V6a1 1 0 0 1 1-1Z"/></svg>',
  folder: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h5l2 2h7v9H3V5Z"/></svg>',
  tag: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 10 7-7h6l1 1v6l-7 7-7-7Zm10-3h.01"/></svg>',
  trash: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 3h4l1 3H7l1-3Zm-2 3 1 11h6l1-11M8.5 9v5m3-5v5"/></svg>',
  spark: '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m10 2 1.2 3.8L15 7l-3.8 1.2L10 12 8.8 8.2 5 7l3.8-1.2L10 2Z"/></svg>'
};

const typeLabels = {
  bug: "Bug",
  task: "Tâche",
  idea: "Idée",
  reminder: "Rappel",
  information: "Information"
};

const priorityLabels = {
  low: "Basse",
  normal: "Normale",
  high: "Élevée",
  urgent: "Urgente"
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  })[character]);
}

function setStatus(message = "", tone = "error") {
  elements.status.textContent = message;
  elements.status.className = message ? `status ${tone}` : "status hidden";
}

function setButtonBusy(button, busy, busyLabel) {
  button.disabled = busy;
  button.setAttribute("aria-busy", String(busy));
  const label = button.querySelector("span");
  if (!button.dataset.label) button.dataset.label = label.textContent;
  label.textContent = busy ? busyLabel : button.dataset.label;
}

function formatDate(value, includeTime = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
    hour: includeTime ? "2-digit" : undefined,
    minute: includeTime ? "2-digit" : undefined
  }).format(date);
}

function renderAnalysis(result) {
  const type = typeLabels[result.type] ?? result.type;
  const priority = priorityLabels[result.priority] ?? result.priority;
  analyzedContent = elements.note.value.trim();
  elements.preview.classList.remove("hidden");
  elements.preview.innerHTML = `
    <div class="analysis-title">${icons.spark}<strong>Analyse rapide</strong><span>${escapeHtml(result.confidence)} % de confiance</span></div>
    <div class="analysis-items">
      <span class="chip chip-${escapeHtml(result.type)}">${escapeHtml(type)}</span>
      <span class="chip chip-${escapeHtml(result.priority)}">Priorité ${escapeHtml(priority.toLowerCase())}</span>
      ${result.project ? `<span class="analysis-meta">${icons.folder}${escapeHtml(result.project)}</span>` : ""}
      ${result.dueDate ? `<span class="analysis-meta">${icons.calendar}${escapeHtml(formatDate(result.dueDate, true))}</span>` : ""}
    </div>`;
}

async function analyze() {
  const content = elements.note.value.trim();
  if (content.length < 2) {
    setStatus("Écris au moins deux caractères avant d’analyser.");
    elements.note.focus();
    return;
  }

  setStatus();
  setButtonBusy(elements.analyze, true, "Analyse…");
  try {
    const result = await apiRequest("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ content })
    });
    renderAnalysis(result);
  } catch (error) {
    setStatus(error.message);
  } finally {
    setButtonBusy(elements.analyze, false);
  }
}

async function save() {
  const content = elements.note.value.trim();
  if (content.length < 2) {
    setStatus("Écris au moins deux caractères avant d’enregistrer.");
    elements.note.focus();
    return;
  }

  setStatus();
  setButtonBusy(elements.save, true, "Enregistrement…");
  try {
    await apiRequest("/api/notes", {
      method: "POST",
      body: JSON.stringify({ content })
    });
    elements.note.value = "";
    elements.preview.classList.add("hidden");
    elements.characterCount.textContent = "0 / 5 000";
    analyzedContent = "";
    await loadNotes();
    setStatus("La pensée est rangée.", "success");
    elements.note.focus();
  } catch (error) {
    setStatus(error.message);
  } finally {
    setButtonBusy(elements.save, false);
  }
}

async function removeNote(id, content) {
  const summary = content.length > 70 ? `${content.slice(0, 70)}…` : content;
  if (!window.confirm(`Supprimer définitivement « ${summary} » ?`)) return;

  try {
    await apiRequest(`/api/notes/${id}`, { method: "DELETE" });
    await loadNotes();
    setStatus("La note a été supprimée.", "success");
  } catch (error) {
    setStatus(error.message);
  }
}

function renderNote(note) {
  const type = typeLabels[note.type] ?? note.type;
  const priority = priorityLabels[note.priority] ?? note.priority;
  const tags = Array.isArray(note.tags) ? note.tags : [];
  const encodedContent = encodeURIComponent(note.content);

  return `
    <article class="note-card">
      <div class="note-topline">
        <div class="note-chips">
          <span class="chip chip-${escapeHtml(note.type)}">${escapeHtml(type)}</span>
          <span class="priority priority-${escapeHtml(note.priority)}"><i></i>${escapeHtml(priority)}</span>
        </div>
        <button class="icon-button delete-note" type="button" data-delete="${note.id}" data-content="${encodedContent}" aria-label="Supprimer cette note">
          ${icons.trash}
        </button>
      </div>
      <p class="note-content">${escapeHtml(note.content)}</p>
      <footer class="note-footer">
        ${note.project ? `<span>${icons.folder}${escapeHtml(note.project)}</span>` : ""}
        ${note.dueDate ? `<span>${icons.calendar}${escapeHtml(formatDate(note.dueDate))}</span>` : ""}
        ${tags.slice(0, 3).map((tag) => `<span>${icons.tag}${escapeHtml(tag)}</span>`).join("")}
        <time datetime="${escapeHtml(note.createdAt)}">${escapeHtml(formatDate(note.createdAt))}</time>
      </footer>
    </article>`;
}

async function loadNotes() {
  elements.notes.setAttribute("aria-busy", "true");
  try {
    const notes = await apiRequest("/api/notes");
    const countLabel = `${notes.length} note${notes.length > 1 ? "s" : ""}`;
    elements.counter.textContent = countLabel;
    elements.topCounter.textContent = countLabel;

    if (!notes.length) {
      elements.notes.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 4h13l5 5v19H7V4Zm13 0v6h6M11 16h10m-10 5h7"/></svg>
          <h3>Tout est calme ici.</h3>
          <p>Dépose ta première pensée dans le champ au-dessus.</p>
        </div>`;
      return;
    }

    elements.notes.innerHTML = notes.map(renderNote).join("");
    elements.notes.querySelectorAll("[data-delete]").forEach((button) => {
      button.addEventListener("click", () => removeNote(
        Number(button.dataset.delete),
        decodeURIComponent(button.dataset.content)
      ));
    });
  } catch (error) {
    elements.notes.innerHTML = `
      <div class="empty-state error-state">
        <h3>Les notes ne répondent pas.</h3>
        <p>${escapeHtml(error.message)}</p>
        <button class="button secondary" id="retry-notes" type="button">Réessayer</button>
      </div>`;
    document.querySelector("#retry-notes")?.addEventListener("click", loadNotes);
  } finally {
    elements.notes.setAttribute("aria-busy", "false");
  }
}

function showUser(user) {
  const name = user.displayName || user.username;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  document.querySelector("#user-avatar").textContent = initials;
  document.querySelector("#user-name").textContent = name;
  document.querySelector("#popover-name").textContent = name;
  document.querySelector("#popover-username").textContent = `@${user.username}`;
}

elements.analyze.addEventListener("click", analyze);
elements.save.addEventListener("click", save);
elements.logout.addEventListener("click", async () => {
  setButtonBusy(elements.logout, true, "Déconnexion…");
  try {
    await logout();
  } catch (error) {
    setStatus(error.message);
    setButtonBusy(elements.logout, false);
  }
});
elements.note.addEventListener("input", () => {
  elements.characterCount.textContent = `${elements.note.value.length.toLocaleString("fr-FR")} / 5 000`;
  setStatus();
  if (analyzedContent && elements.note.value.trim() !== analyzedContent) {
    elements.preview.classList.add("hidden");
  }
});
elements.note.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    save();
  }
});

try {
  const user = await requireSession();
  if (user) {
    showUser(user);
    await loadNotes();
  }
} catch (error) {
  setStatus("Impossible de vérifier ta session. Recharge la page pour réessayer.");
}
