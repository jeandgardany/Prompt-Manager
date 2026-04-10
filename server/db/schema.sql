-- ===========================================
-- Prompt Manager - SQLite Database Schema
-- ===========================================

-- Agentes (bots)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT DEFAULT '🤖',
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Prompts (current versions)
CREATE TABLE IF NOT EXISTS prompts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT DEFAULT '',
    current_version INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Version history (immutable)
CREATE TABLE IF NOT EXISTS prompt_versions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prompt_id TEXT REFERENCES prompts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt_template TEXT DEFAULT '',
    change_note TEXT DEFAULT 'Versão inicial',
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(prompt_id, version)
);

-- Test runs
CREATE TABLE IF NOT EXISTS test_runs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prompt_id TEXT REFERENCES prompts(id) ON DELETE SET NULL,
    prompt_version_id TEXT REFERENCES prompt_versions(id) ON DELETE SET NULL,
    version_number INTEGER,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    variables TEXT DEFAULT '{}',
    input_messages TEXT NOT NULL,
    output TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    latency_ms INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- A/B Comparisons
CREATE TABLE IF NOT EXISTS ab_comparisons (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prompt_id TEXT REFERENCES prompts(id) ON DELETE CASCADE,
    version_a INTEGER NOT NULL,
    version_b INTEGER NOT NULL,
    test_run_a TEXT REFERENCES test_runs(id) ON DELETE SET NULL,
    test_run_b TEXT REFERENCES test_runs(id) ON DELETE SET NULL,
    winner TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Dual Run Results (persisted A/B model comparisons)
CREATE TABLE IF NOT EXISTS dual_run_results (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    prompt_id TEXT REFERENCES prompts(id) ON DELETE SET NULL,
    prompt_version_id TEXT REFERENCES prompt_versions(id) ON DELETE SET NULL,
    version_number INTEGER,
    provider_a TEXT NOT NULL,
    model_a TEXT NOT NULL,
    provider_b TEXT NOT NULL,
    model_b TEXT NOT NULL,
    variables TEXT DEFAULT '{}',
    input_images TEXT DEFAULT '[]',
    output_a TEXT,
    output_b TEXT,
    tokens_a INTEGER DEFAULT 0,
    tokens_b INTEGER DEFAULT 0,
    latency_a_ms INTEGER DEFAULT 0,
    latency_b_ms INTEGER DEFAULT 0,
    error_a TEXT,
    error_b TEXT,
    winner TEXT,
    judge_result TEXT,
    judge_model TEXT,
    sequential INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Judge Criteria (configurable evaluation criteria)
CREATE TABLE IF NOT EXISTS judge_criteria (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    description TEXT,
    weight INTEGER DEFAULT 1,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_prompts_agent ON prompts(agent_id);
CREATE INDEX IF NOT EXISTS idx_versions_prompt ON prompt_versions(prompt_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_prompt ON test_runs(prompt_id);
CREATE INDEX IF NOT EXISTS idx_test_runs_version ON test_runs(prompt_version_id);
CREATE INDEX IF NOT EXISTS idx_ab_prompt ON ab_comparisons(prompt_id);
CREATE INDEX IF NOT EXISTS idx_dual_runs_prompt ON dual_run_results(prompt_id);
CREATE INDEX IF NOT EXISTS idx_dual_runs_created ON dual_run_results(created_at);

-- Seed agents
INSERT OR IGNORE INTO agents (id, name, description, icon, color) VALUES
    (lower(hex(randomblob(16))), 'AIA', 'Assistente Inteligente de Atendimento', '🧠', '#6366f1');
INSERT OR IGNORE INTO agents (id, name, description, icon, color) VALUES
    (lower(hex(randomblob(16))), 'DAIA', 'Digital AI Assistant', '⚡', '#8b5cf6');
INSERT OR IGNORE INTO agents (id, name, description, icon, color) VALUES
    (lower(hex(randomblob(16))), 'Blogs', 'Gerador de conteúdo para blogs', '✍️', '#14b8a6');

-- Seed default judge criteria
INSERT OR IGNORE INTO judge_criteria (id, name, description, weight) VALUES
    (lower(hex(randomblob(16))), 'Relevância', 'Quão bem responde ao pedido', 2);
INSERT OR IGNORE INTO judge_criteria (id, name, description, weight) VALUES
    (lower(hex(randomblob(16))), 'Qualidade', 'Clareza, profundidade e utilidade', 2);
INSERT OR IGNORE INTO judge_criteria (id, name, description, weight) VALUES
    (lower(hex(randomblob(16))), 'Criatividade', 'Originalidade e abordagem', 1);
INSERT OR IGNORE INTO judge_criteria (id, name, description, weight) VALUES
    (lower(hex(randomblob(16))), 'Precisão', 'Exatidão factual e técnica', 2);
INSERT OR IGNORE INTO judge_criteria (id, name, description, weight) VALUES
    (lower(hex(randomblob(16))), 'Tom/Estilo', 'Adequação ao contexto', 1);
