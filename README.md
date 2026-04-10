# 🧠 Gestão de Prompts (Prompt Manager)

O **Gestão de Prompts** é uma ferramenta profissional de nível de engenharia de prompts (Prompt Engineering) construída para gerir, criar versões e testar prompts sistémicos contra uma variedade de potentes LLMs do mercado, quer corram localmente no seu computador ou através da Cloud. 

A aplicação está dividida num **Backend robusto** alimentado por Node.js/Express e PostgreSQL, suportado por um **Frontend reativo** rápido construído com Vite e React.

---

## ✨ Funcionalidades Principais

### 📝 Gestão e Versionamento de Prompts
- Crie prompts baseados nos Agentes e nos seus casos de uso (AIA, DAIA, Blogs, etc).
- **Versionamento Dinâmico**: Guarde o histórico das alterações. Modificou uma instrução? Crie a versão `v2`. Nunca perca um prompt que funcionou na perfeição!
- **Variáveis customizadas**: Suporte para injetar variáveis `{{variavel}}` dinamicamente diretamente na interface, permitindo testar facilmente o mesmo prompt com diferentes contextos de entrada.

### ⚔️ Duelo de Modelos (A/B Testing)
- Teste o **mesmo prompt** e as **mesmas variáveis** em dois modelos Diferentes Lado-a-Lado.
- **Execução Paralela vs Sequencial**: Se utilizar modelos de provedores de Cloud, eles correm ao mesmo tempo de forma assíncrona. Se detetar que ambos os modelos selecionados são executados no mesmo prestador local (como o LM Studio), o sistema engata num modo sequencial automático, fazendo warm-up e correndo um após o outro, com pausas pré-definidas para garantir que a memória VRAM do seu dispositivo (ou RAM) respira entre inferências, sem "crashes".
- **Métricas ao rubro**: Compare instantaneamente a **latência (ms)** e o **consumo de tokens** de cada um.
- **Inputs Multimodais**: Faça o upload de Imagens localmente para testar modelos de Visão e extração de dados.

### 🧑‍⚖️ Juiz IA (Avaliação Automática)
- Precisa de uma opinião imparcial sobre quem respondeu melhor no Duelo Lado-a-Lado? Invoque o botão **"Avaliar com IA"**.
- Escolha um dos seus modelos mais inteligentes (via OpenRouter por exemplo) para ler ambos os *outputs* (Modelo A vs Modelo B) com base na instrução original, avaliar Critérios de Qualidade e determinar o Vencedor lógico.

---

## 🔌 Provedores e Modelos Suportados

A ferramenta abstrai todas as complexidades de chamadas API usando uma camada unificada de comunicação (SDKs compatíveis com OpenAI). Foram incorporados nativamente os seguintes provedores:

1. 🦙 **Ollama (Local / Cloud)**: Integração nativa para que corra pesos de modelos quantizados (*GGUF/Safetensors*) seja na sua máquina (`localhost`) ou via servidor remoto (*RunPod, provedores dedicados*). Preparado para mostrar e processar pensamentos (Chain-of-Thought) de modelos *Reasoning* (DeepSeek, QwQ) caso estes se escondam sob a *Reasoning Content tag*.
2. 🖥️ **LM Studio (Local)**: Excelente para interligação simples na rede local e testes directos de hardware com servidor HTTP.
3. 🌐 **OpenRouter**: Permite aceder aos pesos pagos líderes de mercado (GPT-4o, Claude 3.5 Sonnet, Gemma 4, Grok).
4. 🇨🇳 **GLM (Zhipu AI)**: Suporte dedicado para modelos como o `GLM-4`, `GLM-5` entre outros da ZhipuAI.
5. Ⓜ️ **MiniMax**: Suporte para APIs standard ou Code Plans (`MiniMax-M2.5-Code`, `MiniMax-M2.7`, etc).

---

## 🔐 Check de Segurança do Código

Foi efetuada uma inspeção e auditoria à segurança do seu repositório aquando do primeiro envio para o GitHub:

- ✅ **Variáveis ​​de Ambiente isoladas**: Todas as chaves secretas (API Keys de provedores) bem como strings de ligação à base de dados SQL residem inteiramente no seu ficheiro `.env` não versionado. A lógica local chama ativamente `process.env`, prevenindo código em *hard-code* da sua conta.
- ✅ **Ficheiro `.gitignore` rigoroso**: O seu repositório encontra-se livre de partilha da pasta pesada `node_modules`. O log histórico `.env` nunca foi partilhado com o servidor Cloud do *Git*, estando totalmente blindado à sua máquina original.
- ✅ **`openrouter_key.json`**: O ficheiro JSON contendo dados do OpenRouter retém **apenas metadados truncados** de limite, data e gastos (ex: `sk-or-v1-49c...645`), e nunca a sua Chave Principal legível integral. Concerne 0 riscos para o projeto estar versionado.

---

## 🛠️ Como Iniciar

1. Certifique-se que configurou o seu `.env` dentro da pasta `server/` utilizando o seguinte formato base:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<ip>/<dbname>
   LM_STUDIO_URL=http://.../v1
   GLM_API_KEY=...
   OPENROUTER_API_KEY=...
   OLLAMA_URL=http://.../v1
   OLLAMA_CLOUD_URL=.../v1
   MINIMAX_API_URL=.../v1
   MINIMAX_API_KEY=...
   PORT=3001
   ```
2. Instalar todas as dependências do Monorepo:
   ```bash
   npm run install:all
   ```
3. Inicialize as tabelas e dados pré-preenchimento SQL (apenas na 1ª vez):
   ```bash
   npm run db:init --prefix server
   ```
4. Correr Servidor e Aplicação Lado-a-Lado:
   ```bash
   npm run dev
   ```

Aproveite ao máximo a suite para encontrar os melhores Prompts Sistêmicos com os modelos ideais!
