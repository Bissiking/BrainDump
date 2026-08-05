import { getSession } from "/auth.js";

const errorMessages = {
  cancelled: "La connexion Kyros a été annulée. Tu peux réessayer quand tu veux.",
  expired: "La demande de connexion a expiré. Relance-la pour continuer.",
  missing_code: "Kyros n’a pas renvoyé le code attendu. Relance la connexion.",
  provider: "Kyros n’a pas pu terminer la connexion. Vérifie sa disponibilité puis réessaie.",
  session: "Ta session a expiré. Reconnecte-toi pour retrouver tes notes."
};

const errorCode = new URLSearchParams(window.location.search).get("error");
const errorElement = document.querySelector("#login-error");
if (errorCode) {
  errorElement.textContent = errorMessages[errorCode] ?? "La connexion n’a pas abouti. Réessaie.";
  errorElement.classList.remove("hidden");
}

try {
  const session = await getSession();
  if (session.authenticated) window.location.replace("/");
} catch {
  if (!errorCode) {
    errorElement.textContent = "Impossible de joindre BrainDump pour le moment. Recharge la page avant de te connecter.";
    errorElement.classList.remove("hidden");
  }
}
