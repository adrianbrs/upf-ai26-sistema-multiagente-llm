import { mcpClient } from '../mcp/web-search.js';
import { ollamaClient } from '../llm/ollama-client.js';

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
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleDateString('pt-BR');

        // Use MCP to fetch subjective news (injuries, crises, climate)
        const searchQuery = `${team} seleção futebol notícias recentes lesões crise vestiário torcida ${currentYear}`;
        const searchResults = await mcpClient.callTool("search", { query: searchQuery });

        const systemPrompt = `Você é um tradutor de sentimentos esportivos. Analise os resultados de notícias e traduza o sentimento atual do time em modificadores quantitativos (valores entre -0.5 e +0.5). 
        
        ATENÇÃO À DATA: A data de hoje é ${currentDate}. Verifique as datas e os contextos das notícias encontradas e COMPARE com a data de hoje. 
        - É OBRIGATÓRIO focar estritamente na situação ATUAL do time. 
        - Ignore completamente notícias antigas, de anos anteriores ou sobre eventos que já passaram/foram resolvidos.
        
        - attack_modifier: lesões de atacantes atuais (-), boa fase ofensiva recente (+)
        - defense_modifier: lesões de zagueiros atuais (-), defesa sólida recente (+)
        - morale_modifier: crise/pressão atual (-), confiança/apoio da torcida atual (+)
        Responda APENAS com um objeto JSON no seguinte formato:
        { "attack_modifier": 0.1, "defense_modifier": -0.2, "morale_modifier": 0.05, "reasoning": "Explicação curta do motivo dos pesos, justificando com base APENAS em notícias atualizadas." }`;

        const prompt = `Data de hoje: ${currentDate}\n\nTime: ${team}\n\nNotícias Encontradas:\n${searchResults}\n\nGere os modificadores em JSON considerando apenas as notícias recentes:`;

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
