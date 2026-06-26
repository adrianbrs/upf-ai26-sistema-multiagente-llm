import Fuse from 'fuse.js';

/**
 * Extracts relevant chunks of a large text based on a fuzzy search query.
 *
 * @param text The full text (e.g. scraped HTML text or large JSON string)
 * @param searchQuery The term to search for (e.g., team name)
 * @param maxLen The maximum allowed length of the returned string (default: 30000)
 * @returns A truncated or chunk-merged string containing the most relevant parts of the text
 */
export function extractRelevantContext(text: string, searchQuery?: string, maxLen: number = 30000): string {
    if (!text) return "";
    
    // Dividir em linhas (caso seja JSON minificado, tentar quebrar chaves para aumentar precisão)
    let processableText = text;
    if (processableText.indexOf('\n') === -1 || processableText.split('\n').length < 10) {
        processableText = processableText.replace(/},/g, '},\n').replace(/{/g, '{\n');
    }
    const lines = processableText.split('\n');
    const totalLines = lines.length;

    // Se o texto for pequeno o suficiente ou não houver busca, retorne o texto (truncado se necessário).
    if (text.length <= maxLen || !searchQuery || searchQuery.trim() === '') {
        if (text.length > maxLen) {
            const returnedLines = text.substring(0, maxLen).split('\n').length;
            const omittedLines = Math.max(0, totalLines - returnedLines);
            return text.substring(0, maxLen) + `\n...[TRUNCATED: ${omittedLines} lines omitted]`;
        }
        return text;
    }
    
    // Se não há linhas o suficiente para separar em blocos, apenas retorne o início
    if (lines.length < 50) {
        const returnedLines = text.substring(0, maxLen).split('\n').length;
        const omittedLines = Math.max(0, totalLines - returnedLines);
        return text.substring(0, maxLen) + `\n...[TRUNCATED: ${omittedLines} lines omitted]`;
    }

    // Preparar dados para o Fuse
    const fuseData = lines.map((content, index) => ({ content, index }));
    
    const fuse = new Fuse(fuseData, {
        keys: ['content'],
        includeScore: true,
        threshold: 0.4, // 0.0 é match perfeito, 1.0 é nada. 0.4 é razoável para textos longos
        ignoreLocation: true // o termo pode estar em qualquer lugar da linha
    });

    const results = fuse.search(searchQuery);

    if (results.length === 0) {
        // Se não achou nada, retorna o começo
        const returnedLines = text.substring(0, maxLen).split('\n').length;
        const omittedLines = Math.max(0, totalLines - returnedLines);
        return text.substring(0, maxLen) + `\n...[TRUNCATED: ${omittedLines} lines omitted] (No matches found for "${searchQuery}")`;
    }

    // Pegar os melhores matches. O tamanho de cada chunk dependerá de maxLen.
    const averageLineLength = Math.max(1, text.length / lines.length);
    const maxTotalLines = Math.floor(maxLen / averageLineLength);
    
    // Vamos pegar até 5 pontos de interesse
    const numPoints = Math.min(5, results.length);
    const linesPerPoint = Math.floor(maxTotalLines / numPoints);
    const radius = Math.floor(linesPerPoint / 2); // linhas para cima e para baixo
    
    const topMatches = results.slice(0, numPoints).map(r => r.item.index);
    // Ordenar os índices para fazer a extração de forma linear (evitando sobreposições)
    topMatches.sort((a, b) => a - b);

    const mergedChunks: string[] = [];
    let currentChunkStart = -1;
    let currentChunkEnd = -1;
    let lastPushedEnd = -1;

    for (const matchIndex of topMatches) {
        const start = Math.max(0, matchIndex - radius);
        const end = Math.min(lines.length - 1, matchIndex + radius);

        if (currentChunkStart === -1) {
            currentChunkStart = start;
            currentChunkEnd = end;
        } else if (start <= currentChunkEnd + 5) {
            // Se o início do novo chunk se sobrepõe ou fica muito perto (5 linhas), funde eles
            currentChunkEnd = Math.max(currentChunkEnd, end);
        } else {
            // Salva o chunk anterior e começa um novo
            const linesBefore = currentChunkStart - (lastPushedEnd + 1);
            if (linesBefore > 0) {
                mergedChunks.push(`\n...[TRUNCATED: ${linesBefore} lines skipped]...\n`);
            }
            mergedChunks.push(lines.slice(currentChunkStart, currentChunkEnd + 1).join('\n'));
            lastPushedEnd = currentChunkEnd;

            currentChunkStart = start;
            currentChunkEnd = end;
        }
    }
    
    // Salvar o último chunk
    if (currentChunkStart !== -1) {
        const linesBefore = currentChunkStart - (lastPushedEnd + 1);
        if (linesBefore > 0) {
            mergedChunks.push(`\n...[TRUNCATED: ${linesBefore} lines skipped]...\n`);
        }
        mergedChunks.push(lines.slice(currentChunkStart, currentChunkEnd + 1).join('\n'));
        lastPushedEnd = currentChunkEnd;
    }

    const linesAfter = lines.length - 1 - lastPushedEnd;
    if (linesAfter > 0) {
        mergedChunks.push(`\n...[TRUNCATED: ${linesAfter} lines after]...`);
    }

    let finalResult = mergedChunks.join('\n');
    
    // Garantir rigorosamente que não exceda maxLen
    if (finalResult.length > maxLen) {
        finalResult = finalResult.substring(0, maxLen) + "\n...[TRUNCATED_AT_MAX_LEN]";
    }

    return finalResult;
}
