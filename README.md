# ⚽ Footure - Sistema Multiagente de Previsão Esportiva (Futebol)

**Disciplina:** Inteligência Artificial\
**Instituição:** Universidade de Passo Fundo (UPF)\
**Professores:** Prof. Diego A. Lusa, Prof. Roberto Rabello\
**Aluno:** Adrian Cerbaro

---

## 📖 Descrição do Problema
Prever resultados de partidas de futebol é uma tarefa complexa que envolve analisar tanto dados estruturados (estatísticas puras, histórico de vitórias) quanto dados não-estruturados e voláteis (lesões de última hora, crises no vestiário, moral da equipe e notícias recentes). Abordagens tradicionais costumam falhar por não conseguirem cruzar o rigor analítico com o sentimento atual do momento da equipe.

## 🎯 Objetivo da Solução
Desenvolver um sistema multiagente baseado em Inteligência Artificial Generativa Local que atue como um comitê de especialistas esportivos. O sistema busca dados na web em tempo real, quantifica o impacto psicológico das notícias e utiliza RAG (Geração Aumentada por Recuperação) do seu próprio banco de dados histórico para prever os resultados de partidas de futebol com justificativas táticas.

---

## 🏗️ Arquitetura Multiagente e Papéis

O sistema é baseado na colaboração de **três agentes especializados**, coordenados pelo `MatchOrchestrator`:

1. **📊 Agente de Estatísticas (StatsAgent)**
   - **Papel:** Recuperador e Sintetizador de Dados Estruturados.
   - **Função e Ciclo de Iteração:** Opera de forma autônoma (loop de até 20 passos) analisando dados da base do StatsBomb via MCP. Segue um pipeline estrito: primeiro localiza as partidas do time (`find_team_matches`), depois extrai os eventos táticos e escalações (`statsbomb_query`), e finalmente sintetiza um relatório puramente estatístico (gols, posse de bola, desarmes).

2. **🧠 Agente Quantificador de Sentimentos (QuantAgent)**
   - **Papel:** Analista Comportamental.
   - **Função e Ciclo de Iteração:** Busca de forma autônoma na web (loop de até 15 passos) por notícias, lesões, declarações e crises recentes. Ele usa ferramentas de busca (`search`) e extração de páginas web (`scrape_url`), contextualiza as informações com a data atual e as converte em modificadores matemáticos (pesos entre -0.5 e +0.5) estruturados em JSON (`attack_modifier`, `defense_modifier`, `morale_modifier`, e um `reasoning`).

3. **🔮 Agente Preditor Analista (PredictAgent)**
   - **Papel:** Tomador de Decisão Final.
   - **Função:** Recebe as informações do StatsAgent, os modificadores do QuantAgent e também consulta o banco de dados vetorial (RAG) para ver como times parecidos se comportaram no passado. Com todo esse contexto, ele emite o prognóstico final com 3 palpites e suas probabilidades.

---

## 🛠️ Ferramentas (Tools) e Integração MCP

### **Protocolo MCP (Model Context Protocol)**
A arquitetura utiliza o MCP para padronizar o acesso do LLM à ferramentas locais e à internet de forma segura. Em vez de depender de APIs pagas, o projeto implementa um **Servidor MCP Local (`src/mcp/local-search-server.ts`)** e disponibiliza múltiplas tools (ferramentas) especializadas, permitindo que os agentes explorem os dados iterativamente.

### **Descrição das Tools Disponíveis:**
- `search(query, provider)`: Busca na web utilizando DuckDuckGo, Bing ou Google, processando resultados e devolvendo snippets relevantes.
- `scrape_url(url, searchQuery)`: Acessa uma URL via Puppeteer, processa a página (ideal para sites dinâmicos em JS), extrai o texto limpo (removendo lixo visual) e permite buscas "fuzzy" para encontrar contextos específicos na página.
- `statsbomb_query(path, searchQuery, offset, limit)`: Acessa dados da base aberta do StatsBomb no GitHub (competições, partidas, eventos, escalações). Possui recursos avançados como paginação e busca semântica em arquivos JSON densos para evitar estourar o contexto do LLM.
- `find_team_matches(teamName)`: Utilitário para busca rápida de IDs de partidas de um time específico no índice local do StatsBomb, servindo de atalho para o *StatsAgent*.

---

## 🧠 RAG, Embeddings e Armazenamento Vetorial

### **Estratégia de RAG (Retrieval-Augmented Generation)**
O sistema possui aprendizado contínuo. Ao final de cada partida prevista, gera-se um resumo tático e as previsões daquele jogo. Esse resumo é convertido em embeddings e salvo no banco de dados vetorial. 
Na próxima vez que os agentes forem analisar uma partida, o sistema faz uma busca semântica para resgatar partidas anteriores semelhantes. O LLM avalia se a previsão anterior deu certo ou errado para calibrar o palpite atual.

### **Tecnologias Utilizadas:**
- **Modelo de Embeddings:** `nomic-embed-text` (Ollama)
- **Armazenamento Vetorial (Vector DB):** ChromaDB (rodando localmente via Docker)
- **Base de Conhecimento:** Dinâmica. A base começa vazia e cresce organicamente à medida que o usuário interage e gera novas previsões no sistema.

