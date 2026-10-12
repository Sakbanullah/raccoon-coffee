/**
 * @db.Time() fields are stored as a Date on 1970-01-01 UTC. The public API
 * exposes them as "HH:mm" strings. Use UTC getters/setters so a value like
 * 19:30 UTC round-trips as "19:30" regardless of the server timezone.
 */

/** Prisma Date -> "HH:mm" (or null if missing/invalid). */
export function formatTime(date: Date | string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const minutes = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** "HH:mm" (or "HH:mm:ss") -> 1970-01-01 UTC Date for @db.Time(). */
export function parseTime(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (match) {
    return new Date(Date.UTC(1970, 0, 1, Number(match[1]), Number(match[2]), Number(match[3] ?? 0)));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** "YYYY-MM-DD" -> 1970-01-01 UTC Date for @db.Date(). */
export function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      return undefined;
    }
    return date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Prisma Date -> "YYYY-MM-DD" (or null if missing/invalid). */
export function formatDate(date: Date | string | null | undefined): string | null {
  if (!date) {
    return null;
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}