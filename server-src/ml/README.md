# Neural Spaced Mastery (NSM) - Real ML System

## 🧠 What Is This?

A **real machine learning system** that learns optimal review intervals from user data, surpassing traditional SM-2/SM-17 algorithms.

### Architecture:
- **Server-Side ML**: Works on iOS, Android, and Web (via API)
- **Neural Network**: 3-layer network predicts optimal review intervals
- **Adaptive Fallback**: Uses rule-based SM-2 until model is trained
- **Continuous Learning**: Improves as more users practice

---

## 📦 Setup Instructions

### 1. Install Python Dependencies

```bash
cd server-src/ml
pip install -r requirements.txt
```

**Dependencies:**
- TensorFlow 2.15.0 (neural network framework)
- NumPy 1.24.3 (numerical operations)
- scikit-learn 1.3.2 (data preprocessing)
- psycopg2-binary 2.9.9 (database connection)

### 2. Environment Variables

Ensure `DATABASE_URL` is set in your environment (already configured in `development.env` or production).

```bash
# Example:
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### 3. Run Database Migration

```bash
node server.cjs
# Migration will run automatically on startup
```

This creates three tables:
- `practice_items` - Questions/content for review
- `practice_states` - SM-2 state per user per item
- `ml_training_data` - Features and outcomes for ML training

---

## 🚀 How It Works

### Phase 1: Data Collection (Immediate)
- Users practice → System logs features + outcomes
- Features: difficulty, mastery, response time, etc. (14 dimensions)
- Outcomes: next interval, retention, quality

### Phase 2: Model Training (After 500+ examples)
- Run training: `POST /api/ml/train-model`
- Neural network learns patterns
- Model saved to `server-src/ml/models/`

### Phase 3: Predictions (After training)
- API automatically uses ML predictions
- Falls back to rule-based if model unavailable
- Continuously collects data for retraining

---

## 🔧 API Endpoints

### Schedule Review (Main Endpoint)
```bash
POST /api/ml/schedule-review
{
  "userId": "user123",
  "itemId": "item456",
  "feedback": "good",  # forgot | hard | good | easy
  "responseTime": 3500,  # milliseconds
  "quizData": {  # optional: for quiz chunks
    "score": 85,
    "totalQuestions": 7,
    "questionsCorrect": 6,
    "timePerQuestion": 12000
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "interval": 7,
    "nextReviewDate": "2025-12-27T...",
    "method": "neural_network",  // or "rule_based_fallback"
    "confidence": 0.85
  }
}
```

### Register Quiz Chunk
```bash
POST /api/ml/register-quiz-chunk
{
  "userId": "user123",
  "courseId": "french_101",
  "competencyId": "french_grammar",
  "chunkId": "section2_chunk5",
  "sectionTitle": "Present Tense Verbs",
  "chunkTitle": "Comprehension Check",
  "questions": [
    {
      "questionId": "q1",
      "questionText": "What does 'Bonjour' mean?",
      "correctAnswer": "Hello"
    },
    {
      "questionId": "q2",
      "questionText": "How do you say 'Thank you'?",
      "correctAnswer": "Merci"
    }
  ],
  "difficulty": 0.6
}
```

### Train Model
```bash
POST /api/ml/train-model
{
  "minSamples": 500
}
```

### Check Model Status
```bash
GET /api/ml/model-status
```

**Response:**
```json
{
  "success": true,
  "model_available": true,
  "trained_at": "2025-12-20T...",
  "training_samples": 1523,
  "validation_mae": 2.4  // Average error in days
}
```

### Get Due Items
```bash
GET /api/ml/due-items/:userId?limit=20
```

### Get User Stats
```bash
GET /api/ml/stats/:userId
```

---

## 🎯 Quiz Chunk Integration

### Overview
Quiz chunks (5-10 questions testing comprehension) are fully supported by the NSM system.

### How It Works:

**1. Register Quiz Questions** (when user completes a course section with quiz)
```javascript
// Register entire quiz chunk
await fetch('/api/ml/register-quiz-chunk', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user123',
    courseId: 'french_basics',
    chunkId: 'section2_quiz',
    sectionTitle: 'Greetings',
    chunkTitle: 'Comprehension Check',
    questions: quizChunk.quizQuestions.map(q => ({
      questionId: q.id,
      questionText: q.question,
      correctAnswer: q.correctAnswer
    })),
    difficulty: 0.6
  })
});
```

**2. Track Quiz Performance** (when user takes the quiz)
```javascript
// After quiz completion
await fetch('/api/ml/schedule-review', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user123',
    itemId: 'section2_quiz',
    feedback: score >= 80 ? 'good' : score >= 60 ? 'hard' : 'forgot',
    responseTime: totalQuizTimeMs,
    quizData: {
      score: 85,
      totalQuestions: 7,
      questionsCorrect: 6,
      timePerQuestion: averageTimePerQuestion
    }
  })
});
```

**3. ML System Adapts**
- Lower quiz scores → shorter review intervals (more practice needed)
- Higher quiz scores → longer intervals (material mastered)
- Time per question affects difficulty assessment
- Quiz performance influences future content difficulty

### Quiz-Specific Features:
The ML model considers 3 additional features for quizzes:
- `is_quiz` (0 or 1)
- `quiz_score` (0-100)
- `quiz_questions_count` (total questions)

This allows the model to distinguish between:
- Single-question practice (standard)
- Multi-question quizzes (comprehensive check)

---

## 📱 Mobile Compatibility

✅ **Works on iOS, Android, Web**

The ML system runs **server-side**, so mobile apps just call the API:

```javascript
// From any client (React Native, Swift, Kotlin, etc.)
fetch('https://your-api.com/api/ml/schedule-review', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    itemId: 'item456',
    feedback: 'good',
    responseTime: 3500
  })
});
```

No ML libraries needed on mobile devices!

---

## 🧪 Testing

### 1. Manual Testing
```bash
# Check model status
curl http://localhost:3001/api/ml/model-status

