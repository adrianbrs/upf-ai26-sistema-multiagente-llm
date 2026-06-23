import { webSearchMcp } from '../mcp/web-search';
import { ollamaClient } from '../llm/ollama-client';

export interface QuantModifier {
    attack_modifier: number;
    defense_modifier: number;
    morale_modifier: number;
    reasoning: string;
}

export class QuantAgent {
    /**
     * Searches for news/sentiment and converts it into quantitative modifiers.
     * @param team Name of the soccer team
     */
    async analyzeSentiment(team: string): Promise<QuantModifier> {
        console.log(`[QuantAgent] Buscando notícias e sentimentos para o time: ${team}...`);
        
        // Use MCP to fetch subjective news (injuries, crises, climate)
        const searchQuery = `${team} seleção futebol notícias recentes lesões crise vestiário torcida 2026`;
        const searchResults = await webSearchMcp.search(searchQuery);

        const systemPrompt = `Você é um tradutor de sentimentos esportivos. Analise os resultados de notícias e traduza o sentimento atual do time em modificadores quantitativos (valores entre -0.5 e +0.5). 
        - ataque_modifier: lesões de atacantes (-), boa fase ofensiva (+)
        - defense_modifier: lesões de zagueiros (-), defesa sólida (+)
        - morale_modifier: crise/pressão (-), confiança/apoio da torcida (+)
        Responda APENAS com um objeto JSON no seguinte formato:
        { "attack_modifier": 0.1, "defense_modifier": -0.2, "morale_modifier": 0.05, "reasoning": "Explicação curta do motivo dos pesos" }`;

        const prompt = `Time: ${team}\n\nNotícias Recentes:\n${searchResults}\n\nGere os modificadores em JSON:`;

        console.log(`[QuantAgent] Processando sentimento de ${team} para JSON...`);
        
        try {
            // Utilize the JSON constrained generation
            const modifiers = await ollamaClient.generateJson(prompt, undefined, systemPrompt);
            return modifiers as QuantModifier;
        } catch (error) {
            console.error(`[QuantAgent] Falha ao extrair modificadores de ${team}. Retornando neutro.`, error);
            return {
                attack_modifier: 0,
                defense_modifier: 0,
                morale_modifier: 0,
                reasoning: "Falha na análise de sentimento, aplicando pesos neutros."
            };
        }
    }
}

export const quantAgent = new QuantAgent();
