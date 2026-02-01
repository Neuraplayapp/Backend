-- Learning Modules Registry - Dynamic Add-On System
-- Allows creating new learning modules without code changes

CREATE TABLE IF NOT EXISTS learning_modules (
  id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  
  -- Module metadata
  type VARCHAR(20) NOT NULL DEFAULT 'generative' CHECK (type IN ('video', 'interactive', 'reading', 'quiz', 'game', 'generative')),
  duration VARCHAR(50) NOT NULL DEFAULT '20 min',
  thumbnail VARCHAR(500),
  instructor VARCHAR(255) DEFAULT 'AI-Generated Content',
  rating DECIMAL(3,2) DEFAULT 0.0,
  
  -- Content configuration
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  prerequisites JSONB DEFAULT '[]'::jsonb,
  
  -- Display & organization
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  
  -- Indexing for fast queries
  CONSTRAINT valid_rating CHECK (rating >= 0 AND rating <= 5)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_modules_category ON learning_modules(category);
CREATE INDEX IF NOT EXISTS idx_learning_modules_difficulty ON learning_modules(difficulty);
CREATE INDEX IF NOT EXISTS idx_learning_modules_type ON learning_modules(type);
CREATE INDEX IF NOT EXISTS idx_learning_modules_published ON learning_modules(is_published);
CREATE INDEX IF NOT EXISTS idx_learning_modules_featured ON learning_modules(is_featured);
CREATE INDEX IF NOT EXISTS idx_learning_modules_display_order ON learning_modules(display_order);

-- Full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_learning_modules_search ON learning_modules 
  USING gin(to_tsvector('english', title || ' ' || description || ' ' || subject));

-- Insert default modules (the existing ones)
INSERT INTO learning_modules (id, title, description, subject, category, difficulty, type, duration, thumbnail, skills, rating, instructor, topics, learning_objectives, is_featured, display_order) VALUES
(
  'learning-arabic',
  'Learning Arabic',
  'Discover the beauty of Arabic language through interactive lessons and AI-powered personalization.',
  'Arabic Language',
  'Language',
  'Beginner',
  'generative',
  '25 min',
  '/assets/images/Neuraplaybrain.png',
  '["Language Learning", "Arabic Alphabet", "Pronunciation", "Vocabulary"]'::jsonb,
  4.9,
  'AI-Generated Content',
  '["Arabic Alphabet", "Basic Pronunciation", "Common Phrases", "Writing System"]'::jsonb,
  '["Master the Arabic alphabet and letter forms", "Learn basic pronunciation rules", "Build foundational vocabulary", "Understand right-to-left writing", "Practice common greetings and phrases"]'::jsonb,
  true,
  1
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO learning_modules (id, title, description, subject, category, difficulty, type, duration, thumbnail, skills, rating, instructor, topics, learning_objectives, display_order) VALUES
(
  'memory-techniques',
  'Introduction to Memory Techniques',
  'Learn powerful memory techniques to improve your learning efficiency and retention through personalized AI instruction.',
  'Memory Techniques',
  'Memory',
  'Beginner',
  'generative',
  '20 min',
  '/assets/images/Neuraplaybrain.png',
  '["Working Memory", "Visual Memory", "Sequential Processing", "Mnemonics"]'::jsonb,
  4.8,
  'AI-Generated Content',
  '["Memory Palace", "Chunking", "Association", "Visualization", "Spaced Repetition"]'::jsonb,
  '["Understand how memory works", "Master the Memory Palace technique", "Learn effective chunking strategies", "Apply visualization for better retention", "Use spaced repetition effectively"]'::jsonb,
  true,
  2
) ON CONFLICT (id) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learning_modules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS learning_modules_updated_at ON learning_modules;
CREATE TRIGGER learning_modules_updated_at
  BEFORE UPDATE ON learning_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_learning_modules_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON learning_modules TO your_app_user;





