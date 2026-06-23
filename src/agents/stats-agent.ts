import { webSearchMcp } from '../mcp/web-search';
import { ollamaClient } from '../llm/ollama-client';

export class StatsAgent {
    /**
     * Gathers quantitative and statistical data for a given team.
     * @param team Name of the soccer team
     * @returns A string summarizing the statistics
     */
    async gatherStats(team: string): Promise<string> {
        console.log(`[StatsAgent] Buscando estatísticas para o time: ${team}...`);
        
        // Use MCP Web Search to fetch recent data
        const searchQuery = `${team} seleção futebol estatísticas gols posse de bola 2026 recentes`;
        const searchResults = await webSearchMcp.search(searchQuery);

        // Summarize and structure the stats using the LLM
        const systemPrompt = `Você é um analista de dados esportivos. Extraia e resuma as estatísticas puras de futebol do texto fornecido (focando em gols, vitórias, posse de bola, histórico recente). Não adicione sentimentos ou opiniões, apenas fatos numéricos. Se a busca retornar dados irrelevantes, faça o seu melhor com base no que encontrar.`;
        
        const prompt = `Time: ${team}\n\nResultados da Web:\n${searchResults}\n\nGere um resumo estruturado das estatísticas:`;

        console.log(`[StatsAgent] Processando estatísticas de ${team} com Ollama...`);
        const statsSummary = await ollamaClient.generate(prompt, undefined, systemPrompt);

        return statsSummary;
    }
}

export const statsAgent = new StatsAgent();
