import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { findTeamMatches } from "../../db/match-index.js";

export function registerMatchesTool(server: McpServer) {
    server.registerTool(
        "find_team_matches",
        {
            description: "Encontra rapidamente todos os IDs de partidas (matches) para um determinado time no banco local do StatsBomb. Use esta ferramenta ao invés de paginar/vasculhar competitions.json e matches.json.",
            inputSchema: z.object({
                teamName: z.string().describe("O nome do time (ex: 'Brazil', 'Arsenal'). Maiúsculas e minúsculas não importam.")
            })
        },
        async ({ teamName }) => {
            try {
                const matches = findTeamMatches(teamName);
                return { content: [{ type: "text", text: JSON.stringify({ teamName, matches }, null, 2) }] };
            } catch (error) {
                return { content: [{ type: "text", text: JSON.stringify({ teamName, error }, null, 2) }] };
            }
        }
    );
}
