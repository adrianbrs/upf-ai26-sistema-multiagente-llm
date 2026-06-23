import { ollamaClient } from '../llm/ollama-client';
import { QuantModifier } from './quant-agent';

export class PredictAgent {
    /**
     * Generates the final prediction based on stats, modifiers and RAG context.
     */
    async predict(
        team1: string, 
        team1Stats: string, 
        team1Mods: QuantModifier, 
        team2: string, 
        team2Stats: string, 
        team2Mods: QuantModifier,
        ragContext: string[] = []
    ): Promise<string> {
        console.log(`[PredictAgent] Consolidando dados e gerando previsão para ${team1} vs ${team2}...`);

        const systemPrompt = `Você é um analista mestre de previsões de futebol. Sua tarefa é analisar o embate entre dois times com base nos dados brutos, contexto subjetivo (modificadores) e dados históricos (se houver).
        Você deve gerar um prognóstico da partida e terminar sua resposta OBVIAMENTE listando os 3 palpites finais (ex: placares ou cenários de vitória/empate), do MAIOR probabilidade para a MENOR probabilidade.`;

        let contextSection = '';
        if (ragContext && ragContext.length > 0) {
            contextSection = `\nContexto Histórico Recuperado (RAG):\n${ragContext.join("\n")}\n`;
        }

        const prompt = `
        Partida: ${team1} vs ${team2}

        [${team1}]
        Estatísticas: ${team1Stats}
        Análise de Sentimento: Ataque(${team1Mods.attack_modifier}), Defesa(${team1Mods.defense_modifier}), Moral(${team1Mods.morale_modifier})
        Motivo: ${team1Mods.reasoning}

        [${team2}]
        Estatísticas: ${team2Stats}
        Análise de Sentimento: Ataque(${team2Mods.attack_modifier}), Defesa(${team2Mods.defense_modifier}), Moral(${team2Mods.morale_modifier})
        Motivo: ${team2Mods.reasoning}
        ${contextSection}
        Por favor, faça sua análise tática completa e finalize com 3 palpites de resultados em ordem de probabilidade.
        `;

        const prediction = await ollamaClient.generate(prompt, undefined, systemPrompt);
        return prediction;
    }
}

export const predictAgent = new PredictAgent();
