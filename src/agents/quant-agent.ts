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
        console.log(`[QuantAgent] Buscando notícias e sentimentos de forma autônoma para o time: ${team}...`);
        const currentYear = new Date().getFullYear();
        const currentDate = new Date().toLocaleDateString('pt-BR');

        await mcpClient.init();
        const toolsResponse = await mcpClient.listTools();
        const validTools = toolsResponse.tools.map(t => t.name);

        const systemPrompt = `Você é um tradutor de sentimentos esportivos autônomo. Sua missão é buscar notícias na web sobre um time e traduzir o sentimento atual em modificadores quantitativos (valores entre -0.5 e +0.5).

Para buscar informações, você tem acesso às seguintes ferramentas: ${validTools.join(', ')}.
Recomendamos o uso de:
- 'search': para buscar notícias recentes no duckduckgo, bing ou google.
- 'scrape_url': para extrair o texto de uma URL promissora retornada na busca.

Para usar uma ferramenta, responda OBRIGATORIAMENTE APENAS com um objeto JSON no formato:
{"action": "nome_da_tool", "args": {"parametro": "valor"}}

Exemplos de chamadas:
{"action": "search", "args": {"query": "${team} lesoes desfalques futebol ${currentYear}", "provider": "duckduckgo"}}
{"action": "scrape_url", "args": {"url": "https://url.da.noticia.com"}}

ATENÇÃO À DATA: A data de hoje é ${currentDate}. Verifique as datas e os contextos das notícias encontradas e COMPARE com a data de hoje. 
- É OBRIGATÓRIO focar estritamente na situação ATUAL do time. Ignore notícias antigas.

OBJETIVOS DA BUSCA:
Busque na web quantas vezes for necessário para entender o momento do time:
- attack_modifier: lesões de atacantes atuais (-), boa fase ofensiva recente (+)
- defense_modifier: lesões de zagueiros atuais (-), defesa sólida recente (+)
- morale_modifier: crise/pressão atual (-), confiança/apoio da torcida atual (+)

Quando você já tiver informações suficientes (ou não encontrar mais nada de útil nas buscas), OBRIGATORIAMENTE finalize retornando:
{"action": "final_answer", "args": { "attack_modifier": 0.1, "defense_modifier": -0.2, "morale_modifier": 0.05, "reasoning": "Explicação curta do motivo dos pesos..." }}`;

        let history = `Time alvo: ${team}\nData Atual: ${currentDate}\n\n`;
        const maxSteps = 15;

        for (let step = 0; step < maxSteps; step++) {
            console.log(`[QuantAgent] Analisando notícias... (${step + 1}/${maxSteps})`);

            try {
                const responseJson = await ollamaClient.generateJson(history, undefined, systemPrompt);

                console.log(`[QuantAgent] Resposta bruta do agente (ação proposta): ${responseJson.action || 'NENHUMA'}`);

                if (responseJson.action === "final_answer") {
                    console.log(`[QuantAgent] Final answer alcançada.`);
                    return responseJson.args as QuantModifier;
                } else if (responseJson.action) {
                    const toolName = responseJson.action;
                    const toolArgs = responseJson.args || {};

                    if (!validTools.includes(toolName)) {
                        console.log(`[QuantAgent] O modelo tentou usar uma tool inválida: ${toolName}`);
                        history += `Erro: '${toolName}' NÃO é uma ferramenta válida. Use apenas as listadas: ${validTools.join(', ')} ou 'final_answer'.\n\n`;
                        continue;
                    }

                    console.log(`[QuantAgent] Executando tool: ${toolName} com args:`, toolArgs);
                    const toolResult = await mcpClient.callTool(toolName, toolArgs);

                    const resultStr = String(toolResult);
                    const snippet = resultStr.length > 2500 ? resultStr.substring(0, 2500) + "\n...[TRUNCATED_TO_SAVE_CONTEXT]" : resultStr;

                    console.log('[QuantAgent] Snippet:', snippet);

                    history += `Ação executada: '${toolName}' com args ${JSON.stringify(toolArgs)}.\n`;
                    history += `Resultado: ${snippet}\n\n`;
                    history += `Analise o resultado. Se precisar ler a matéria, use scrape_url com a URL. Se já tiver informações suficientes, retorne a 'final_answer'. Responda APENAS com JSON.\n`;
                } else {
                    console.log(`[QuantAgent] O modelo não retornou a propriedade 'action'. Retorno:`, responseJson);
                    history += `Erro: O formato retornado não seguiu o padrão esperado com a propriedade "action". Exemplo: {"action": "search", "args": {"query": "..."}}\n\n`;
                }
            } catch (err) {
                console.error(`[QuantAgent] Erro no agent loop:`, err);
                history += `Erro ao tentar formatar a resposta: ${err}. Lembre-se de retornar apenas JSON válido.\n\n`;
            }
        }

        console.error(`[QuantAgent] Esgotou as tentativas sem finalizar. Retornando neutro.`);
        return {
            attack_modifier: 0,
            defense_modifier: 0,
            morale_modifier: 0,
            reasoning: "Falha na análise de sentimento (timeout de iterações), aplicando pesos neutros."
        };
    }
}

export const quantAgent = new QuantAgent();
