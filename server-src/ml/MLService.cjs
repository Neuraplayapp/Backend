/**
 * ML Service - Bridge between Node.js and Python ML model
 * Calls Python prediction service and handles fallbacks
 */

const { spawn } = require('child_process');
const path = require('path');

class MLService {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.predictScriptPath = path.join(__dirname, 'predict.py');
    this.trainScriptPath = path.join(__dirname, 'train_model.py');
    this.modelAvailable = null; // Cache model status
  }

  /**
   * Call Python script and return parsed JSON result
   */
  async callPython(scriptPath, args = [], inputData = null) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.pythonPath, [scriptPath, ...args]);
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });
      
      // Send input data if provided
      if (inputData) {
        process.stdin.write(JSON.stringify(inputData));
        process.stdin.end();
      }
    });
  }

  /**
   * Check if ML model is trained and available
   */
  async checkModelStatus() {
    try {
      const result = await this.callPython(this.predictScriptPath, ['status']);
      this.modelAvailable = result.model_available;
      return result;
    } catch (error) {
      console.error('❌ [ML Service] Failed to check model status:', error.message);
      this.modelAvailable = false;
      return {
        success: false,
        model_available: false,
        error: error.message
      };
    }
  }

  /**
   * Predict optimal review interval using ML model
   */
  async predictInterval(featureData) {
    try {
      // Check model status (cached)
      if (this.modelAvailable === null) {
        await this.checkModelStatus();
      }
      
      // If model not available, return fallback signal
      if (!this.modelAvailable) {
        return {
          success: false,
          fallback_to_rules: true,
          reason: 'Model not trained yet'
        };
      }
      
      // Call Python prediction service
      const result = await this.callPython(
        this.predictScriptPath,
        ['predict'],
        featureData
      );
      
      return result;
      
    } catch (error) {
      console.error('❌ [ML Service] Prediction failed:', error.message);
      return {
        success: false,
        fallback_to_rules: true,
        error: error.message
      };
    }
  }

  /**
   * Train the ML model (run asynchronously)
   */
  async trainModel(minSamples = 500) {
    try {
      console.log('🧠 [ML Service] Starting model training...');
      
      const result = await this.callPython(this.trainScriptPath, []);
      
      if (result.success) {
        console.log(`✅ [ML Service] Model trained successfully! MAE: ${result.val_mae?.toFixed(2)} days`);
        this.modelAvailable = true;
      } else {
        console.log(`⏳ [ML Service] Not enough data: ${result.samples_collected}/${result.samples_needed}`);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ [ML Service] Training failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Prepare feature data from practice state and profile
   */
  prepareFeatures(practiceState, profile, metadata) {
    const now = new Date();
    const learningStartDate = practiceState.firstStudiedDate || practiceState.createdAt;
    const daysSinceLearningStart = Math.floor(
      (now - new Date(learningStartDate)) / (1000 * 60 * 60 * 24)
    );
    
    // Calculate days since last review
    const lastReviewDate = practiceState.lastReviewDate || practiceState.createdAt;
    const daysSinceLastReview = Math.floor(
      (now - new Date(lastReviewDate)) / (1000 * 60 * 60 * 24)
    );
    
    // Get learning pace from profile
    const learningPace = this.inferLearningPace(profile);
    
    // Get cluster mastery (average mastery of related items)
    const clusterMastery = this.getClusterMastery(practiceState.itemId, profile);
    
    // Calculate quiz-adjusted difficulty if this is a quiz
    let adjustedDifficulty = metadata?.difficulty || 0.5;
    if (metadata?.isQuiz && metadata?.quizScore !== undefined) {
      // Quiz performance affects perceived difficulty
      // Low score (< 50%) → higher difficulty
      // High score (> 80%) → lower difficulty
      const scoreRatio = metadata.quizScore / 100;
      adjustedDifficulty = metadata.difficulty * (1.5 - scoreRatio); // Range: 0.5-1.5x base difficulty
      adjustedDifficulty = Math.max(0.1, Math.min(1.0, adjustedDifficulty));
    }
    
    return {
      item_difficulty: adjustedDifficulty,
      user_mastery: profile?.overallMastery || 0.5,
      days_since_last_review: daysSinceLastReview,
      response_time_seconds: metadata?.responseTime || 5,
      quality_rating: metadata?.quality || 3,
      repetition_count: practiceState.repetitions || 0,
      current_ease_factor: practiceState.easeFactor || 2.5,
      current_interval: practiceState.interval || 1,
      hour_of_day: now.getHours(),
      day_of_week: now.getDay(),
      time_since_learning_start: daysSinceLearningStart,
      previous_interval: practiceState.previousInterval || 0,
      learning_pace: learningPace,
      cluster_mastery: clusterMastery,
      // Quiz-specific features (0 if not a quiz)
      is_quiz: metadata?.isQuiz ? 1 : 0,
      quiz_score: metadata?.quizScore || 0,
      quiz_questions_count: metadata?.quizTotalQuestions || 0
    };
  }

  /**
   * Infer learning pace from profile data
   */
  inferLearningPace(profile) {
    if (!profile || !profile.competencies) return 'medium';
    
    // Calculate average improvement trend
    const improvements = profile.competencies.filter(c => c.trend === 'improving').length;
    const total = profile.competencies.length;
    
    if (total === 0) return 'medium';
    
    const improvementRate = improvements / total;
    
    if (improvementRate > 0.6) return 'fast';
    if (improvementRate < 0.3) return 'slow';
    return 'medium';
  }

  /**
   * Get average mastery of semantically related items
   */
  getClusterMastery(itemId, profile) {
    if (!profile || !profile.semanticClusters) return 0.5;
    
    // Find cluster containing this item
    const cluster = profile.semanticClusters.find(c =>
      c.items.some(item => item.id === itemId)
    );
    
    return cluster ? cluster.averageMastery / 100 : 0.5;
  }
}

// Export singleton instance
module.exports = new MLService();

