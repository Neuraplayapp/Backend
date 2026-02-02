# Services Integration Guide - Quiz Chunks & ML System

## 📋 Overview

This guide shows which services need updates when you wire the ML system to the frontend for quiz tracking.

---

## ✅ Currently Complete (Backend Only)

### 1. **ML System** ✅
- **Location:** `server-src/ml/`, `server-src/routes/ml-spaced-repetition.cjs`
- **Status:** Fully functional, API endpoints ready
- **Capabilities:**
  - Register quiz chunks
  - Track quiz performance
  - Adjust difficulty based on scores
  - 17-feature ML model
- **No changes needed**

### 2. **Course Generator** ✅
- **Location:** `src/services/DynamicCourseBuilder.ts`
- **Status:** Generates quiz chunks with 5-10 questions
- **No changes needed**

### 3. **Quiz Rendering** ✅
- **Location:** `src/components/QuizChunkViewer.tsx`
- **Status:** Displays quizzes, validates answers
- **What's needed:** Add ML API calls (see below)

---

## 🔌 Services That Need Updates (When Wiring Frontend)

### 1. **QuizChunkViewer.tsx** - ADD ML Tracking

**Current:** Quiz completion triggers `onComplete(score, total)` callback  
**Needed:** Call ML API to track performance

**Add this code:**

```typescript
// Inside QuizChunkViewer component

const handleQuizComplete = async (score: number, totalQuestions: number) => {
  // Existing callback
  onComplete(score, totalQuestions);
  
  // 🆕 ADD: Track with ML system
  try {
    const feedback = score >= 80 ? 'easy' : 
                     score >= 60 ? 'good' : 
                     score >= 40 ? 'hard' : 'forgot';
    
    const response = await fetch('/api/ml/schedule-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        itemId: chunk.id,
        courseId: courseId, // Pass from props
        competencyId: competencyId, // Pass from props
        feedback: feedback,
        responseTime: totalQuizTime,
        quizData: {
          score: score,
          totalQuestions: totalQuestions,
          questionsCorrect: correctAnswers,
          timePerQuestion: Math.round(totalQuizTime / totalQuestions)
        }
      })
    });
    
    const result = await response.json();
    console.log('✅ ML tracked quiz:', result);
  } catch (error) {
    console.error('❌ Failed to track quiz with ML:', error);
    // Don't block user if ML fails
  }
};
```

**Props to add:**
```typescript
interface QuizChunkViewerProps {
  // ... existing props
  courseId?: string;  // 🆕 ADD
  competencyId?: string;  // 🆕 ADD
}
```

---

### 2. **GenerativeLearningModule.tsx** - Register Quizzes on Load

**Current:** Loads course from localStorage  
**Needed:** Register quiz chunks with ML system when course loads

**Add this code:**

```typescript
// After loading generated course from localStorage

useEffect(() => {
  const registerQuizChunks = async () => {
    if (!generatedCourse || !user?.id) return;
    
    for (const section of generatedCourse.sections) {
      const quizChunks = section.chunks.filter(c => c.type === 'quiz');
      
      for (const quiz of quizChunks) {
        if (!quiz.quizQuestions || quiz.quizQuestions.length === 0) continue;
        
        try {
          await fetch('/api/ml/register-quiz-chunk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              courseId: generatedCourse.moduleId,
              competencyId: generatedCourse.competencies?.[0]?.id || 'general',
              chunkId: quiz.id,
              sectionTitle: section.title,
              chunkTitle: quiz.title,
              questions: quiz.quizQuestions.map(q => ({
                questionId: q.id,
                questionText: q.question,
                correctAnswer: q.correctAnswer
              })),
              difficulty: section.type === 'introduction' ? 0.4 : 
                          section.type === 'summary' ? 0.7 : 0.5
            })
          });
          
          console.log(`✅ Registered quiz: ${quiz.id}`);
        } catch (error) {
          console.error(`❌ Failed to register quiz ${quiz.id}:`, error);
        }
      }
    }
  };
  
  registerQuizChunks();
}, [generatedCourse, user]);
```

---

### 3. **CompetencyMasteryTracker.ts** - Track Quiz Performance

