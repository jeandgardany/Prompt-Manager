# 🧠 Gestão de Prompts (Prompt Manager)

O **Gestão de Prompts** é uma ferramenta profissional de nível de engenharia de prompts (Prompt Engineering) construída para gerir, criar versões e testar prompts sistémicos contra uma variedade de potentes LLMs do mercado, quer corram localmente no seu computador ou através da Cloud.

A aplicação está dividida num **Backend robusto** alimentado por Node.js/Express e SQLite, suportado por um **Frontend reativo** rápido construído com Vite e React.

---

## ✨ Funcionalidades Principais

### 📝 Gestão e Versionamento de Prompts
- Crie prompts baseados nos Agentes e nos seus casos de uso (AIA, DAIA, Blogs, etc).
- **Versionamento Dinâmico**: Guarde o histórico das alterações. Modificou uma instrução? Crie a versão `v2`. Nunca perca um prompt que funcionou na perfeição!
- **Variáveis customizadas**: Suporte para injetar variáveis `{{variavel}}` dinamicamente diretamente na interface, permitindo testar facilmente o mesmo prompt com diferentes contextos de entrada.
- **Histórico de Testes**: Veja todos os testes anteriores com paginação cursor-based para navegação eficiente.

### ⚔️ Duelo de Modelos (A/B Testing)
- Teste o **mesmo prompt** e as **mesmas variáveis** em dois modelos Diferentes Lado-a-Lado.
- **Execução Paralela vs Sequencial**: Se utilizar modelos de provedores de Cloud, eles correm ao mesmo tempo de forma assíncrona. Se detetar que ambos os modelos selecionados são executados no mesmo prestador local (como o LM Studio), o sistema engata num modo sequencial automático, fazendo warm-up e correndo um após o outro, com pausas pré-definidas para garantir que a memória VRAM do seu dispositivo (ou RAM) respira entre inferências, sem "crashes". Pode também forçar o modo sequencial manualmente passando `sequential: true` no pedido.
- **Métricas ao rubro**: Compare instantaneamente a **latência (ms)** e o **consumo de tokens** de cada um.
- **Inputs Multimodais**: Faça o upload de Imagens localmente para testar modelos de Visão e extração de dados.
- **Resultados Persistidos**: Todos os duelos são guardados na base de dados para consulta posterior.

### 🧠 Controlo de Thinking (Chain-of-Thought)
- **Toggle ON/OFF**: Ative ou desative o raciocínio interno (thinking/CoT) de modelos de raciocínio diretamente na interface, tanto no teste simples como no duelo.
- **Modelos suportados**: Qwen3/3.5, QwQ, DeepSeek, Gemma 3/4, e outros modelos que produzam blocos `<think>`.
- **Supressão inteligente**: Quando desativado, o sistema usa a diretiva nativa `/no_think` para Qwen, `reasoning_effort: none` para DeepSeek, e remove automaticamente blocos `<think>` do output final como fallback universal.
- **Ideal para produção**: Obtenha respostas limpas sem o bloco de raciocínio quando não precisa dele (ex: reescrita de artigos, geração de conteúdo).

### ⚙️ Controlo de Max Tokens
- **Limite configurável**: Ajuste o número máximo de tokens na resposta (default: 4096) diretamente na interface antes de cada teste ou duelo.
- **Sem respostas cortadas**: Para conteúdos longos (artigos, relatórios), aumente o limite até 32768 tokens conforme necessário.

### 🧑‍⚖️ Juiz IA (Avaliação Automática)
- Precisa de uma opinião imparcial sobre quem respondeu melhor no Duelo Lado-a-Lado? Invoque o botão **"Avaliar com IA"**.
- Escolha um dos seus modelos mais inteligentes (via OpenRouter por exemplo) para ler ambos os *outputs* (Modelo A vs Modelo B) com base na instrução original.
- **Critérios Configuráveis**: Personalize os critérios de avaliação do Juiz IA (Relevância, Qualidade, Criatividade, Precisão, Tom/Estilo) de acordo com as suas necessidades.
- **Resultado Persistido**: O veredito do Juiz e o modelo utilizado são guardados juntamente com o vencedor no resultado do duelo.

