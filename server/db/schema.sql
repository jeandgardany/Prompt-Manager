-- ===========================================
-- Prompt Manager - Database Schema
-- ===========================================

-- Agentes (bots)
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(10) DEFAULT '🤖',
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts (current versions)
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT DEFAULT '',
    current_version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version history (immutable)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT DEFAULT '',
    change_note TEXT DEFAULT 'Versão inicial',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prompt_id, version)
);

-- Test runs
CREATE TABLE IF NOT EXISTS test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    version_number INT,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(200) NOT NULL,
    variables JSONB DEFAULT '{}',
    input_messages JSONB NOT NULL,
    output TEXT NOT NULL,
    tokens_used INT DEFAULT 0,
    latency_ms INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- A/B Comparisons
CREATE TABLE IF NOT EXISTS ab_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
    version_a INT NOT NULL,
    version_b INT NOT NULL,
    test_run_a UUID REFERENCES test_runs(id) ON DELETE SET NULL,
    test_run_b UUID REFERENCES test_runs(id) ON DELETE SET NULL,
    winner VARCHAR(1),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompts_agent ON prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_prompt ON test_runs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_version ON test_runs(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_ab_prompt ON ab_comparisons(prompt_id);

-- Dual Run Results (persisted A/B model comparisons)
CREATE TABLE IF NOT EXISTS dual_run_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
    prompt_version_id UUID REFERENCES prompt_versions(id) ON DELETE SET NULL,
    version_number INT,
    provider_a VARCHAR(50) NOT NULL,
    model_a VARCHAR(200) NOT NULL,
    provider_b VARCHAR(50) NOT NULL,
    model_b VARCHAR(200) NOT NULL,
    variables JSONB DEFAULT '{}',
    input_images JSONB DEFAULT '[]',
    output_a TEXT,
    output_b TEXT,
    tokens_a INT DEFAULT 0,
    tokens_b INT DEFAULT 0,
    latency_a_ms INT DEFAULT 0,
    latency_b_ms INT DEFAULT 0,
    error_a TEXT,
    error_b TEXT,
    winner VARCHAR(1),
    judge_result TEXT,
    judge_model VARCHAR(200),
    sequential BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dual_runs_prompt ON dual_run_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_dual_runs_created ON dual_run_results(created_at DESC);

-- Judge Criteria (configurable evaluation criteria)
CREATE TABLE IF NOT EXISTS judge_criteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    weight INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default criteria
INSERT INTO judge_criteria (name, description, weight) VALUES
    ('Relevância', 'Quão bem responde ao pedido', 2),
    ('Qualidade', 'Clareza, profundidade e utilidade', 2),
    ('Criatividade', 'Originalidade e abordagem', 1),
    ('Precisão', 'Exatidão factual e técnica', 2),
    ('Tom/Estilo', 'Adequação ao contexto', 1)
ON CONFLICT DO NOTHING;

-- Seed agents
INSERT INTO agents (name, description, icon, color) VALUES
    ('AIA', 'Assistente Inteligente de Atendimento', '🧠', '#6366f1'),
    ('DAIA', 'Digital AI Assistant', '⚡', '#8b5cf6'),
    ('Blogs', 'Gerador de conteúdo para blogs', '✍️', '#14b8a6')
ON CONFLICT (name) DO NOTHING;
