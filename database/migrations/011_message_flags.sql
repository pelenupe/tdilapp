-- Migration: 011_message_flags
-- Adds message flagging/moderation table

CREATE TABLE IF NOT EXISTS message_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    reported_by INTEGER NOT NULL,
    reason TEXT,
    message_content TEXT,
    sender_name TEXT,
    status TEXT DEFAULT 'pending',
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reported_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_message_flags_status ON message_flags (status);
CREATE INDEX IF NOT EXISTS idx_message_flags_chat ON message_flags (chat_id);
