const PREFIX = "dynFlexWidths::";

export function saveWidths(key: string, widths: string[]): void {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(widths)); } catch (_) {}
}

export function loadWidths(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : null;
  } catch (_) {
    return null;
  }
}