### 🔀 Comparação A/B de Versões
- Compare **duas versões diferentes do mesmo prompt** (`v1` vs `v2`) utilizando o mesmo modelo e as mesmas variáveis.
- Ideal para avaliar se uma alteração no prompt sistémico melhorou ou piorou a qualidade da resposta.
- **Vencedor Manual**: Após a comparação, defina manualmente qual versão venceu com notas justificativas.

---

## 🔌 Provedores e Modelos Suportados

A ferramenta abstrai todas as complexidades de chamadas API usando uma camada unificada de comunicação (SDKs compatíveis com OpenAI). Foram incorporados nativamente os seguintes provedores:

1. 🦙 **Ollama (Local / Cloud)**: Integração nativa para que corra pesos de modelos quantizados (*GGUF/Safetensors*) seja na sua máquina (`localhost`) ou via servidor remoto (*RunPod, provedores dedicados*). Preparado para mostrar e processar pensamentos (Chain-of-Thought) de modelos *Reasoning* (DeepSeek, QwQ) caso estes se escondam sob a *Reasoning Content tag*.
2. 🖥️ **LM Studio (Local)**: Excelente para interligação simples na rede local e testes directos de hardware com servidor HTTP.
3. 🌐 **OpenRouter**: Permite aceder aos pesos pagos líderes de mercado (GPT-4o, Claude 3.5 Sonnet, Gemma 4, Grok).
4. 🇨🇳 **GLM (Zhipu AI)**: Suporte dedicado para modelos como o `GLM-4`, `GLM-5` entre outros da ZhipuAI.
5. Ⓜ️ **MiniMax**: Suporte para APIs standard ou Code Plans (`MiniMax-M2.5-Code`, `MiniMax-M2.7`, etc).

### ✏️ Como Adicionar / Modificar Modelos (OpenRouter, GLM, MiniMax)

Como alguns serviços massivos (como o **OpenRouter** ou **Zhipu/GLM**) disponibilizam centenas de milhares de modelos em simultâneo através da sua API, a aplicação utiliza atualmente uma "lista fixa" curada para construir opções do menu pendente em vez de despejar a lista inteira na interface.

Se desejar **incluir um modelo novo** ou **remover modelos** do painel que pertencem a estes provedores em nuvem, basta editar livremente um único ficheiro:

👉 **Ficheiro:** `server/src/services/llm.js`

Procure lá dentro a função `listModels(provider)`. Vai encontrar blocos `if/else` configuráveis semelhantes a este:

```javascript
} else if (provider === 'openrouter') {
  return [
    { id: 'qwen/qwen3.6-plus', name: 'Qwen 3.6 Plus', provider: 'openrouter' },
    // DICA: Para adicionar o seu próprio modelo, basta copiar a estrutura:
    // { id: 'ID_DO_MODELO_NA_API_DELES', name: 'NOME DE EXIBIÇÃO', provider: 'openrouter' },
  ];
}
```
*(**Nota:** Esta regra aplica-se aos modelos de Cloud. Provedores locais como o *LM Studio* ou *Ollama / Ollama Cloud* preenchem a sua dropdown **automaticamente**, perguntando de forma dinâmica ao seu Host quais são os modelos que você tem transferidos!).*

---

## 🔐 Segurança

A aplicação inclui várias camadas de proteção para manter as suas chaves de API e dados seguros:

### ✅ Proteção Implementada
- **Rate Limiting**: 200 pedidos por 15 minutos por IP (geral) e 30 pedidos por 15 minutos nas rotas de LLM, protegendo contra ataques de negação de serviço.
- **Helmet**: Headers de segurança HTTP automáticos (CSP, CORS policy, etc.) via middleware `helmet`.
- **CORS Restritivo**: Apenas permite pedidos de origens configuradas (localhost e domínios autorizados).
- **Validação de Input**: Verificação de Content-Type e sanitização básica contra XSS.
- **Limite de Payload**: Body JSON limitado a 10MB para proteger contra payloads excessivos (relevante para uploads de imagens multimodais).
- **API Key Opcional**: Camada adicional de autenticação para exposição em rede (ativada via variável de ambiente).
- **Error Handling em Produção**: Erros internos não vazam detalhes técnicos quando `NODE_ENV=production`.
- **Logging HTTP**: Registo automático de todos os pedidos HTTP via `morgan` (formato `dev` em desenvolvimento, `combined` em produção).

### 🔒 Configuração de Segurança para Rede

