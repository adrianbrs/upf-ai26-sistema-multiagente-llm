import { ChromaClient } from 'chromadb';
import { ollamaClient } from '../llm/ollama-client';

/**
 * Handles Vector Database operations using ChromaDB for RAG context.
 */
export class VectorStore {
    private client: ChromaClient;
    private collectionName = 'multiagent_knowledge_base';
    private initialized = false;
    private collection: any;

    constructor() {
        const host = process.env.CHROMA_HOST || 'http://localhost:8000';
        this.client = new ChromaClient({ path: host });
    }

    async init() {
        if (this.initialized) return;
        try {
            this.collection = await this.client.getOrCreateCollection({
                name: this.collectionName,
            });
            this.initialized = true;
            console.log("[VectorStore] ChromaDB connected and collection initialized.");
        } catch (error) {
            console.error("[VectorStore] Error connecting to ChromaDB:", error);
            throw error;
        }
    }

    /**
     * Adds a document to the vector store by generating its embedding first.
     * @param id Unique identifier for the document
     * @param text The text content to store
     * @param metadata Optional metadata object
     */
    async addDocument(id: string, text: string, metadata?: any) {
        if (!this.initialized) await this.init();
        
        try {
            const embedding = await ollamaClient.createEmbedding(text);
            await this.collection.add({
                ids: [id],
                embeddings: [embedding],
                metadatas: metadata ? [metadata] : undefined,
                documents: [text]
            });
        } catch (error) {
            console.error("[VectorStore] Error adding document:", error);
        }
    }

    /**
     * Retrieves the most similar documents to the given query.
     * @param query The search string
     * @param nResults Number of results to return
     * @returns Array of retrieved documents
     */
    async query(query: string, nResults: number = 3): Promise<string[]> {
        if (!this.initialized) await this.init();

        try {
            const queryEmbedding = await ollamaClient.createEmbedding(query);
            const results = await this.collection.query({
                queryEmbeddings: [queryEmbedding],
                nResults: nResults
            });

            if (results.documents && results.documents.length > 0) {
                return results.documents[0] as string[];
            }
            return [];
        } catch (error) {
            console.error("[VectorStore] Error querying documents:", error);
            return [];
        }
    }
}

export const vectorStore = new VectorStore();
