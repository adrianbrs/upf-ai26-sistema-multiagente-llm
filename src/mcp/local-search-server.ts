import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerSearchTool } from "./tools/search.js";
import { registerScrapeDynamicTool } from "./tools/scrape-dynamic.js";
import { registerStatsbombTool } from "./tools/statsbomb.js";
import { registerMatchesTool } from "./tools/matches.js";

const server = new McpServer({ name: "local-search-mcp", version: "1.0.0" });

registerSearchTool(server);
registerScrapeDynamicTool(server);
registerStatsbombTool(server);
registerMatchesTool(server);

async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[LocalMCP] Server is running on stdio with McpServer");
}

run().catch(console.error);