**Current:** Tracks competency progress from practice states  
**Needed:** Include quiz scores in competency calculations

**Add this method:**

```typescript
/**
 * Update competency level based on quiz performance
 */
async updateFromQuizScore(
  competencyId: string,
  score: number,
  totalQuestions: number,
  chunkId: string
): Promise<void> {
  const existing = await this.getCompetencyProgress(competencyId);
  
  if (!existing) {
    console.warn(`Competency not found: ${competencyId}`);
    return;
  }
  
  // Create quiz assessment
  const assessment: CompetencyAssessment = {
    date: new Date(),
    score: score,
    method: 'quiz',
    context: `Quiz chunk: ${chunkId}, Questions: ${totalQuestions}`
  };
  
  // Add to history
  existing.assessmentHistory.push(assessment);
  
  // Recalculate current level (weighted: quizzes count 2x more than single questions)
  const recentAssessments = existing.assessmentHistory.slice(-10);
  const weightedSum = recentAssessments.reduce((sum, a) => {
    const weight = a.method === 'quiz' ? 2 : 1;
    return sum + (a.score * weight);
  }, 0);
  const totalWeight = recentAssessments.reduce((sum, a) => 
    sum + (a.method === 'quiz' ? 2 : 1), 0
  );
  
  existing.currentLevel = Math.round(weightedSum / totalWeight);
  
  // Update trend
  const last5 = existing.assessmentHistory.slice(-5);
  const avgRecent = last5.reduce((sum, a) => sum + a.score, 0) / last5.length;
  const avg5Before = existing.assessmentHistory.slice(-10, -5).reduce((sum, a) => sum + a.score, 0) / 5;
  
  if (avgRecent > avg5Before + 10) {
    existing.trend = 'improving';
  } else if (avgRecent < avg5Before - 10) {
    existing.trend = 'declining';
  } else {
    existing.trend = 'stable';
  }
  
  // Save updated progress
  await this.saveCompetencyProgress(competencyId, existing);
  
  console.log(`📊 Updated ${competencyId} from quiz: ${existing.currentLevel}% (${existing.trend})`);
}
```

**Call from QuizChunkViewer:**

```typescript
// After quiz completion
if (competencyId) {
  await competencyMasteryTracker.updateFromQuizScore(
    competencyId,
    score,
    totalQuestions,
    chunk.id
  );
}
```

---

### 4. **LearnerPedagogicalProfile.ts** - Include Quiz Data

**Current:** Aggregates data from practice states and competencies  
**Needed:** Fetch quiz performance from ML system

**Add this method:**

```typescript
/**
 * Get quiz performance stats from ML system
 */
private async getQuizStats(userId: string): Promise<{
  totalQuizzes: number;
  avgScore: number;
  recentQuizzes: Array<{ date: Date; score: number; chunkId: string }>;
}> {
  try {
    const response = await fetch(`/api/ml/stats/${userId}`);
    const data = await response.json();
    
    if (!data.success) {
      return { totalQuizzes: 0, avgScore: 0, recentQuizzes: [] };
    }
    
    // Parse quiz-specific stats (you'll need to add this to the ML stats endpoint)
    return {
      totalQuizzes: data.stats.quizCompletions || 0,
      avgScore: data.stats.avgQuizScore || 0,
      recentQuizzes: data.stats.recentQuizzes || []
    };
  } catch (error) {
    console.error('Failed to fetch quiz stats:', error);
    return { totalQuizzes: 0, avgScore: 0, recentQuizzes: [] };
  }
}

/**
 * Update buildProfile to include quiz stats
 */
private async buildProfile(learnerId: string): Promise<LearnerPedagogicalProfile> {
  // ... existing code ...
  
  // 🆕 ADD: Get quiz performance
  const quizStats = await this.getQuizStats(learnerId);
  
  const profile: LearnerPedagogicalProfile = {
    learnerId,
    timestamp: new Date(),
    overallMastery: this.calculateOverallMastery(competencies),
    learningVelocity: this.calculateLearningVelocity(competencies),
    competencies,
    knowledgeGaps: this.identifyKnowledgeGaps(competencies),
    strengths: this.identifyStrengths(competencies),
    strugglingTopics: strugglingTopics,
    recommendedActions: this.generateRecommendations(competencies, strugglingTopics),
    semanticClusters: await semanticClusteringService.getClustersForUser(learnerId),
    // 🆕 ADD: Quiz performance
    quizPerformance: {
      totalCompleted: quizStats.totalQuizzes,
      averageScore: quizStats.avgScore,
      recentScores: quizStats.recentQuizzes.map(q => q.score),
      trend: this.calculateQuizTrend(quizStats.recentQuizzes)
    }
  };
  
  return profile;
}
```

