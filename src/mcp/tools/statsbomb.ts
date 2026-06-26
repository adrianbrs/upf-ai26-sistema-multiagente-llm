import { z } from 'zod';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractRelevantContext } from '../../utils/fuzzy-search.js';

const fileCache = new Map<string, string>();

export function registerStatsbombTool(server: McpServer) {
    server.registerTool(
        "statsbomb_query",
        {
            description: "Fetch data from StatsBomb Open Data GitHub repository. Allowed paths: competitions.json, matches/{competition_id}/{season_id}.json, events/{match_id}.json, lineups/{match_id}.json. ALL SEARCH QUERIES AND TEAM NAMES MUST BE IN ENGLISH.",
            inputSchema: z.object({
                path: z.string().describe("Path to fetch (e.g. 'competitions.json' or 'matches/43/106.json' or 'events/3869685.json')"),
                searchQuery: z.string().optional().describe("Optional string to fuzzy search within the text (e.g. team name IN ENGLISH). Will extract relevant blocks if the page is too large."),
                offset: z.number().optional().describe("Initial line to start reading (for pagination). Use to read large files in chunks."),
                limit: z.number().optional().describe("Number of lines to read (for pagination). Defaults to 500.")
            })
        },
        async ({ path, searchQuery, offset, limit }) => {
            try {
                const baseUrl = "https://raw.githubusercontent.com/statsbomb/open-data/master/data/";
                const fullUrl = `${baseUrl}${path}`;
                
                let text: string;
                if (fileCache.has(fullUrl)) {
                    console.error(`[StatsBomb] Fetching from cache: ${fullUrl}`);
                    text = fileCache.get(fullUrl)!;
                } else {
                    console.error(`[StatsBomb] Fetching from network: ${fullUrl}`);
                    const response = await fetch(fullUrl);

                    if (!response.ok) {
                        return { content: [{ type: "text", text: `Error: StatsBomb API returned ${response.status} for ${path}` }] };
                    }

                    text = await response.text();

                    // Garante que seja pretty JSON para paginação baseada em linhas funcionar bem
                    try {
                        const data = JSON.parse(text);
                        text = JSON.stringify(data, null, 2);
                    } catch(e) {}
                    
                    fileCache.set(fullUrl, text);
                }

                // Pagination logic
                if (offset !== undefined || limit !== undefined) {
                    const lines = text.split('\n');
                    const safeOffset = offset || 0;
                    const safeLimit = limit || 500;
                    const paginatedLines = lines.slice(safeOffset, safeOffset + safeLimit);
                    
                    const linesBefore = safeOffset;
                    const linesAfter = Math.max(0, lines.length - (safeOffset + paginatedLines.length));
                    
                    let result = "";
                    if (linesBefore > 0) result += `...[TRUNCATED: ${linesBefore} lines before]...\n`;
                    result += paginatedLines.join('\n');
                    if (linesAfter > 0) result += `\n...[TRUNCATED: ${linesAfter} lines after]...`;
                    
                    return { content: [{ type: "text", text: result }] };
                }

                const totalLines = text.split('\n').length;
                // Use fuzzy search logic to extract relevant context if text is too large
                // Limiting to 4000 characters to prevent overwhelming the local LLM context window
                text = extractRelevantContext(text, searchQuery, 4000);
                
                text += `\n\n[INFO] The original file has ${totalLines} lines in total. Se a busca falhou ou está incompleta, use 'offset' e 'limit' para paginar o arquivo.`;

                return {
                    content: [{ type: "text", text: text }]
                };
            } catch (e) {
                return {
                    content: [{ type: "text", text: `Error fetching StatsBomb data: ${e}` }]
                };
            }
        }
    );
}
