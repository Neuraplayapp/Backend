-- NeuraPlay AI Platform - Production Database Setup
-- Run this script on your PostgreSQL database to set up all required tables and indexes

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create users and sessions tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create AI conversation and memory tables
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    mode VARCHAR(50) DEFAULT 'chat', -- chat, agent, tool-calling, socratic_chat, creative_writing
    status VARCHAR(50) DEFAULT 'active', -- active, archived, deleted
    context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    intent_analysis JSONB,
    tool_calls JSONB,
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create memory and context tables
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    memory_key VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, memory_key)
);

-- Create AI analytics and performance tables
CREATE TABLE IF NOT EXISTS ai_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    request_type VARCHAR(50) NOT NULL, -- llm, image_gen, tts, stt, search, tool
    service_provider VARCHAR(100), -- fireworks, elevenlabs, assemblyai, serper
    input_tokens INTEGER,
    output_tokens INTEGER,
    execution_time_ms INTEGER,
    cost_usd DECIMAL(10,6),
    status VARCHAR(50), -- success, error, timeout
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL, -- healthy, degraded, down
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create canvas and collaboration tables
CREATE TABLE IF NOT EXISTS canvas_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    document_type VARCHAR(50), -- text, code, diagram, chart
    language VARCHAR(50), -- programming language for code documents
    sharing_mode VARCHAR(50) DEFAULT 'private', -- private, shared, public
    version INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canvas_collaborations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES canvas_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer', -- owner, editor, viewer
    permissions JSONB DEFAULT '{}',
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Create game and learning progress tables
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_name VARCHAR(100) NOT NULL,
    session_data JSONB NOT NULL DEFAULT '{}',
    score INTEGER DEFAULT 0,
    level_reached INTEGER DEFAULT 1,
    time_played_seconds INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, abandoned
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_id ON user_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memories_key ON user_memories(memory_key);
CREATE INDEX IF NOT EXISTS idx_user_memories_tags ON user_memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_user_memories_content_fts ON user_memories USING GIN(to_tsvector('english', content));

CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_type ON ai_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_requests_status ON ai_requests(status);

CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service_name);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_checked_at ON system_health(checked_at);

CREATE INDEX IF NOT EXISTS idx_canvas_documents_user_id ON canvas_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_documents_type ON canvas_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_canvas_documents_updated_at ON canvas_documents(updated_at);

CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_name ON game_sessions(game_name);
CREATE INDEX IF NOT EXISTS idx_game_sessions_status ON game_sessions(status);

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_memories_updated_at BEFORE UPDATE ON user_memories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_documents_updated_at BEFORE UPDATE ON canvas_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system health checks
INSERT INTO system_health (service_name, status, response_time_ms, metadata) VALUES
('database', 'healthy', 0, '{"version": "15.0", "connections": 0}'),
('redis', 'healthy', 0, '{"version": "6.0", "memory_usage": "0MB"}'),
('ai_router', 'healthy', 0, '{"version": "2.0", "mode_handlers": 5}'),
('fireworks_api', 'healthy', 0, '{"models": ["llama-3.1-8b", "flux-schnell"]}'),
('elevenlabs_api', 'healthy', 0, '{"voices": 5, "characters_used": 0}'),
('assemblyai_api', 'healthy', 0, '{"languages": 65, "accuracy": "95%"}'),
('serper_api', 'healthy', 0, '{"search_quota": 1000, "used": 0}')
ON CONFLICT DO NOTHING;

-- Create admin user (default credentials - change in production!)
INSERT INTO users (email, username, password_hash, full_name, is_verified, preferences) VALUES
('admin@neuraplay.biz', 'admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeZPMWU8jn.lUfeNq', 'NeuraPlay Admin', true, '{"role": "admin", "permissions": ["all"]}')
ON CONFLICT (email) DO NOTHING;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO current_user;

-- Create materialized view for analytics (optional, for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_ai_usage AS
SELECT 
    DATE(created_at) as usage_date,
    request_type,
    service_provider,
    COUNT(*) as request_count,
    SUM(input_tokens) as total_input_tokens,
    SUM(output_tokens) as total_output_tokens,
    AVG(execution_time_ms) as avg_execution_time,
    SUM(cost_usd) as total_cost
FROM ai_requests 
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), request_type, service_provider
ORDER BY usage_date DESC, request_count DESC;

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW daily_ai_usage;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ NeuraPlay AI Platform database setup completed successfully!';
    RAISE NOTICE '📊 Tables created: users, conversations, messages, memories, analytics, canvas, games';
    RAISE NOTICE '🔍 Indexes created for optimal performance';
    RAISE NOTICE '⚡ Triggers set up for automatic timestamp updates';
    RAISE NOTICE '🎯 Default admin user: admin@neuraplay.biz (password: admin123 - CHANGE THIS!)';
    RAISE NOTICE '📈 Analytics views created for monitoring';
END $$;
