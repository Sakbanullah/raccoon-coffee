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

/**
 * The middleware only checks that the auth cookie exists. An expired or stale
 * cookie passes it, so a 401 from the backend sends the admin back to login.
 * Skipped on the login page itself (a failed login also returns 401).
 */
function redirectOnUnauthorized(res: Response): Response {
  if (res.status !== 401 || typeof window === "undefined") return res;
  const { pathname } = window.location;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    window.location.href = "/admin/login";
  }
  return res;
}

async function send(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  return redirectOnUnauthorized(await fetch(input, init));
}

export function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  if (!MUTATING.has(method)) return send(input, init);
  const csrf = getCsrfToken();
  if (!csrf) return send(input, init);
  return send(input, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), "X-CSRF-Token": csrf },
  });
}
