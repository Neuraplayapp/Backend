# ML System - Quiz Integration Update

## 🎯 Changes Made

The ML system (Neural Spaced Mastery) has been updated to fully support quiz chunks with 5-10 questions.

---

## 📊 What Changed:

### 1. **New API Endpoints**

#### `/api/ml/register-quiz-chunk` (POST)
Register an entire quiz chunk with all questions at once.

**Use Case:** When a course section is generated with a quiz chunk, register all questions as practice items.

**Request:**
```json
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
      "questionText": "What does 'être' mean?",
      "correctAnswer": "to be"
    }
  ],
  "difficulty": 0.6
}
```

**Response:**
```json
{
  "success": true,
  "chunkId": "section2_chunk5",
  "registeredItems": 7,
  "itemIds": ["section2_chunk5_q1", "section2_chunk5_q2", ...]
}
```

---

### 2. **Enhanced Schedule-Review Endpoint**

#### `/api/ml/schedule-review` (POST) - Now Accepts Quiz Data

**New Optional Field:** `quizData`

**Request:**
```json
{
  "userId": "user123",
  "itemId": "section2_chunk5",
  "feedback": "good",
  "responseTime": 45000,
  "quizData": {
    "score": 85,
    "totalQuestions": 7,
    "questionsCorrect": 6,
    "timePerQuestion": 6428
  }
}
```

**Impact:**
- Quiz score affects difficulty adjustment
- Low scores → shorter intervals (more practice)
- High scores → longer intervals (mastery demonstrated)

---

### 3. **ML Model Updates**

#### Added 3 New Features (17 total, was 14):
1. **`is_quiz`** (0 or 1) - Distinguishes quiz chunks from single questions
2. **`quiz_score`** (0-100) - Overall quiz performance
3. **`quiz_questions_count`** (0+) - Number of questions in quiz

#### Updated Files:
- `server-src/ml/train_model.py` - Training pipeline
- `server-src/ml/predict.py` - Prediction service
- `server-src/ml/MLService.cjs` - Feature preparation
- `server-src/routes/ml-spaced-repetition.cjs` - API routes

---

### 4. **Intelligent Difficulty Adjustment**

The ML system now adjusts item difficulty based on quiz performance:

```javascript
// Low quiz score → Higher difficulty
score < 50% → difficulty × 1.5

// High quiz score → Lower difficulty
score > 80% → difficulty × 0.7

// This affects review interval predictions
```

---

## 🔌 How to Integrate with Frontend

### When User Completes Quiz:

```javascript
// In QuizChunkViewer.tsx or similar

const handleQuizComplete = async (score, correctAnswers, totalQuestions, totalTime) => {
  // Calculate feedback based on score
  const feedback = score >= 80 ? 'easy' : 
                   score >= 60 ? 'good' : 
                   score >= 40 ? 'hard' : 'forgot';
  
  // Send to ML system
  await fetch('/api/ml/schedule-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: user.id,
      itemId: chunkId,
      courseId: courseId,
      competencyId: competencyId,
      feedback: feedback,
      responseTime: totalTime,
      quizData: {
        score: score,
        totalQuestions: totalQuestions,
        questionsCorrect: correctAnswers,
        timePerQuestion: totalTime / totalQuestions
      }
    })
  });
  
  console.log('✅ Quiz performance tracked by ML system');
};
```

### When Course is Generated:

```javascript
// In DynamicCourseBuilder.ts after generating quiz chunks

const registerQuizChunks = async (course, userId) => {
  for (const section of course.sections) {
    const quizChunks = section.chunks.filter(c => c.type === 'quiz');
    
    for (const quiz of quizChunks) {
      await fetch('/api/ml/register-quiz-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          courseId: course.moduleId,
          competencyId: course.competencies?.[0]?.id || 'general',
          chunkId: quiz.id,
          sectionTitle: section.title,
          chunkTitle: quiz.title,
          questions: quiz.quizQuestions.map(q => ({
            questionId: q.id,
            questionText: q.question,
            correctAnswer: q.correctAnswer
          })),
          difficulty: 0.6 // Adjust based on course level
        })
      });
    }
  }
};
```

---

## 📈 Benefits

### 1. **Personalized Review Schedules**
- Students who struggle with quizzes get more frequent reviews
- Students who ace quizzes move forward faster

### 2. **Comprehensive Assessment**
- 5-10 questions per quiz (vs 2-3 before) → better understanding of mastery
- Tracks quiz performance holistically, not just individual questions

### 3. **Adaptive Difficulty**
- ML model learns which quiz formats are harder/easier
- Adjusts expectations based on quiz length and complexity

### 4. **Data-Driven Insights**
- Track which topics have low quiz scores
- Identify struggling competencies
- Optimize course difficulty over time

---

## 🧪 Testing

### Test Quiz Registration:
```bash
curl -X POST http://localhost:3001/api/ml/register-quiz-chunk \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "courseId": "test_course",
    "chunkId": "test_quiz_1",
    "sectionTitle": "Test Section",
    "chunkTitle": "Test Quiz",
    "questions": [
      {"questionId": "q1", "questionText": "Test Q1?", "correctAnswer": "A"},
      {"questionId": "q2", "questionText": "Test Q2?", "correctAnswer": "B"}
    ],
    "difficulty": 0.5
  }'
```

### Test Quiz Performance Tracking:
```bash
curl -X POST http://localhost:3001/api/ml/schedule-review \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "itemId": "test_quiz_1",
    "feedback": "good",
    "responseTime": 30000,
    "quizData": {
      "score": 75,
      "totalQuestions": 8,
      "questionsCorrect": 6,
      "timePerQuestion": 3750
    }
  }'
```

---

## 🚀 Next Steps

1. **Wire Frontend Components**
   - Update `QuizChunkViewer.tsx` to call ML endpoints
   - Update `GenerativeLearningModule.tsx` to register quizzes on course load

2. **Dashboard Integration**
   - Show quiz performance trends
   - Display "due for review" quizzes
   - Track competency mastery based on quiz scores

3. **Train ML Model**
   - Collect 500+ quiz completions
   - Run `POST /api/ml/train-model`
   - System will automatically start using neural network predictions

---

## 📝 Summary

**Before:** ML system only handled single questions
**After:** ML system fully supports quiz chunks with:
- Batch question registration
- Quiz-specific performance tracking
- Difficulty adjustment based on scores
- 17-feature ML model for better predictions

**Status:** ✅ Ready to integrate (backend complete, frontend wiring needed)

