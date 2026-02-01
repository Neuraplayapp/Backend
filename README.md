# Neuraplay Backend - AI-Driven Learning Platform

## 🧠 Architecture Overview

Neuraplay is an AI-driven educational platform with deeply interconnected systems. The key architectural principle is **seamless communication between all modules**.

### Core Integration Points

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  (Canvas Documents, Chat, Courses, Voice Conversation)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                     AI ROUTER (Central Hub)                      │
│  - Intent Analysis (UnifiedCognitiveAnalyzer)                   │
│  - Mode Selection (Chat, Tool-Calling, Canvas, Socratic)        │
│  - Context Management (UnifiedSessionManager)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   CANVAS    │◄──►│    CHAT     │◄──►│   COURSES   │
│  Documents  │    │  Memory &   │    │ Generation  │
│   Charts    │    │  Context    │    │   & Quiz    │
│    Code     │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    VECTOR DATABASE      │
              │  (pgvector + HNSW)      │
              │  - Semantic Search      │
              │  - Memory Embeddings    │
              │  - Course Chunks        │
              └─────────────────────────┘
```

## 🔗 Canvas ↔ Chat Communication

**Canvas and Chat are tightly integrated.** The canvas is NOT a standalone document editor—it communicates bidirectionally with the chat system:

1. **Chat → Canvas**: User requests in chat ("Create a roadmap document") trigger canvas document generation via `CanvasDocumentService`
2. **Canvas → Chat**: Document context flows back to chat for revisions ("Add more sections to the document")
3. **Shared Context**: Both systems share `ConversationService`, `UnifiedSessionManager`, and `VectorSearchService`

### Key Files:
- `src/services/canvas/CanvasDocumentService.ts` - Document generation with LLM
- `src/services/llm/LLMPromptBuilder.ts` - Constructs detailed prompts for canvas
- `src/services/CoreTools.ts` - Tool definitions including `canvas-document-creation`
- `src/services/UniversalCanvasService.ts` - Typewriter & state machine management

## 📚 Course Generation System

### Architecture

```
User Input ("Teach me coaching psychology")
         │
         ▼
