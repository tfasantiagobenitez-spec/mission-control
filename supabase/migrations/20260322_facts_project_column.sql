-- Add project column to conversation_facts
-- NULL = fact global (visible en todos los proyectos)
-- 'drones' = solo visible cuando se analiza ese proyecto

ALTER TABLE conversation_facts ADD COLUMN IF NOT EXISTS project text;

-- Drop old unique constraint on key alone
ALTER TABLE conversation_facts DROP CONSTRAINT IF EXISTS conversation_facts_key_key;

-- New unique constraint: same key can exist per project
ALTER TABLE conversation_facts ADD CONSTRAINT conversation_facts_key_project_unique UNIQUE (key, project);

-- Index for fast project filtering
CREATE INDEX IF NOT EXISTS idx_conv_facts_project ON conversation_facts (project);
