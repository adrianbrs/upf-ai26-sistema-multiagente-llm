import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * Handles integration with the web-search-mcp server.
 * It uses the MCP SDK to connect to a local execution via npx.
 */
export class WebSearchMCP {
    private client: Client;
    private transport: StdioClientTransport;
    private initialized: boolean = false;

    constructor() {
        this.client = new Client(
            {
                name: "multiagent-search-client",
                version: "1.0.0",
            },
            {
                capabilities: {}
            }
        );

        // We use our own local MCP server
        this.transport = new StdioClientTransport({
            command: "npx",
            args: ["tsx", "src/mcp/local-search-server.ts"],
            env: process.env as Record<string, string>
        });
    }

    async init() {
        if (this.initialized) return;
        try {
            await this.client.connect(this.transport);
            this.initialized = true;
            console.log("[WebSearchMCP] Connected successfully.");
        } catch (error) {
            console.error("[WebSearchMCP] Failed to connect:", error);
            throw error;
        }
    }

    /**
     * Performs a web search using the connected MCP server.
     * Assuming the MCP server exposes a tool called 'search' or similar.
     */
    async search(query: string): Promise<string> {
        if (!this.initialized) {
            await this.init();
        }

        try {
            // First list tools to find the exact name (usually search or search_web)
            const toolsResult = await this.client.listTools();
            const searchTool = toolsResult.tools.find(t => t.name.includes("search"));

            if (!searchTool) {
                throw new Error("Search tool not found on MCP server.");
            }

            const response = await this.client.callTool({
                name: searchTool.name,
                arguments: {
                    query: query
                }
            });

            // Parse response correctly based on MCP spec
            if (response.content && Array.isArray(response.content) && response.content.length > 0) {
                return response.content.map((c: any) => c.text).join("\n");
            }

            return "Nenhum resultado encontrado.";
        } catch (error) {
            console.error("[WebSearchMCP] Error performing search:", error);
            return `Erro na busca: ${error}`;
        }
    }

    async close() {
        if (this.initialized) {
            await this.transport.close();
        }
    }
}

export const webSearchMcp = new WebSearchMCP();
