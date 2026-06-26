import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractRelevantContext } from '../../utils/fuzzy-search.js';

export function registerScrapeUrlTool(server: McpServer) {
    server.registerTool(
        "scrape_url",
        {
            description: "Fetches a URL and extracts clean text from the HTML using Puppeteer. Works for both static and dynamic/JS-heavy sites.",
            inputSchema: z.object({
                url: z.string().describe("URL to scrape"),
                searchQuery: z.string().optional().describe("Optional string to fuzzy search within the text (e.g. team name). Will extract relevant blocks if the page is too large.")
            })
        },
        async ({ url, searchQuery }) => {
            let browser;
            try {
                console.error(`[ScrapeTool] Scraping URL: ${url}`);

                browser = await puppeteer.launch({
                    headless: true,
                    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
                });

                const page = await browser.newPage();

                // Masquerade as a real browser
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

                await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

                const html = await page.content();

                // Clean up with Cheerio
                const $ = cheerio.load(html);
                $('script, style, noscript, iframe, img, svg').remove();

                let text = $('body').text().replace(/\s+/g, ' ').trim();

                // Use fuzzy search logic to extract relevant context if text is too large
                // Limiting to 4000 characters to prevent overwhelming the local LLM context window
                text = extractRelevantContext(text, searchQuery, 4000);

                return {
                    content: [{ type: "text", text: text || "No text could be extracted." }]
                };
            } catch (e) {
                console.error(`[ScrapeTool] Error:`, e);
                return {
                    content: [{ type: "text", text: `Error scraping URL: ${e}` }]
                };
            } finally {
                if (browser) {
                    await browser.close();
                }
            }
        }
    );
}
