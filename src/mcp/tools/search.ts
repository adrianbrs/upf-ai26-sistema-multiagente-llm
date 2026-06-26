import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export enum SearchProvider {
    GOOGLE = 'google',
    BING = 'bing',
    DUCKDUCKGO = 'duckduckgo'
}

export function registerSearchTool(server: McpServer) {
    server.registerTool(
        "search",
        {
            description: "Search the web using different providers (google, bing, duckduckgo). Returns snippets and URLs.",
            inputSchema: z.object({
                query: z.string().describe("Search query"),
                provider: z.enum(SearchProvider).optional().default(SearchProvider.DUCKDUCKGO).describe("Provider: google, bing, or duckduckgo (default)")
            })
        },
        async ({ provider, query }) => {
            let browser;

            try {
                console.error(`[SearchTool] Searching ${provider} for: ${query}`);

                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });

                const page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                let results: { title: string, url: string, snippet: string }[] = [];

                if (provider === SearchProvider.GOOGLE) {
                    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
                    const html = await page.content();
                    const $ = cheerio.load(html);

                    $('.tF2Cxc').each((i, el) => {
                        const title = $(el).find('h3').text();
                        const url = $(el).find('a').attr('href') || '';
                        const snippet = $(el).find('.VwiC3b').text();
                        if (title && url) results.push({ title, url, snippet });
                    });
                } else if (provider === SearchProvider.BING) {
                    await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
                    const html = await page.content();
                    const $ = cheerio.load(html);

                    $('.b_algo').each((i, el) => {
                        const title = $(el).find('h2 a').text();
                        const url = $(el).find('h2 a').attr('href') || '';
                        const snippet = $(el).find('.b_caption p').text();
                        if (title && url) results.push({ title, url, snippet });
                    });
                } else {
                    // DuckDuckGo html version (no JS required usually, but puppeteer bypasses anti-bot easily)
                    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2' });
                    const html = await page.content();
                    const $ = cheerio.load(html);

                    $('.result').each((i, el) => {
                        const title = $(el).find('.result__title .result__a').text();
                        const url = $(el).find('.result__title .result__a').attr('href') || '';
                        const snippet = $(el).find('.result__snippet').text();

                        // duckduckgo URLs are often redirected like //duckduckgo.com/l/?uddg=...
                        let cleanUrl = url;
                        if (url.includes('uddg=')) {
                            const urlParams = new URLSearchParams(url.split('?')[1]);
                            const decoded = urlParams.get('uddg');
                            if (decoded) cleanUrl = decodeURIComponent(decoded);
                        }

                        if (title && cleanUrl) results.push({ title, url: cleanUrl, snippet });
                    });
                }

                // Format the output
                if (results.length === 0) {
                    return {
                        content: [{ type: "text", text: "No results found. The search provider might have blocked the request or changed layout." }]
                    };
                }

                const formatted = results.slice(0, 5).map((r, i) =>
                    `${i + 1}. ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}\n`
                ).join('\n');

                return {
                    content: [{ type: "text", text: formatted }]
                };
            } catch (e) {
                console.error(`[SearchTool] Error:`, e);
                return {
                    content: [{ type: "text", text: `Error searching: ${e}` }]
                };
            } finally {
                if (browser) {
                    await browser.close();
                }
            }
        }
    );
}
