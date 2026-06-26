import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class LocalMCPClient {
    private client: Client;
    private transport: StdioClientTransport;
    private initialized: boolean = false;

    constructor() {
        this.client = new Client(
            {
                name: "multiagent-mcp-client",
                version: "1.0.0",
            },
            {
                capabilities: {}
            }
        );

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
            console.log("[LocalMCPClient] Connected successfully.");
        } catch (error) {
            console.error("[LocalMCPClient] Failed to connect:", error);
            throw error;
        }
    }

    async listTools() {
        if (!this.initialized) await this.init();
        return await this.client.listTools();
    }

    async callTool(name: string, args: any): Promise<string> {
        if (!this.initialized) await this.init();

        try {
            const response = await this.client.callTool({
                name,
                arguments: args
            });

            if (response.content && Array.isArray(response.content) && response.content.length > 0) {
                return response.content.map((c: any) => c.text).join("\n");
            }
            return "No output from tool.";
        } catch (error) {
            console.error(`[LocalMCPClient] Error calling tool ${name}:`, error);
            return `Erro ao executar tool: ${error}`;
        }
    }

    async close() {
        if (this.initialized) {
            await this.transport.close();
        }
    }
}

export const mcpClient = new LocalMCPClient();
