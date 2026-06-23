import { runCLI } from './cli/prompt';
import { vectorStore } from './rag/vector-store';
import { webSearchMcp } from './mcp/web-search';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
    console.log("Inicializando conexões de infraestrutura...");

    try {
        // Inicializa Banco Vetorial RAG
        await vectorStore.init();

        // Inicializa Cliente MCP para web search
        // Comentado temporariamente para caso não consiga subir de primeira, mas deixado habilitado como padrão.
        await webSearchMcp.init();

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
