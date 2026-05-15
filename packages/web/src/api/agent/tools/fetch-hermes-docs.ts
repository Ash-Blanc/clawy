import { tool } from "ai";
import { z } from "zod";

// Cache docs for 5 minutes to avoid hammering the server
let cachedDocs: { content: string; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchDocsIndex(): Promise<string> {
  const now = Date.now();
  if (cachedDocs && now - cachedDocs.fetchedAt < CACHE_TTL) {
    return cachedDocs.content;
  }
  const res = await fetch("https://hermes-agent.nousresearch.com/docs/llms.txt", {
    headers: { "User-Agent": "HermesDocsAI/1.0" },
  });
  if (!res.ok) throw new Error(`Failed to fetch docs index: ${res.status}`);
  const content = await res.text();
  cachedDocs = { content, fetchedAt: now };
  return content;
}

// Cache for specific doc pages
const pageCache = new Map<string, { content: string; fetchedAt: number }>();

async function fetchDocPage(url: string): Promise<string> {
  const now = Date.now();
  const cached = pageCache.get(url);
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached.content;
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "HermersDocsAI/1.0", Accept: "text/html,text/plain" },
  });
  if (!res.ok) return `Failed to fetch ${url}: ${res.status}`;
  // Extract text from the page (simplified - get raw text)
  const text = await res.text();
  // Strip HTML tags naively for cleaner content
  const stripped = text
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 8000); // Limit per page
  pageCache.set(url, { content: stripped, fetchedAt: now });
  return stripped;
}

export const fetchHermesDocsTool = tool({
  description:
    "Fetches the latest Hermes Agent documentation. Use this tool BEFORE answering any question about Hermes Agent. It returns the live docs index with all available pages. You can also fetch specific pages for deeper content. Always call this first to ensure answers are grounded in current docs.",
  inputSchema: z.object({
    query: z.string().describe("The user's question or topic to find docs for"),
    fetchPages: z
      .array(z.string())
      .optional()
      .describe(
        "Specific doc page URLs to fetch for detailed content. Leave empty to just get the index."
      ),
  }),
  async execute({ query, fetchPages }) {
    try {
      const index = await fetchDocsIndex();

      // Find relevant doc URLs from the index based on query keywords
      const queryLower = query.toLowerCase();
      const lines = index.split("\n");
      const relevantLinks: string[] = [];

      for (const line of lines) {
        const urlMatch = line.match(/https:\/\/hermes-agent\.nousresearch\.com\/docs[^\s)]+/);
        if (!urlMatch) continue;
        const url = urlMatch[0];
        const lineLower = line.toLowerCase();
        // Check if line is relevant to the query
        const keywords = queryLower.split(/\s+/).filter((w) => w.length > 3);
        if (keywords.some((kw) => lineLower.includes(kw))) {
          relevantLinks.push(url);
        }
      }

      let result = `## Hermes Agent Docs Index (Live)\n\n${index.slice(0, 4000)}\n\n`;

      // Fetch specific pages if requested or auto-detected
      const pagesToFetch = fetchPages?.length
        ? fetchPages
        : relevantLinks.slice(0, 3);

      if (pagesToFetch.length > 0) {
        result += `\n## Detailed Content from Relevant Pages\n\n`;
        for (const url of pagesToFetch.slice(0, 3)) {
          const content = await fetchDocPage(url);
          result += `### ${url}\n${content}\n\n`;
        }
      }

      return { success: true, content: result, relevantLinks };
    } catch (err) {
      return {
        success: false,
        content: `Error fetching docs: ${err instanceof Error ? err.message : String(err)}`,
        relevantLinks: [],
      };
    }
  },
});