# Schedule a review
curl -X POST http://localhost:3001/api/ml/schedule-review \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "itemId": "test_item",
    "feedback": "good",
    "responseTime": 3000
  }'
```

### 2. Python CLI Testing
```bash
# Check model status
cd server-src/ml
python3 predict.py status

# Test prediction (after model is trained)
echo '{"user_mastery": 0.7, "quality_rating": 4, ...}' | python3 predict.py predict
```

---

## 🔄 Retraining

The model should be retrained periodically as more data is collected:

```bash
# Manual retraining
curl -X POST http://localhost:3001/api/ml/train-model

# Or via Python directly
cd server-src/ml
python3 train_model.py
```

**Recommended:** Retrain weekly once you have 1000+ examples.

---

## 📊 Model Performance

**Target Metrics:**
- MAE (Mean Absolute Error): < 3 days
- Validation Loss: < 10

**Interpretability:**
- If model predicts 7 days and actual optimal was 5 days → MAE contribution = 2 days

---

## 🎯 Advantages Over SM-17

| Feature | SM-17 | NSM (This System) |
|---------|-------|-------------------|
| Learning Method | Fixed algorithm | Learns from data |
| Context Awareness | Limited | 14 features |
| Personalization | Generic | Per-user patterns |
| Adaptation | Static | Improves over time |
| Cross-Concept Transfer | No | Semantic clustering |

---

## 🚨 Troubleshooting

### "Model not found" Error
- Model hasn't been trained yet
- System automatically falls back to rule-based algorithm
- Collect 500+ training examples, then run `/api/ml/train-model`

### Python Not Found
```bash
# Set custom Python path
export PYTHON_PATH=/usr/local/bin/python3
```

### TensorFlow Installation Issues
```bash
# Use conda environment (recommended)
conda create -n nsm python=3.10
conda activate nsm
pip install -r requirements.txt
```

### Database Connection Errors
- Ensure `DATABASE_URL` is set correctly
- Check PostgreSQL is running
- Verify migration ran successfully

---

## 📝 File Structure

```
server-src/ml/
├── train_model.py       # Training pipeline
├── predict.py           # Prediction service
├── MLService.cjs        # Node.js bridge to Python
├── requirements.txt     # Python dependencies
├── models/              # Trained models (created after training)
│   ├── nsm_model.keras
│   ├── scaler.pkl
│   └── metadata.json
└── README.md           # This file
```

---

## 🎉 What Makes This "Better Than SM-17"?

1. **Learns from actual user data** (not hardcoded rules)
2. **Adapts to individual learning styles** (fast/slow learners)
3. **Context-aware** (time of day, response speed, consistency)
4. **Semantic clustering** (related concepts boost each other)
5. **Continuous improvement** (retrains as data grows)
6. **Server-side** (works on any device via API)

---

## 📖 Next Steps

1. ✅ Collect training data (automatic, happens during practice)
2. ⏳ Wait for 500+ examples
3. 🧠 Train model: `POST /api/ml/train-model`
4. 🚀 Model automatically activates for predictions
5. 🔄 Retrain periodically as data grows

**The system is ready to go!** It will use rule-based algorithm until enough data is collected for ML training.

