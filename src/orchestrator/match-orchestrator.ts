import { statsAgent } from '../agents/stats-agent';
import { quantAgent } from '../agents/quant-agent';
import { predictAgent } from '../agents/predict-agent';
import { vectorStore } from '../rag/vector-store';

export class MatchOrchestrator {
    /**
     * Executes the full multi-agent pipeline for a soccer match prediction.
     */
    async runPipeline(team1: string, team2: string) {
        console.log(`\n======================================================`);
        console.log(`Iniciando Análise Multiagente: ${team1} vs ${team2}`);
        console.log(`======================================================\n`);

        try {
            // Step 1: Gather Stats for Team 1
            console.log(`\n--- [1] Agente de Estatísticas ---`);
            const team1Stats = await statsAgent.gatherStats(team1);
            console.log(`\n> Estatísticas resumidas de ${team1}:\n${team1Stats}\n`);

            // Step 2: Gather Sentiment/Modifiers for Team 1
            console.log(`\n--- [2] Agente Quantificador de Sentimentos ---`);
            const team1Mods = await quantAgent.analyzeSentiment(team1);
            console.log(`\n> Modificadores de ${team1}:`, team1Mods, `\n`);

            // Step 3: Gather Stats for Team 2
            console.log(`\n--- [3] Agente de Estatísticas ---`);
            const team2Stats = await statsAgent.gatherStats(team2);
            console.log(`\n> Estatísticas resumidas de ${team2}:\n${team2Stats}\n`);

            // Step 4: Gather Sentiment/Modifiers for Team 2
            console.log(`\n--- [4] Agente Quantificador de Sentimentos ---`);
            const team2Mods = await quantAgent.analyzeSentiment(team2);
            console.log(`\n> Modificadores de ${team2}:`, team2Mods, `\n`);

            // Step 5: Retrieve context from Vector DB (RAG)
            console.log(`\n--- [5] RAG (Recuperação de Contexto) ---`);
            const ragQuery = `${team1} vs ${team2} histórico de confrontos retrospecto`;
            const ragContext = await vectorStore.query(ragQuery, 2);
            if (ragContext && ragContext.length > 0) {
                console.log(`> Contexto recuperado da base vetorial local.`);
                console.log(`> Contexto: \n`, ragContext.join('\n'));
            } else {
                console.log(`> Nenhum contexto prévio encontrado no histórico.`);
            }

            // Step 6: Final Prediction
            console.log(`\n--- [6] Agente Preditor Analista ---`);
            const prediction = await predictAgent.predict(
                team1, team1Stats, team1Mods,
                team2, team2Stats, team2Mods,
                ragContext
            );

            console.log(`\n======================================================`);
            console.log(`RESULTADO FINAL DA PREVISÃO`);
            console.log(`======================================================\n`);
            console.log(prediction);

            // Step 7: Save summary to RAG for future matches
            console.log(`\n[Salvando sumário desta partida no Vector Store para consultas futuras...]`);
            const docId = `match_${Date.now()}_${team1}_${team2}`;
            const docText = `Histórico de análise da partida: ${team1} vs ${team2}.\nPrevisão gerada:\n${prediction}`;
            await vectorStore.addDocument(docId, docText, { team1, team2, type: "match_analysis" });

        } catch (error) {
            console.error("\n[Erro Crítico no Pipeline]:", error);
        }
    }
}

export const matchOrchestrator = new MatchOrchestrator();
