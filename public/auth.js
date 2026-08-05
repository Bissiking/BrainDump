export async function getSession() {
  const response = await fetch("/api/session", {
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error("Impossible de vérifier la session.");
  return response.json();
}

export async function requireSession() {
  const session = await getSession();
  if (!session.authenticated || !session.user) {
    window.location.replace("/login");
    return null;
  }
  return session.user;
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
    headers: { accept: "application/json" }
  });
  if (!response.ok) throw new Error("La déconnexion a échoué.");
  window.location.replace("/login");
}

export async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (options.body) headers.set("content-type", "application/json");

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    window.location.replace("/login?error=session");
    throw new Error("Ta session a expiré.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "La requête a échoué.");
  }
  return response.status === 204 ? null : response.json();
}