---

## ⚙️ Tecnologias e Modelos Locais

Toda a stack de IA roda **100% local e de forma gratuita**, sem enviar dados para a OpenAI ou outros provedores externos.

- **Modelo Local (LLM):** `llama3.2:3b` (ideal para rodar em hardware doméstico, tendo um excelente raciocínio lógico em PT-BR).
- **Provedor de Inferência:** Ollama
- **Linguagem:** TypeScript / Node.js
- **Infraestrutura:** Docker e Docker Compose (para orquestrar Node, ChromaDB e Ollama).

---

## 🚀 Como Executar Localmente

### **Pré-requisitos:**
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados.
- [Node.js](https://nodejs.org/) v20+ e [pnpm](https://pnpm.io/) instalados (se for rodar o ambiente de desenvolvimento direto na máquina).

### **Opção 1: Execução Total via Docker (Recomendado)**
Essa opção empacota tudo (bancos de dados e a aplicação) em contêineres.

1. Clone o repositório:
   ```bash
   git clone https://github.com/adrianbrs/upf-ai26-sistema-multiagente-llm.git
   cd upf-ai26-sistema-multiagente-llm
   ```
2. Construa e inicie todos os contêineres:
   ```bash
   pnpm docker:build
   ```
   *(Aguarde o download do modelo LLaMA. Pode levar alguns minutos dependendo da sua internet)*
3. Anexe o terminal ao contêiner da aplicação para poder interagir com ela:
   ```bash
   pnpm docker:cli
   ```

### **Opção 2: Modo de Desenvolvimento (Docker + Host)**
Neste modo, apenas os bancos de dados rodam no Docker, e a interface roda diretamente no seu terminal local (útil para desenvolvimento rápido).

1. Instale as dependências:
   ```bash
   pnpm install
   ```
2. Suba a infraestrutura (Ollama e ChromaDB) e aguarde os modelos serem baixados:
   ```bash
   pnpm docker:infra
   ```
3. Execute o sistema localmente:
   ```bash
   pnpm dev
   ```

---

## 💻 Exemplo de Uso pelo Terminal

Ao rodar a aplicação, o fluxo de tela será:

```text
================================================
⚽ Sistema Multiagente de Previsão Esportiva ⚽
================================================

? Digite o nome do PRIMEIRO time/seleção: Brasil
? Digite o nome do SEGUNDO time/seleção: Japão

======================================================
Iniciando Análise Multiagente: Brasil vs Japão
======================================================

--- [1] Agente de Estatísticas ---
[StatsAgent] Buscando estatísticas para o time: Brasil...
...
--- [2] Agente Quantificador de Sentimentos ---
[QuantAgent] Buscando notícias e sentimentos para o time: Brasil...
> Modificadores de Brasil: { attack_modifier: -0.1, defense_modifier: 0.05, morale_modifier: -0.15 }
...
--- [5] RAG (Recuperação de Contexto) ---
> Contexto recuperado da base vetorial local.

======================================================
RESULTADO FINAL DA PREVISÃO
======================================================
1. Vitória do Brasil (2-0) - Probabilidade: 70%
2. Empate (1-1) - Probabilidade: 20%
3. Vitória do Japão (1-0) - Probabilidade: 10%
...
```

---

## 🔧 Solução de Problemas (Troubleshooting)

- **Erro: "dependency failed to start: container XYZ is unhealthy"**
  - **Motivo:** Ocorre principalmente se houver bloqueios de porta.
  - **Solução:** Caso enfrente problemas com portas em uso, certifique-se de que nada esteja rodando na porta `8000` e na porta `11434` (feche a versão desktop/serviço nativo do Ollama se você o tiver instalado no Windows/Mac, pois o Docker assumirá essa porta).

- **Erro de Modelo Não Encontrado ("model 'llama3.2:3b' not found")**
  - **Motivo:** O download dos modelos de IA pelo contêiner `ollama-init` ainda não terminou, ou a internet caiu durante a extração.
  - **Solução:** O script `docker:infra` trava a inicialização do app até que o download termine. Caso tenha interrompido, aguarde a conclusão através do comando `docker logs -f ollama_init`.

- **Busca não retorna resultados ou diz "bloqueado pelo motor de busca"**
  - **Motivo:** Web Scraping está sempre sujeito à flutuação.
  - **Solução:** Nesse caso seria preciso alterar o motor de busca utilizado no MCP.

- **Erro no Puppeteer ("Could not find Chrome", "Failed to launch browser", etc)**
  - **Motivo:** Ao rodar fora do Docker (Opção 2 - Desenvolvimento), o Puppeteer pode não encontrar o executável do Chrome/Chromium na máquina hospedeira.
  - **Solução:** Você pode instalar o navegador que o Puppeteer precisa executando `npx puppeteer browsers install chrome` (ou `pnpm exec puppeteer browsers install chrome`). Alternativamente, é possível configurar o Puppeteer para utilizar um navegador já instalado no seu sistema, informando o caminho no `executablePath` nas opções de *launch*. Para mais detalhes sobre dependências faltantes, consulte a [documentação oficial de Troubleshooting do Puppeteer](https://pptr.dev/troubleshooting).
