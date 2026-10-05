// public/integrations.js
const $ = (selector) => document.querySelector(selector);
let busy = false;
async function request(url, method = "GET", body) {
  const r = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await r.json();
  if (!r.ok) throw Error(payload.error || "Connexion indisponible.");
  return payload;
}
function message(selector, value) {
  $(selector).textContent = value;
  $(selector).hidden = !value;
}
async function run(fn) {
  if (busy) return;
  busy = true;
  document.querySelectorAll("button").forEach((b) => (b.disabled = true));
  message("#error", "");
  message("#notice", "");
  try {
    await fn();
  } catch (e) {
    message("#error", e.message);
  } finally {
    busy = false;
    document.querySelectorAll("button").forEach((b) => (b.disabled = false));
  }
}
function credentials(data) {
  $("#client-id").value = data.client_id;
  $("#api-key").value = data.api_key;
  $("#credentials").hidden = false;
}
function row(item, kind) {
  const article = document.createElement("article");
  article.className = "integration-row";
  const title = document.createElement("strong");
  title.textContent = item.name;
  const detail = document.createElement("p");
  detail.textContent = item.redirect_uri;
  const actions = document.createElement("div");
  actions.className = "integration-actions";
  function button(label, fn, danger = false) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.className = "text-action" + (danger ? " danger" : "");
    b.onclick = () => void run(fn);
    actions.append(b);
  }
  if (kind === "clients")
    button("Changer la clé", async () => {
      if (
        !confirm(
          "Changer la clé et retirer toutes les autorisations de cette application ?",
        )
      )
        return;
      credentials(
        await request(
          `/api/integrations/clients/${item.id}/rotate`,
          "POST",
          {},
        ),
      );
      await load();
    });
  button(
    kind === "clients"
      ? "Révoquer l’application"
      : "Retirer l’accès à mes notes",
    async () => {
      if (
        !confirm(
          "Retirer cet accès ? Vos notes sont conservées dans BrainDump.",
        )
      )
        return;
      await request(`/api/integrations/${kind}/${item.id}`, "DELETE");
      $("#api-key").value = "";
      $("#credentials").hidden = true;
      await load();
      message("#notice", "Accès retiré.");
    },
    true,
  );
  article.append(title, detail, actions);
  return article;
}
async function load() {
  const result = await request("/api/integrations/clients");
  for (const kind of ["clients", "grants"]) {
    const list = $("#" + kind);
    list.replaceChildren(
      ...result[kind === "clients" ? "data" : "grants"].map((item) =>
        row(item, kind),
      ),
    );
    if (!list.children.length)
      list.textContent =
        kind === "clients"
          ? "Aucune application configurée."
          : "Aucune application autorisée à lire vos notes.";
    list.setAttribute("aria-busy", "false");
  }
}
$("#client-form").onsubmit = (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  void run(async () => {
    credentials(
      await request("/api/integrations/clients", "POST", Object.fromEntries(f)),
    );
    await load();
    message("#notice", "Application créée. Reportez sa clé dans Liora.");
  });
};
$("#copy-key").onclick = () =>
  void navigator.clipboard
    .writeText($("#api-key").value)
    .then(() => message("#notice", "Clé copiée."))
    .catch(() =>
      message("#error", "Sélectionnez la clé et copiez-la manuellement."),
    );
$("#hide-key").onclick = () => {
  $("#api-key").value = "";
  $("#credentials").hidden = true;
};
void load().catch((e) => message("#error", e.message));
