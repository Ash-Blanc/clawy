// Fetches and caches Hermes docs at startup and refreshes every 10 minutes
let docsIndex: string = "";
let lastFetched = 0;
const TTL = 10 * 60 * 1000;

export async function getDocsIndex(): Promise<string> {
  const now = Date.now();
  if (docsIndex && now - lastFetched < TTL) return docsIndex;
  try {
    const res = await fetch("https://hermes-agent.nousresearch.com/docs/llms.txt", {
      headers: { "User-Agent": "HermesDocsAI/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      docsIndex = await res.text();
      lastFetched = now;
    }
  } catch {
    // keep stale if fetch fails
  }
  return docsIndex;
}

const pageCache = new Map<string, { content: string; at: number }>();

export async function fetchDocPage(url: string): Promise<string> {
  const now = Date.now();
  const hit = pageCache.get(url);
  if (hit && now - hit.at < TTL) return hit.content;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "HermesDocsAI/1.0", Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    // Strip scripts/styles/nav/footer, keep main content
    const content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 6000);
    pageCache.set(url, { content, at: now });
    return content;
  } catch {
    return "";
  }
}

// Extract relevant page URLs from the index for a given query
export function findRelevantUrls(index: string, query: string, max = 3): string[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const lines = index.split("\n");
  const scored: { url: string; score: number }[] = [];

  for (const line of lines) {
    const m = line.match(/\(https:\/\/hermes-agent\.nousresearch\.com\/docs[^)]+\)/);
    if (!m) continue;
    const url = m[0].slice(1, -1);
    const lower = line.toLowerCase();
    const score = words.reduce((s, w) => s + (lower.includes(w) ? 1 : 0), 0);
    if (score > 0) scored.push({ url, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.url);
}
