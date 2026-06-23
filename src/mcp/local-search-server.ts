import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
    { name: "local-search-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "search",
            description: "Search the web for real-time information",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query" }
                },
                required: ["query"]
            }
        }
    ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "search") {
        const query = request.params.arguments?.query as string;
        try {
            console.error(`[LocalMCP] Fetching DuckDuckGo Lite for query: ${query}`);
            
            const response = await fetch(`https://lite.duckduckgo.com/lite/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                body: `q=${encodeURIComponent(query)}`
            });
            const html = await response.text();
            
            // Extrair resultados usando Regex (para DuckDuckGo Lite)
            const results: string[] = [];
            // O duckduckgo lite usa <td class='result-snippet'>...</td>
            const regex = /class=["']result-snippet["'][^>]*>([\s\S]*?)<\/td>/gi;
            let match;
            while ((match = regex.exec(html)) !== null && results.length < 5) {
                // Remove as tags HTML do snippet
                const cleanText = match[1].replace(/<\/?[^>]+(>|$)/g, "").trim();
                if (cleanText) {
                    results.push(cleanText);
                }
            }
            
            const finalText = results.length > 0 
                ? results.join("\n\n") 
                : "No results found. The search engine might have blocked the request or changed layout.";

            return {
                content: [{ type: "text", text: finalText }]
            };
        } catch (e) {
            console.error(`[LocalMCP] Search error:`, e);
            return {
                content: [{ type: "text", text: `Error searching: ${e}` }]
            };
        }
    }
    throw new Error("Tool not found");
});

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[LocalMCP] Server is running on stdio");
}

run().catch(console.error);
