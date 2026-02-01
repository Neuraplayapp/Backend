/**
 * 🧠 NEURAL SPACED MASTERY - API ROUTES
 * 
 * Server-side ML-powered spaced repetition
 * Works on iOS, Android, and Web
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../../services/database.cjs');
const mlService = require('../ml/MLService.cjs');

/**
 * POST /api/ml/schedule-review
 * 
 * Schedule next review using Neural SM algorithm
 */
router.post('/schedule-review', async (req, res) => {
  const client = await pool().connect();
  
  try {
    const { 
      userId, 
      itemId,
      courseId,
      competencyId,
      feedback, // 'forgot' | 'hard' | 'good' | 'easy'
      responseTime, // milliseconds
      context, // optional: session info, time of day, etc.
      quizData // optional: { score, totalQuestions, questionsCorrect, timePerQuestion }
    } = req.body;
    
    if (!userId || !itemId || !feedback || responseTime === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, itemId, feedback, responseTime'
      });
    }
    
    // Get current practice state (or create new)
    let state = await client.query(
      'SELECT * FROM practice_states WHERE user_id = $1 AND item_id = $2',
      [userId, itemId]
    );
    
    let isNewItem = false;
    
    if (state.rows.length === 0) {
      // New item - create initial state
      await client.query(`
        INSERT INTO practice_states (
          user_id, item_id, competency_id, 
          repetitions, ease_factor, interval, 
          next_review_date, total_reviews
        ) VALUES ($1, $2, $3, 0, 2.5, 1, NOW(), 0)
      `, [userId, itemId, competencyId || 'general']);
      
      state = await client.query(
        'SELECT * FROM practice_states WHERE user_id = $1 AND item_id = $2',
        [userId, itemId]
      );
      
      isNewItem = true;
    }
    
    const currentState = state.rows[0];
    
    // Get user's pedagogical profile (competencies, learning pace)
    const profileQuery = await client.query(`
      SELECT 
        COUNT(DISTINCT competency_id) as total_competencies,
        AVG(CASE WHEN correct_reviews > 0 
          THEN CAST(correct_reviews AS FLOAT) / NULLIF(total_reviews, 0) 
          ELSE 0 END) as avg_success_rate,
        AVG(average_response_time) as avg_response_time
      FROM practice_states
      WHERE user_id = $1
    `, [userId]);
    
    const profile = profileQuery.rows[0] || {
      total_competencies: 0,
      avg_success_rate: 0.5,
      avg_response_time: 5000
    };
    
    // Convert feedback to quality (0-5)
    const qualityMap = {
      'forgot': 0,
      'hard': 3,
      'good': 4,
      'easy': 5
    };
    const quality = qualityMap[feedback] || 3;
    
    // ═══════════════════════════════════════════════════════════
    // NEURAL SPACED MASTERY - ML PREDICTION
    // ═══════════════════════════════════════════════════════════
    
    let { repetitions, ease_factor, interval } = currentState;
    let adjustmentReasons = [];
    let predictionMethod = 'rule_based';
    
    // Prepare features for ML model (with quiz-specific data if available)
    const featureData = mlService.prepareFeatures(
      {
        ...currentState,
        itemId,
        repetitions: currentState.repetitions,
        easeFactor: currentState.ease_factor,
        interval: currentState.interval,
        previousInterval: interval,
        firstStudiedDate: currentState.created_at,
        createdAt: currentState.created_at,
        lastReviewDate: currentState.last_reviewed_at
      },
      {
        overallMastery: profile.avg_success_rate,
        competencies: [], // TODO: Fetch from profile
        semanticClusters: [] // TODO: Fetch from profile
      },
      {
        difficulty: 0.5, // TODO: Get from practice_items
        responseTime: responseTime / 1000, // Convert to seconds
        quality,
        isQuiz: !!quizData,
        quizScore: quizData?.score,
        quizTotalQuestions: quizData?.totalQuestions,
        quizCorrectAnswers: quizData?.questionsCorrect
      }
    );
    
    // Try ML prediction first
    const mlPrediction = await mlService.predictInterval(featureData);
    
    if (mlPrediction.success && !mlPrediction.fallback_to_rules) {
      // ✅ USE ML MODEL PREDICTION
      interval = Math.round(mlPrediction.predicted_interval);
      predictionMethod = 'neural_network';
      adjustmentReasons.push(`ml_model_v${mlPrediction.model_version}`);
      
      console.log(`🧠 [ML] Neural network predicted interval: ${interval} days (confidence: ${(mlPrediction.confidence * 100).toFixed(0)}%)`);
      
      // Update ease factor and repetitions based on quality
      ease_factor = Math.max(
        1.3,
        ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      
      if (quality < 3) {
        repetitions = 0;
      } else {
        repetitions += 1;
      }
      
    } else {
      // ❌ FALLBACK TO RULE-BASED SM-2
      console.log(`⚙️ [ML] Falling back to rule-based algorithm: ${mlPrediction.reason || mlPrediction.error}`);
      predictionMethod = 'rule_based_fallback';
      
      // Base SM-2 calculation
      ease_factor = Math.max(
        1.3,
        ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      
      if (quality < 3) {
        repetitions = 0;
        interval = 1;
      } else {
        repetitions += 1;
        if (repetitions === 1) {
          interval = 1;
        } else if (repetitions === 2) {
          interval = 6;
        } else {
          interval = Math.round(interval * ease_factor);
        }
      }
      
      // Contextual adjustments (rule-based)
      let adjustmentFactor = 1.0;
      
      // 1️⃣ Learning Pace
      if (profile.avg_success_rate > 0.75) {
        adjustmentFactor *= 1.3;
        adjustmentReasons.push('fast_learner');
      } else if (profile.avg_success_rate < 0.50) {
        adjustmentFactor *= 0.8;
        adjustmentReasons.push('needs_practice');
      }
      
      // 2️⃣ Response Time Analysis
      if (currentState.average_response_time > 0) {
        const responseRatio = responseTime / currentState.average_response_time;
        if (responseRatio < 0.5) {
          adjustmentFactor *= 1.2;
          adjustmentReasons.push('quick_response');
        } else if (responseRatio > 2.0) {
          adjustmentFactor *= 0.85;
          adjustmentReasons.push('slow_response');
        }
      }
      
      // 3️⃣ Consistency Bonus
      if (currentState.consistency_score > 0.8 && quality >= 4) {
        adjustmentFactor *= 1.15;
        adjustmentReasons.push('consistent_performance');
      }
      
      // 4️⃣ Cramming Penalty
      if (currentState.last_reviewed_at) {
        const hoursSince = (Date.now() - new Date(currentState.last_reviewed_at)) / (1000 * 60 * 60);
        if (hoursSince < 12) {
          adjustmentFactor *= 0.8;
          adjustmentReasons.push('cramming_penalty');
        }
      }
      
      // Apply adjustments
      interval = Math.round(interval * adjustmentFactor);
    }
    
    interval = Math.max(1, interval); // Minimum 1 day
    
    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
    
    // ═══════════════════════════════════════════════════════════
    // UPDATE STATE
    // ═══════════════════════════════════════════════════════════
    
    // Update review history (keep last 20)
    let reviewHistory = currentState.review_history || [];
    reviewHistory.push({
      date: new Date().toISOString(),
      quality,
      responseTime,
      interval
    });
    if (reviewHistory.length > 20) {
      reviewHistory = reviewHistory.slice(-20);
    }
    
    // Calculate new averages
    const totalReviews = currentState.total_reviews + 1;
    const correctReviews = currentState.correct_reviews + (quality >= 3 ? 1 : 0);
    const newAvgResponseTime = Math.round(
      (currentState.average_response_time * currentState.total_reviews + responseTime) / totalReviews
    );
    const newAvgQuality = (
      (currentState.average_quality * currentState.total_reviews + quality) / totalReviews
    ).toFixed(2);
    
    // Calculate consistency (lower variance = higher consistency)
    const qualities = reviewHistory.map(r => r.quality);
    const mean = qualities.reduce((sum, q) => sum + q, 0) / qualities.length;
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / qualities.length;
    const consistency = Math.max(0, 1 - (variance / 25)); // Normalize to 0-1
    
    // Update practice state
    await client.query(`
      UPDATE practice_states
      SET 
        repetitions = $1,
        ease_factor = $2,
        interval = $3,
        next_review_date = $4,
        last_reviewed_at = NOW(),
        total_reviews = $5,
        correct_reviews = $6,
        average_response_time = $7,
        average_quality = $8,
        consistency_score = $9,
        review_history = $10,
        updated_at = NOW()
      WHERE user_id = $11 AND item_id = $12
    `, [
      repetitions,
      ease_factor,
      interval,
      nextReviewDate,
      totalReviews,
      correctReviews,
      newAvgResponseTime,
      newAvgQuality,
      consistency,
      JSON.stringify(reviewHistory),
      userId,
      itemId
    ]);
    
    // ═══════════════════════════════════════════════════════════
    // COLLECT ML TRAINING DATA
    // ═══════════════════════════════════════════════════════════
    
    // Store features and outcome for future model training
    const outcome = {
      next_interval: interval,
      actualRetention: quality >= 3,
      responseQuality: quality,
      responseTime: responseTime
    };
    
    await client.query(`
      INSERT INTO ml_training_data (
        user_id, item_id, feature_data, outcome_data, recorded_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `, [
      userId,
      itemId,
      JSON.stringify(featureData),
      JSON.stringify(outcome)
    ]);
    
    // ═══════════════════════════════════════════════════════════
    // RESPONSE
    // ═══════════════════════════════════════════════════════════
    
    res.json({
      success: true,
      result: {
        interval,
        nextReviewDate: nextReviewDate.toISOString(),
        repetitions,
        easeFactor: ease_factor,
        confidence: Math.min(1, totalReviews / 10), // Confidence grows with reviews
        method: predictionMethod,
        adjustmentReason: adjustmentReasons.join(', ') || 'standard_sm2',
        stats: {
          totalReviews,
          correctReviews,
          successRate: (correctReviews / totalReviews * 100).toFixed(1) + '%',
          avgResponseTime: newAvgResponseTime,
          consistency: (consistency * 100).toFixed(1) + '%'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ [ML Schedule] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule review',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ml/due-items
 * 
 * Get practice items due for review
 */
router.get('/due-items/:userId', async (req, res) => {
  const client = await pool().connect();
  
  try {
    const { userId } = req.params;
    const { limit = 20 } = req.query;
    
    const result = await client.query(`
      SELECT 
        ps.*,
        pi.question_text,
        pi.concept,
        pi.difficulty,
        pi.competency_id
      FROM practice_states ps
      JOIN practice_items pi ON ps.item_id = pi.id
      WHERE ps.user_id = $1 
        AND ps.next_review_date <= NOW()
      ORDER BY ps.next_review_date ASC
      LIMIT $2
    `, [userId, limit]);
    
    res.json({
      success: true,
      dueItems: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ [ML Due Items] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch due items'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/ml/register-item
 * 
 * Register a new practice item with semantic embedding
 */
router.post('/register-item', async (req, res) => {
  const client = await pool().connect();
  
  try {
    const {
      itemId,
      userId,
      courseId,
      competencyId,
      questionText,
      answerText,
      difficulty = 0.5,
      concept,
      questionType = 'single_question', // 'single_question' | 'quiz_chunk'
      quizMetadata, // For quiz chunks: { totalQuestions, chunkId, sectionTitle }
      embedding // 384-dimensional vector
    } = req.body;
    
    if (!itemId || !userId || !courseId || !questionText) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Convert embedding array to pgvector format
    const embeddingVector = embedding ? `[${embedding.join(',')}]` : null;
    
    await client.query(`
      INSERT INTO practice_items (
        id, user_id, course_id, competency_id,
        question_text, answer_text, question_type, difficulty, concept, embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::vector)
      ON CONFLICT (id) DO UPDATE SET
        question_text = EXCLUDED.question_text,
        updated_at = NOW()
    `, [
      itemId,
      userId,
      courseId,
      competencyId || 'general',
      questionText,
      answerText,
      questionType,
      difficulty,
      concept,
      embeddingVector
    ]);
    
    res.json({
      success: true,
      itemId,
      questionType
    });
    
  } catch (error) {
    console.error('❌ [ML Register Item] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register practice item'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/ml/register-quiz-chunk
 * 
 * Register an entire quiz chunk with all questions
 * Useful for tracking quiz completion as a unit
 */
router.post('/register-quiz-chunk', async (req, res) => {
  const client = await pool().connect();
  
  try {
    const {
      userId,
      courseId,
      competencyId,
      chunkId,
      sectionTitle,
      chunkTitle,
      questions, // Array of { questionId, questionText, correctAnswer }
      difficulty = 0.5
    } = req.body;
    
    if (!userId || !courseId || !chunkId || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const registeredItems = [];
    
    // Register each question as a practice item
    for (const q of questions) {
      const itemId = `${chunkId}_${q.questionId}`;
      
      await client.query(`
        INSERT INTO practice_items (
          id, user_id, course_id, competency_id,
          question_text, answer_text, question_type, difficulty, concept
        ) VALUES ($1, $2, $3, $4, $5, $6, 'quiz_chunk', $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          question_text = EXCLUDED.question_text,
          updated_at = NOW()
      `, [
        itemId,
        userId,
        courseId,
        competencyId || 'general',
        q.questionText,
        q.correctAnswer,
        difficulty,
        `${sectionTitle} - ${chunkTitle}`
      ]);
      
      registeredItems.push(itemId);
    }
    
    res.json({
      success: true,
      chunkId,
      registeredItems: registeredItems.length,
      itemIds: registeredItems
    });
    
  } catch (error) {
    console.error('❌ [ML Register Quiz Chunk] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register quiz chunk'
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/ml/stats/:userId
 * 
 * Get user's learning statistics
 */
router.get('/stats/:userId', async (req, res) => {
  const client = await pool().connect();
  
  try {
    const { userId } = req.params;
    
    const stats = await client.query(`
      SELECT 
        COUNT(*) as total_items,
        SUM(CASE WHEN next_review_date <= NOW() THEN 1 ELSE 0 END) as due_today,
        AVG(CAST(correct_reviews AS FLOAT) / NULLIF(total_reviews, 0)) as success_rate,
        AVG(interval) as avg_interval,
        COUNT(DISTINCT competency_id) as competencies_tracked
      FROM practice_states
      WHERE user_id = $1
    `, [userId]);
    
    const mlDataCount = await client.query(`
      SELECT COUNT(*) as training_examples
      FROM ml_training_data
      WHERE user_id = $1
    `, [userId]);
    
    res.json({
      success: true,
      stats: {
        ...stats.rows[0],
        trainingExamples: parseInt(mlDataCount.rows[0].training_examples),
        successRate: (parseFloat(stats.rows[0].success_rate || 0) * 100).toFixed(1) + '%'
      }
    });
    
  } catch (error) {
    console.error('❌ [ML Stats] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/ml/train-model
 * 
 * Train the ML model on collected data
 */
router.post('/train-model', async (req, res) => {
  try {
    const { minSamples = 500 } = req.body;
    
    console.log('🧠 [ML Train] Starting model training...');
    
    const result = await mlService.trainModel(minSamples);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Model trained successfully',
        metrics: {
          training_samples: result.training_samples,
          validation_samples: result.validation_samples,
          val_mae: result.val_mae,
          val_loss: result.val_loss
        }
      });
    } else {
      res.json({
        success: false,
        message: result.error,
        samples_collected: result.samples_collected,
        samples_needed: result.samples_needed
      });
    }
    
  } catch (error) {
    console.error('❌ [ML Train] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to train model',
      details: error.message
    });
  }
});

/**
 * GET /api/ml/model-status
 * 
 * Check if ML model is trained and ready
 */
router.get('/model-status', async (req, res) => {
  try {
    const status = await mlService.checkModelStatus();
    res.json(status);
  } catch (error) {
    console.error('❌ [ML Status] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check model status',
      details: error.message
    });
  }
});

module.exports = router;

