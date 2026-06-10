-- ============================================================
-- Recruta ATS – Schema completo
-- Execute no SQL Editor do Supabase (Project > SQL Editor > New query)
-- ============================================================

-- Vagas
CREATE TABLE IF NOT EXISTS vagas (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT        NOT NULL,
  empresa      TEXT        NOT NULL,
  descricao    TEXT,
  requisitos   TEXT,
  diferenciais TEXT,
  status       TEXT        NOT NULL DEFAULT 'ABERTA',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidatos
CREATE TABLE IF NOT EXISTS candidatos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT        NOT NULL,
  email      TEXT        UNIQUE NOT NULL,
  cargo      TEXT,
  curriculo  TEXT,
  status     TEXT        NOT NULL DEFAULT 'DISPONIVEL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pipeline (candidato × vaga × etapa com score de IA)
CREATE TABLE IF NOT EXISTS pipeline (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id      UUID        REFERENCES vagas(id)      ON DELETE CASCADE,
  candidato_id UUID        REFERENCES candidatos(id) ON DELETE CASCADE,
  etapa        TEXT        NOT NULL DEFAULT 'TRIAGEM',
  score_ia     INTEGER,
  relatorio_ia TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clientes (CRM Comercial)
CREATE TABLE IF NOT EXISTS clientes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa       TEXT        NOT NULL,
  contato_nome  TEXT,
  contato_email TEXT,
  vagas_ativas  INTEGER     DEFAULT 0,
  receita       DECIMAL     DEFAULT 0,
  status        TEXT        DEFAULT 'PROSPECT',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cobranças
CREATE TABLE IF NOT EXISTS cobrancas (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao  TEXT        NOT NULL,
  valor      DECIMAL     NOT NULL,
  status     TEXT        DEFAULT 'PENDENTE',
  vencimento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eventos (Agenda)
CREATE TABLE IF NOT EXISTS eventos (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo     TEXT        NOT NULL,
  descricao  TEXT,
  data       TIMESTAMPTZ NOT NULL,
  tipo       TEXT        DEFAULT 'REUNIAO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (acesso anônimo para desenvolvimento)
-- ============================================================
ALTER TABLE vagas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dev_all_vagas"
  ON vagas FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_all_candidatos"
  ON candidatos FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_all_pipeline"
  ON pipeline FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_clientes_all"
  ON clientes FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_cobrancas_all"
  ON cobrancas FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "dev_eventos_all"
  ON eventos FOR ALL TO anon USING (true) WITH CHECK (true);
