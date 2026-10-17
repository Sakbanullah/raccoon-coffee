/**
 * CSRF-aware fetch for state-changing admin API calls.
 *
 * The backend sets a readable `raccoon_csrf` cookie at login (double-submit
 * pattern). Every non-GET request that relies on the auth cookie must echo the
 * cookie value in an `X-CSRF-Token` header, or the JwtAuthGuard rejects it
 * with 403. GET requests and unauthenticated routes (login, public upload)
 * do not need the header, but sending it is harmless.
 */
export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith("raccoon_csrf="));
  return match ? decodeURIComponent(match.slice("raccoon_csrf=".length)) : null;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (!MUTATING.has(method)) return fetch(input, init);
  const csrf = getCsrfToken();
  if (!csrf) return fetch(input, init);
  return fetch(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), "X-CSRF-Token": csrf },
  });
}
