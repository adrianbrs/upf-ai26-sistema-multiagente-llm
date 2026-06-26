import { mcpClient } from '../mcp/web-search.js';
import { ollamaClient } from '../llm/ollama-client.js';

export class StatsAgent {
    /**
     * Gathers quantitative and statistical data for a given team.
     * @param team Name of the soccer team
     * @returns A string summarizing the statistics
     */
    async gatherStats(team: string): Promise<string> {
        console.log(`[StatsAgent] Buscando estatísticas para o time: ${team}...`);

        await mcpClient.init();
        const toolsResponse = await mcpClient.listTools();
        const validTools = toolsResponse.tools.map(t => t.name)
        const toolsDesc = toolsResponse.tools.map((t) =>
            `- ${t.name}: ${t.description}\n  Argumentos: ${JSON.stringify(t.inputSchema.properties)}`
        ).join("\n\n");

        const systemPrompt = `Você é um analista de dados esportivos. Responda SEMPRE APENAS com um objeto JSON válido.
As únicas ferramentas que existem são: ${validTools.join(', ')}. NUNCA tente usar ferramentas inventadas (como search_events ou extract_events).

Para usar uma ferramenta, responda com o nome dela no campo "action" e os argumentos no campo "args".
Exemplos:
{"action": "find_team_matches", "args": {"teamName": "..."}}
{"action": "statsbomb_query", "args": {"path": "...", "searchQuery": "..."}}

Siga ESTAS ETAPAS NA ORDEM:

PASSO 1: ENCONTRAR PARTIDAS (MATCHES)
- Use a ferramenta 'find_team_matches' passando o NOME DO TIME (em INGLÊS, ex: 'Brazil', 'Morocco') no argumento 'teamName'.
- Anote os 'match_id' retornados. Se não encontrar nenhuma partida, você deve encerrar retornando a 'final_answer' informando o ocorrido.

PASSO 2: EXTRAIR DADOS DAS PARTIDAS
- Use a ferramenta 'statsbomb_query' SOMENTE para buscar detalhes da partida usando o 'match_id'. As possibilidades de caminhos (paths) são:
  - 'events/{match_id}.json': Para extrair eventos do jogo (Gols, xG, Assistências, Interceptações, Desarmes, etc). Use 'searchQuery' com o nome do time para extrair apenas as linhas relevantes.
  - 'lineups/{match_id}.json': Para extrair escalações da partida.
  - 'three-sixty/{match_id}.json': Para dados espaciais e de posicionamento 360.
- COLETE CONTEXTO: Analise os eventos, táticas e métricas ofensivas/defensivas.
- Agrupe mentalmente os dados coletados de várias partidas.

PASSO 3: FINALIZAR
Atenção: NUNCA pare no Passo 1 se houverem partidas. O objetivo é extrair estatísticas das partidas (events).
- SUCESSO: Se extraiu números, retorne {"action": "final_answer", "answer": "..."} contendo um TEXTO RICO E ESTRUTURADO. Não devolva JSONs crus de eventos soltos. O texto deve conter:
  1. Gols marcados e Sofridos em X partidas analisadas (informe a temporada/período).
  2. Métricas ofensivas (Assistências, Chutes a gol, Posse de bola) em X partidas analisadas durante Y período.
  3. Métricas defensivas (Interceptações, Desarmes, Faltas) em X partidas analisadas durante Y período.
  4. Contexto dos adversários enfrentados nessas partidas.
  Esses dados serão vitais para a predição final!
- FALHA TOTAL: Se tentou diversas vezes em vão, retorne: {"action": "final_answer", "answer": "Buscas esgotadas sem sucesso. Relatório: ..."}

LEMBRE-SE: Nomes sempre em INGLÊS.`;

        let history = `Time alvo: ${team}\n\n`;
        const maxSteps = 20;

        for (let step = 0; step < maxSteps; step++) {
            console.log(`[StatsAgent] Buscando e analisando estatísticas... (${step + 1}/${maxSteps})`);

            try {
                const responseJson = await ollamaClient.generateJson(history, undefined, systemPrompt);

                // Como responseJson é um objeto, usar JSON.stringify para exibi-lo corretamente no console
                console.log(`[StatsAgent] Resposta bruta do agente (ação proposta): ${responseJson.action || 'NENHUMA'}`);

                if (responseJson.action === "final_answer") {
                    console.log(`[StatsAgent] Final answer alcançada.`);
                    return responseJson.answer;
                } else if (responseJson.action) {
                    const toolName = responseJson.action;
                    const toolArgs = responseJson.args || {};

                    // Validação extra para evitar que o modelo invente ferramentas
                    if (!validTools.includes(toolName)) {
                        console.log(`[StatsAgent] O modelo tentou usar uma tool inválida: ${toolName}`);
                        history += `Erro: '${toolName}' NÃO é uma ferramenta válida. Use apenas as listadas: ${validTools.join(', ')} ou 'final_answer'.\n\n`;
                        continue;
                    }

                    console.log(`[StatsAgent] Executando tool: ${toolName} com args:`, toolArgs);

                    const toolResult = await mcpClient.callTool(toolName, toolArgs);

                    console.log(`[StatsAgent] Tool result: ${toolResult}`)

                    const resultStr = String(toolResult);
                    const snippet = resultStr.length > 1500 ? resultStr.substring(0, 1500) + "\n...[TRUNCATED_TO_SAVE_CONTEXT]" : resultStr;

                    history += `Ação executada: '${toolName}' com args ${JSON.stringify(toolArgs)}.\n`;
                    history += `Resultado: ${snippet}\n\n`;
                    history += `Analise o resultado e continue para o próximo Passo. NUNCA invente ferramentas, use apenas 'statsbomb_query' ou 'final_answer'. Responda APENAS com JSON.\n`;
                } else {
                    // Invalid JSON structure
                    console.log(`[StatsAgent] O modelo não retornou a propriedade 'action'. Retorno:`, responseJson);
                    history += `Erro: O formato retornado não seguiu o padrão esperado com a propriedade "action". Você DEVE retornar um JSON contendo "action" e "args". Exemplo: {"action": "search", "args": {"query": "..."}}\n\n`;
                }
            } catch (err) {
                console.error(`[StatsAgent] Erro no agent loop:`, err);
                history += `Erro ao tentar formatar a resposta: ${err}. Lembre-se de retornar apenas JSON válido.\n\n`;
            }
        }

        return "Não foi possível concluir a busca de estatísticas após várias tentativas. O agente não conseguiu formatar uma resposta final.";
    }
}

export const statsAgent = new StatsAgent();
