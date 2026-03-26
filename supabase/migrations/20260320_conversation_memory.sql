-- Conversation memory for Telegram bot
-- Stores every message exchange and extracted facts about the user

-- Every message sent/received by the bot
CREATE TABLE IF NOT EXISTS conversation_messages (
    id          bigserial PRIMARY KEY,
    role        text NOT NULL CHECK (role IN ('user', 'assistant')),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- Facts extracted from conversations ("trabaja en X", "le interesa Y")
CREATE TABLE IF NOT EXISTS conversation_facts (
    id          bigserial PRIMARY KEY,
    key         text NOT NULL,
    value       text NOT NULL,
    source      text,                    -- snippet of message that generated this fact
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (key)
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_conv_messages_created ON conversation_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_facts_key ON conversation_facts (key);
