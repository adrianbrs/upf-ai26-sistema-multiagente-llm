import { Ollama } from 'ollama';

/**
 * Singleton client for Ollama
 * Handles connection to the local Ollama instance running in the docker compose.
 */
export class OllamaClient {
    private ollama: Ollama;
    private defaultModel: string;

    constructor() {
        const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        this.ollama = new Ollama({ host });
        // Use a lightweight model by default, or an environment variable
        this.defaultModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
    }

    /**
     * Generates a completion based on the given prompt.
     * @param prompt The prompt string
     * @param model Optional model override
     * @param system Optional system prompt
     * @returns The generated string
     */
    async generate(prompt: string, model?: string, system?: string): Promise<string> {
        try {
            const response = await this.ollama.generate({
                model: model || this.defaultModel,
                prompt,
                system,
                stream: false,
            });
            return response.response;
        } catch (error) {
            console.error('[OllamaClient] Error generating response:', error);
            throw error;
        }
    }

    /**
     * Chat generation that forces a JSON output format.
     * Ideal for extraction agents.
     */
    async generateJson(prompt: string, model?: string, system?: string): Promise<any> {
        try {
            const response = await this.ollama.generate({
                model: model || this.defaultModel,
                prompt,
                system,
                format: 'json',
                stream: false,
            });
            return JSON.parse(response.response);
        } catch (error) {
            console.error('[OllamaClient] Error generating JSON response:', error);
            throw error;
        }
    }

    /**
     * Creates an embedding for a text chunk
     */
    async createEmbedding(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
        try {
            const response = await this.ollama.embeddings({
                model,
                prompt: text,
            });
            return response.embedding;
        } catch (error) {
            console.error('[OllamaClient] Error generating embeddings:', error);
            throw error;
        }
    }
}

export const ollamaClient = new OllamaClient();