**Update interface:**

```typescript
export interface LearnerPedagogicalProfile {
  // ... existing fields ...
  
  // 🆕 ADD
  quizPerformance?: {
    totalCompleted: number;
    averageScore: number;
    recentScores: number[];
    trend: 'improving' | 'stable' | 'declining';
  };
}
```

---

### 5. **DashboardPage.tsx** - Display Quiz Performance

**Current:** Shows competency progress from profile  
**Needed:** Add quiz performance metrics

**Add this section:**

```tsx
{/* Quiz Performance Section */}
{pedagogicalProfile.quizPerformance && (
  <div className="mb-8">
    <h3 className={`text-xl font-bold mb-4 ${getTextClasses('primary')}`}>
      Quiz Performance
    </h3>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className={`p-4 rounded-xl ${getCardClasses()}`}>
        <div className="text-sm text-gray-500">Quizzes Completed</div>
        <div className="text-3xl font-bold">
          {pedagogicalProfile.quizPerformance.totalCompleted}
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${getCardClasses()}`}>
        <div className="text-sm text-gray-500">Average Score</div>
        <div className="text-3xl font-bold">
          {Math.round(pedagogicalProfile.quizPerformance.averageScore)}%
        </div>
      </div>
      
      <div className={`p-4 rounded-xl ${getCardClasses()}`}>
        <div className="text-sm text-gray-500">Trend</div>
        <div className={`text-3xl font-bold ${
          pedagogicalProfile.quizPerformance.trend === 'improving' ? 'text-green-500' :
          pedagogicalProfile.quizPerformance.trend === 'declining' ? 'text-red-500' :
          'text-yellow-500'
        }`}>
          {pedagogicalProfile.quizPerformance.trend === 'improving' ? '↗' :
           pedagogicalProfile.quizPerformance.trend === 'declining' ? '↘' : '→'}
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 📊 Summary of Changes Needed

| Service | File | Change | Priority |
|---------|------|--------|----------|
| Quiz Viewer | `QuizChunkViewer.tsx` | Add ML API call on completion | **HIGH** |
| Course Loader | `GenerativeLearningModule.tsx` | Register quizzes on load | **HIGH** |
| Competency Tracker | `CompetencyMasteryTracker.ts` | Add quiz score tracking | **MEDIUM** |
| Profile Service | `LearnerPedagogicalProfile.ts` | Fetch quiz stats from ML | **MEDIUM** |
| Dashboard UI | `DashboardPage.tsx` | Display quiz performance | **LOW** |
| ML Stats Endpoint | `ml-spaced-repetition.cjs` | Add quiz-specific stats | **MEDIUM** |

---

## 🧪 Testing Checklist

When you implement the above changes, test:

- [ ] Quiz completion triggers ML API call
- [ ] Quiz scores appear in competency progress
- [ ] Dashboard shows quiz performance metrics
- [ ] ML system schedules reviews based on quiz scores
- [ ] Low quiz scores → shorter intervals
- [ ] High quiz scores → longer intervals
- [ ] Quiz data persists across sessions
- [ ] Multiple quizzes in same course tracked separately

---

## 🚀 Deployment Order

1. **Backend first** (already done ✅)
2. **Core tracking** (QuizChunkViewer + GenerativeLearningModule)
3. **Data aggregation** (CompetencyMasteryTracker + LearnerPedagogicalProfile)
4. **UI display** (DashboardPage)

---

## 📝 Notes

- All changes are **additive** (won't break existing functionality)
- ML tracking is **non-blocking** (errors won't stop quiz completion)
- System works **locally first** (no server required initially)
- Backend **scales** (ready for thousands of users)

**Status:** Backend complete, frontend integration pending (by design)

