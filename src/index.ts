import { vectorStore } from './rag/vector-store.js';
import { mcpClient } from './mcp/web-search.js';
import { runCLI } from './cli/prompt.js';
import dotenv from 'dotenv';
import { syncStatsBombData } from './utils/statsbomb-sync.js';
import { buildMatchIndex } from './db/match-index.js';

dotenv.config();

async function bootstrap() {
    console.log("Inicializando conexões de infraestrutura...");

    try {
        // Sincroniza e Indexa Metadados do StatsBomb
        syncStatsBombData();
        buildMatchIndex();

        // Inicializa Banco Vetorial RAG
        await vectorStore.init();

        // Inicializa Cliente MCP
        await mcpClient.init();

        console.log("Tudo pronto! Iniciando interface...\n");
        
        // Inicia a interação com o usuário
        await runCLI();

    } catch (error) {
        console.error("Erro na inicialização do sistema:", error);
        process.exit(1);
    }
}

// Inicia a aplicação
bootstrap();