Por padrão, o servidor corre em `localhost`. Para exposição em rede local (ex: `HOST=0.0.0.0`), é **altamente recomendado** ativar a autenticação por API Key:

```env
# server/.env
API_KEY_REQUIRED=true
API_KEY=sua-chave-secreta-aqui
ALLOWED_ORIGINS=http://192.168.1.100:5173
HOST=0.0.0.0
```

Ao expor o servidor em `0.0.0.0`, será exibido um aviso de segurança no console a lembrar de ativar a proteção.

### 🔐 Variáveis de Ambiente de Segurança

| Variável | Default | Descrição |
|----------|---------|-----------|
| `API_KEY_REQUIRED` | `false` | Ativa autenticação por API Key |
| `API_KEY` | - | Chave secreta para autenticação |
| `ALLOWED_ORIGINS` | `localhost` | Lista de origens permitidas (separadas por vírgula) |
| `NODE_ENV` | `development` | Define comportamento de CORS |

---

## 🛠️ Como Iniciar

1. Configure o `.env` dentro da pasta `server/` utilizando o `.env.example` como referência:
   ```env
   # Database (SQLite - caminho opcional, default: server/db/database.sqlite)
   # DB_PATH=./db/database.sqlite

   # Provedores LLM
   LM_STUDIO_URL=http://192.168.1.20:12345/v1
   GLM_API_KEY=...
   GLM_API_URL=https://open.bigmodel.cn/api/paas/v4
   OPENROUTER_API_KEY=...
   OPENROUTER_URL=https://openrouter.ai/api/v1
   OLLAMA_URL=http://localhost:11434/v1
   OLLAMA_CLOUD_URL=https://your-ollama-cloud.com/v1
   OLLAMA_CLOUD_API_KEY=...
   MINIMAX_API_KEY=...
   MINIMAX_API_URL=https://api.minimax.io/v1

   # Servidor
   PORT=3001
   HOST=localhost

   # Segurança (opcional para rede)
   API_KEY_REQUIRED=false
   API_KEY=sua-chave-secreta
   ALLOWED_ORIGINS=http://localhost:5173
   NODE_ENV=development
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

> **Nota sobre Timeout:** O servidor tem um timeout de 10 minutos (600000ms) para acomodar o carregamento pesado de modelos em provedores locais como o LM Studio, especialmente no modo sequencial. Isto evita que ligações sejam terminadas prematuramente durante inferências longas.

---

## 📡 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Verificação de saúde da API (retorna estado de segurança) |
| GET/POST/PUT/DELETE | `/api/agents` | Gestão de agentes (CRUD) |
| GET/POST/PUT/DELETE | `/api/prompts` | Gestão de prompts (CRUD) |
| GET | `/api/prompts/:id/versions` | Histórico de versões |
| GET | `/api/prompts/:id/versions/:version` | Obter versão específica |
| GET | `/api/prompts/search/query?q=` | Pesquisa de prompts |
| GET | `/api/prompts/export/all` | Exportar todos os prompts |
| POST | `/api/prompts/import/all` | Importar prompts |
| POST | `/api/test/run` | Executar teste (suporta `maxTokens`, `thinkingEnabled`) |
| GET | `/api/test/runs` | Listar testes (paginação cursor-based) |
| POST | `/api/test/compare` | Comparação A/B de versões do mesmo prompt |
| PUT | `/api/test/compare/:id/winner` | Definir vencedor da comparação A/B |
| POST | `/api/test/dual-run` | Duelo de modelos (suporta `maxTokens`, `thinkingEnabled`, `sequential`) |
| POST | `/api/test/judge` | Avaliação do Juiz IA sobre dois outputs |
| GET | `/api/dual-runs` | Histórico de duelos (paginado) |
| GET | `/api/dual-runs/:id` | Obter resultado individual de duelo |
| PUT | `/api/dual-runs/:id/winner` | Definir vencedor e guardar resultado do Juiz |
| GET/POST/PUT/DELETE | `/api/judge-criteria` | Critérios do Juiz IA |
| GET | `/api/models` | Listar modelos de todos os providers |
| GET | `/api/models/:provider` | Listar modelos de um provider (com cache 60s) |

---

Aproveite ao máximo a suite para encontrar os melhores Prompts Sistêmicos com os modelos ideais!
