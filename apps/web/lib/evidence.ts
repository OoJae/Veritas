// Evidence URL validation for Simple-mode verdicts.
//
// Simple mode runs the LLM Parse Website agent, which scrapes or searches a web
// page. It needs a real, reachable HTML page. Empty URLs and raw JSON API
// endpoints make the agent fail or time out (every failed verdict on testnet so
// far had either no URL or a JSON API URL), so we guard against both here.

/// Returns true when the string is a syntactically valid http(s) URL.
export function isScrapeableUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/// Heuristic: flags raw JSON API endpoints, which Parse Website struggles with.
/// Used for a soft warning, not a hard block, since it can have false positives.
export function looksLikeRawApi(value: string): boolean {
  const trimmed = value.trim();
  if (!isScrapeableUrl(trimmed)) return false;
  try {
    const url = new URL(trimmed);
    if (url.hostname.startsWith("api.")) return true;
    if (url.pathname.includes("/api/")) return true;
    if (url.pathname.endsWith(".json")) return true;
    return false;
  } catch {
    return false;
  }
}
