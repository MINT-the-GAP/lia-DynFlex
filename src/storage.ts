const PREFIX = "dynFlexWidths::";

export function saveWidths(key: string, widths: string[]): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(widths)); } catch (_) {}
}

export function loadWidths(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return null;
    // A corrupt or colliding key can yield non-strings; callers treat these as
    // CSS width values, so reject the whole entry rather than restoring junk.
    return data.every((w): w is string => typeof w === "string") ? data : null;
  } catch (_) {
    return null;
  }
}