┌─────────────────────────────────────┐
│     CourseTypeDetector (LLM)        │
│  - Classifies: language, soft_skills,│
│    technical, academic, creative     │
│  - Hybrid detection for mixed topics │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   CourseStructureComposer           │
│  - Assembles card sequences         │
│  - Uses CardRegistry for patterns   │
│  - Adapts structure to type         │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   DynamicCourseBuilder              │
│  - Generates content chunks         │
│  - Creates quizzes (varied types)   │
│  - Vectorizes for semantic search   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│   CourseStorageService              │
│  - Persists to database             │
│  - Lazy loads sections              │
│  - Manages user progress            │
└─────────────────────────────────────┘
```

### Course Types Supported

| Type | Description | Content Style | Quiz Style |
|------|-------------|---------------|------------|
| **language** | Foreign language learning (Arabic, Spanish, etc.) | Structured tables, vocabulary | Vocabulary-based |
| **soft_skills** | Leadership, coaching, communication, EQ | Narrative scenarios, frameworks | Scenario-based |
| **technical** | Programming, data science, engineering | Code-focused, hands-on | Technical challenges |
| **academic** | Math, physics, history, psychology | Mixed theory/examples | Conceptual |
| **creative** | Art, design, music, writing | Visual, project-based | Conceptual |

### STEM & Soft Skills Handling

The `CourseTypeDetector` uses LLM classification to properly distinguish:
- "Coaching" (topic) → `soft_skills`
- "Python coaching" (coding context) → `technical`
- "Communication for Engineers" → `soft_skills` (skill applied to context)

### Chunk Generation & Vectorization

All course content is chunked and vectorized for semantic search:

```typescript
// ChunkTypes generated per course
chunkTypes: ['hook', 'alphabet', 'vocabulary', 'concept', 'example', 'practice', 'quiz', 'recap']
```

Each chunk is:
1. Generated with appropriate LLM prompts
2. Embedded using Fireworks AI embeddings
3. Stored in pgvector with HNSW indexing
4. Retrievable via semantic similarity search

### Quiz Generation (Varied Question Types)

Quizzes support multiple question formats, all vectorized:

```typescript
type QuizQuestion = {
  type: 'multiple_choice' | 'true_false' | 'fill_blank';
  text: string;
  options?: { text: string; isCorrect: boolean }[];
  correctAnswer?: string;
  concept: string;
  explanation: string;
}
```

## 🎙️ ElevenLabs Voice Integration

### Current Voice Configuration

```typescript
voices: {
  english: '8LVfoRdkh4zgjr8v5ObE',      // Auto for English
  russian: 'RUB3PhT3UqHowKru61Ns',       // Male Russian teacher
  arabic: 'mRdG9GYEjJmIzqbYTidv',        // Female Arabic teacher
  swedish: 'LcBivrWPNJfG7tkEwHPJ',       // Male Swedish teacher
  multilingual: '21m00Tcm4TlvDq8ikWAM',  // Rachel (29 languages)
}
```

### TODO: Teacher Voice Personas

**Intended Implementation:**
- 🇷🇺 **Russian Teacher** - Male voice with authoritative teaching style
- 🇸🇦 **Arabic Teacher** - Female voice with patient, encouraging approach
- 🇸🇪 **Swedish Teacher** - Male voice with clear pronunciation focus
- 🇬🇧 **English Teacher** - Auto-detection, adapts to context

### Course Audio Integration

Courses should integrate ElevenLabs for:
1. Pronunciation guides (language courses)
2. Scenario narration (soft skills)
3. Concept explanations (all types)
4. Quiz question reading

See: `src/config/elevenlabs.ts`, `src/services/VoiceManager.ts`

## 🗄️ Vector Database Architecture

### pgvector + HNSW

```typescript
// VectorSearchService capabilities
- Semantic memory search
- Course chunk retrieval
- Document context lookup
- User preference matching
```

### What Gets Vectorized

| Data Type | Embedding Model | Index Type |
|-----------|-----------------|------------|
| User memories | Fireworks AI | HNSW |
| Course chunks | Fireworks AI | HNSW |
| Quiz questions | Fireworks AI | HNSW |
| Chat history | Fireworks AI | HNSW |
| Canvas documents | Fireworks AI | HNSW |

### Semantic Search Flow

```
User Query → Embed → pgvector HNSW Search → Ranked Results → Context Injection
```

## 🔧 Key Services

### LLM Services (Frontend-Backend Bridge)

| Service | Purpose |
|---------|---------|
| `LLMPromptBuilder` | Constructs context-aware prompts for document/revision generation |
| `LLMTokenManager` | Token limits, complexity detection, truncation handling |
| `LLMResponseParser` | Robust JSON extraction from LLM responses |

### Core Services

| Service | Purpose |
|---------|---------|
| `AIRouter` | Central hub for all AI request routing |
| `UnifiedCognitiveAnalyzer` | Intent analysis, canvas activation detection |
| `ToolRegistry` | Manages all AI tools (search, canvas, memory, etc.) |
| `VectorSearchService` | Semantic search with pgvector |
| `UnifiedSessionManager` | Session context, conversation history |

### Canvas Services

| Service | Purpose |
|---------|---------|
| `CanvasDocumentService` | Document generation & revision |
| `UniversalCanvasService` | Typewriter effect, state management |
| `CanvasStateAdapter` | State machine for element lifecycle |

### Course Services

| Service | Purpose |
|---------|---------|
| `CourseTypeDetector` | LLM-based course classification |
| `CourseStructureComposer` | Card sequence assembly |
| `CourseStorageService` | Database persistence, lazy loading |
| `DynamicCourseBuilder` | Content generation |

## 🚀 Development Setup

### Environment Variables

```bash
# Required
VITE_ELEVENLABS_API_KEY=sk_...
VITE_FIREWORKS_API_KEY=...
DATABASE_URL=postgresql://...

# Optional
VITE_OPENAI_API_KEY=...
```

### Build

```bash
npm install
npm run build
```

### Run Development

```bash
npm run dev
```

## 📋 TODO / Intended Features

### Course Generation Enhancements
- [ ] Complex quiz generation with scenario-based questions
- [ ] Multi-step quiz chains that build on previous answers
- [ ] Vectorized quiz performance tracking
- [ ] Adaptive difficulty based on user performance
- [ ] STEM-specific visualizations (formulas, diagrams)
- [ ] Soft skills scenario branching

### Voice Integration
- [ ] Russian male teacher persona (authoritative)
- [ ] Arabic female teacher persona (encouraging)
- [ ] Swedish male teacher persona (clear pronunciation)
- [ ] English auto-detection with context adaptation
- [ ] Course audio narration for all chunk types
- [ ] Quiz question voice reading

### Canvas-Chat Integration
- [ ] Real-time document updates from chat
- [ ] Chart data injection from conversation
- [ ] Code execution results to canvas
- [ ] Document summarization to chat

### Vector Search Enhancements
- [ ] Cross-course semantic linking
- [ ] User learning path recommendation
- [ ] Quiz performance clustering
- [ ] Memory supersession detection

## 📁 Project Structure

```
src/
├── ai/                    # AI Router, handlers, intent analysis
│   ├── handlers/          # Chat, Tool, Socratic, Vision handlers
│   └── intent/            # Recall, Retrieval, Theory of Mind
├── components/            # React components
│   ├── mobile/            # Mobile-optimized components
│   └── canvas/            # Canvas renderers
├── services/              # Core business logic
│   ├── llm/               # LLM utilities (prompt, token, parser)
│   └── canvas/            # Canvas document services
├── config/                # Configuration (ElevenLabs, models)
├── contexts/              # React contexts (User, Mobile, Theme)
├── hooks/                 # Custom React hooks
├── pages/                 # Page components
├── stores/                # Zustand stores (canvasStore)
└── types/                 # TypeScript type definitions
```

## 📄 License

Proprietary - Neuraplay AB
