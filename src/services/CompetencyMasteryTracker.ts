/**
 * 🎯 COMPETENCY MASTERY TRACKER
 * 
 * Tracks mastery levels for observable competencies/skills
 * Uses weighted moving average for stable, responsive measurements
 * 
 * INTEGRATES WITH: UserContext and Dashboard progress indicators
 * FEEDS INTO: UnifiedProgressCalculator
 */

export interface CompetencyAssessment {
  date: Date;
  score: number; // 0-100
  source: string; // Practice item ID or assessment ID
  confidence?: number; // 0-1, how confident the measurement is
}

export interface CompetencyProgress {
  competencyId: string;
  competencyName: string;
  currentLevel: number; // 0-100
  masteryThreshold: number; // Usually 80
  trend: 'improving' | 'stable' | 'declining';
  confidence: number; // 0-1, confidence in the mastery level
  assessmentHistory: CompetencyAssessment[];
  recommendation: 'advance' | 'practice' | 'review';
  indicators: string[]; // Observable behaviors
  isBlocked?: boolean; // Blocks progression if below threshold
}

export class CompetencyMasteryTracker {
  /**
   * Calculate current mastery using weighted moving average
   * Recent assessments weighted more heavily
   */
  calculateMastery(
    assessmentHistory: CompetencyAssessment[],
    options: {
      masteryThreshold?: number;
      decayRate?: number; // How quickly old assessments lose weight (0-1)
    } = {}
  ): {
    currentLevel: number;
    trend: 'improving' | 'stable' | 'declining';
    confidence: number;
    recommendation: 'advance' | 'practice' | 'review';
  } {
    const { masteryThreshold = 80, decayRate = 0.1 } = options;

    if (assessmentHistory.length === 0) {
      return {
        currentLevel: 0,
        trend: 'stable',
        confidence: 0,
        recommendation: 'practice'
      };
    }

    // Sort by date (newest first)
    const sorted = [...assessmentHistory].sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );

    // Weighted moving average (recent = more weight)
    let weightedSum = 0;
    let totalWeight = 0;

    sorted.forEach((assessment, index) => {
      const weight = Math.exp(-index * decayRate);
      const assessmentConfidence = assessment.confidence || 1.0;
      const effectiveWeight = weight * assessmentConfidence;

      weightedSum += assessment.score * effectiveWeight;
      totalWeight += effectiveWeight;
    });

    const currentLevel = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Calculate trend (compare recent 5 vs previous 5)
    const trend = this.calculateTrend(sorted);

    // Confidence based on number of assessments and recency
    const confidence = this.calculateConfidence(sorted);

    // Recommendation based on level and trend
    let recommendation: 'advance' | 'practice' | 'review' = 'practice';
    if (currentLevel >= masteryThreshold) {
      recommendation = 'advance';
    } else if (currentLevel < 60 || trend === 'declining') {
      recommendation = 'review';
    }

    return {
      currentLevel,
      trend,
      confidence,
      recommendation
    };
  }

  /**
   * Calculate trend (improving/stable/declining)
   */
  private calculateTrend(
    sortedAssessments: CompetencyAssessment[]
  ): 'improving' | 'stable' | 'declining' {
    if (sortedAssessments.length < 3) return 'stable';

    const recent = sortedAssessments.slice(0, Math.min(5, sortedAssessments.length));
    const recentAvg =
      recent.reduce((sum, a) => sum + a.score, 0) / recent.length;

    if (sortedAssessments.length < 6) {
      // Not enough data for comparison, use absolute threshold
      if (recentAvg >= 75) return 'improving';
      if (recentAvg < 60) return 'declining';
      return 'stable';
    }

    const previous = sortedAssessments.slice(
      5,
      Math.min(10, sortedAssessments.length)
    );
    const previousAvg =
      previous.reduce((sum, a) => sum + a.score, 0) / previous.length;

    const diff = recentAvg - previousAvg;

    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  /**
   * Calculate confidence in mastery measurement
   */
  private calculateConfidence(sortedAssessments: CompetencyAssessment[]): number {
    if (sortedAssessments.length === 0) return 0;

    // Factors:
    // 1. Number of assessments (more = higher confidence)
    // 2. Recency (recent assessments = higher confidence)
    // 3. Consistency (low variance = higher confidence)

    const n = sortedAssessments.length;
    const countFactor = Math.min(1.0, n / 10); // Max out at 10 assessments

    // Recency: How recent is the most recent assessment?
    const daysSinceLatest =
      (Date.now() - sortedAssessments[0].date.getTime()) / (24 * 60 * 60 * 1000);
    const recencyFactor = Math.exp(-daysSinceLatest / 30); // Decay over 30 days

    // Consistency: Standard deviation of recent scores
    const recent = sortedAssessments.slice(0, Math.min(5, n));
    const avg = recent.reduce((sum, a) => sum + a.score, 0) / recent.length;
    const variance =
      recent.reduce((sum, a) => sum + Math.pow(a.score - avg, 2), 0) /
      recent.length;
    const stdDev = Math.sqrt(variance);
    const consistencyFactor = Math.max(0, 1 - stdDev / 50); // High variance = low confidence

    // Combine factors
    const confidence = (countFactor + recencyFactor + consistencyFactor) / 3;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Identify knowledge gaps (competencies below threshold)
   */
  identifyKnowledgeGaps(competencies: CompetencyProgress[]): string[] {
    return competencies
      .filter(c => c.currentLevel < 60)
      .sort((a, b) => a.currentLevel - b.currentLevel)
      .map(c => c.competencyName);
  }

  /**
   * Identify strength areas (competencies above threshold)
   */
  identifyStrengthAreas(competencies: CompetencyProgress[]): string[] {
    return competencies
      .filter(c => c.currentLevel >= 80)
      .sort((a, b) => b.currentLevel - a.currentLevel)
      .map(c => c.competencyName);
  }

  /**
   * Get next recommended action
   */
  getNextAction(competencies: CompetencyProgress[]): string {
    if (competencies.length === 0) {
      return 'Continue learning';
    }

    // Priority 1: Review declining competencies
    const declining = competencies.filter(c => c.trend === 'declining');
    if (declining.length > 0) {
      return `Review ${declining[0].competencyName} (declining performance)`;
    }

    // Priority 2: Address low competencies
    const needsReview = competencies.filter(c => c.recommendation === 'review');
    if (needsReview.length > 0) {
      return `Focus on ${needsReview[0].competencyName} (${needsReview[0].currentLevel}%)`;
    }

    // Priority 3: Practice near-mastery competencies
    const needsPractice = competencies.filter(
      c => c.recommendation === 'practice'
    );
    if (needsPractice.length > 0) {
      return `Practice ${needsPractice[0].competencyName} to reach mastery`;
    }

    // Priority 4: All mastered!
    const canAdvance = competencies.filter(c => c.recommendation === 'advance');
    if (canAdvance.length === competencies.length) {
      return 'All competencies mastered! Ready to advance';
    }

    return 'Continue learning';
  }

  /**
   * Check if learner can advance (all required competencies meet threshold)
   */
  canAdvance(
    requiredCompetencies: CompetencyProgress[]
  ): {
    canAdvance: boolean;
    blockedBy: string[];
    readyCompetencies: string[];
  } {
    const blocked = requiredCompetencies
      .filter(c => c.currentLevel < c.masteryThreshold)
      .map(c => c.competencyName);

    const ready = requiredCompetencies
      .filter(c => c.currentLevel >= c.masteryThreshold)
      .map(c => c.competencyName);

    return {
      canAdvance: blocked.length === 0,
      blockedBy: blocked,
      readyCompetencies: ready
    };
  }

  /**
   * Format for dashboard display
   * FEEDS INTO: Existing progress indicators
   */
  formatForDashboard(competencies: CompetencyProgress[]): {
    overallMastery: number;
    masteredCount: number;
    needsReviewCount: number;
    gaps: string[];
    strengths: string[];
  } {
    const overallMastery =
      competencies.length > 0
        ? Math.round(
            competencies.reduce((sum, c) => sum + c.currentLevel, 0) /
              competencies.length
          )
        : 0;

    const masteredCount = competencies.filter(
      c => c.currentLevel >= c.masteryThreshold
    ).length;

    const needsReviewCount = competencies.filter(
      c => c.recommendation === 'review'
    ).length;

    const gaps = this.identifyKnowledgeGaps(competencies);
    const strengths = this.identifyStrengthAreas(competencies);

    return {
      overallMastery,
      masteredCount,
      needsReviewCount,
      gaps,
      strengths
    };
  }

  /**
   * 📝 RECORD ASSESSMENT
   * Stores a new assessment for a competency
   * Uses localStorage to persist assessment history
   */
  recordAssessment(
    userId: string,
    competencyId: string,
    assessment: {
      date: Date;
      score: number;
      source: string;
      confidence?: number;
    }
  ): void {
    try {
      const storageKey = `competency_assessments_${userId}`;
      const stored = localStorage.getItem(storageKey);
      const assessments: Record<string, CompetencyAssessment[]> = stored 
        ? JSON.parse(stored) 
        : {};

      // Initialize array for this competency if not exists
      if (!assessments[competencyId]) {
        assessments[competencyId] = [];
      }

      // Add the new assessment
      assessments[competencyId].push({
        date: assessment.date,
        score: assessment.score,
        source: assessment.source,
        confidence: assessment.confidence ?? 0.8
      });

      // Keep only last 50 assessments per competency to prevent storage bloat
      if (assessments[competencyId].length > 50) {
        assessments[competencyId] = assessments[competencyId].slice(-50);
      }

      localStorage.setItem(storageKey, JSON.stringify(assessments));
      console.log(`📊 Recorded assessment for ${competencyId}: ${assessment.score}%`);
    } catch (e) {
      console.warn('⚠️ Failed to record competency assessment:', e);
    }
  }

  /**
   * 📖 GET ASSESSMENT HISTORY
   * Retrieves stored assessments for a competency
   */
  getAssessmentHistory(userId: string, competencyId: string): CompetencyAssessment[] {
    try {
      const storageKey = `competency_assessments_${userId}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return [];

      const assessments: Record<string, CompetencyAssessment[]> = JSON.parse(stored);
      const history = assessments[competencyId] || [];

      // Convert date strings back to Date objects
      return history.map(a => ({
        ...a,
        date: new Date(a.date)
      }));
    } catch (e) {
      console.warn('⚠️ Failed to get assessment history:', e);
      return [];
    }
  }

  /**
   * 📊 GET COMPETENCY PROGRESS
   * Builds full competency progress object from stored assessments
   */
  getCompetencyProgress(userId: string, competencyId: string, competencyName?: string): CompetencyProgress {
    const history = this.getAssessmentHistory(userId, competencyId);
    const mastery = this.calculateMastery(history);

    return {
      competencyId,
      competencyName: competencyName || competencyId,
      currentLevel: mastery.currentLevel,
      masteryThreshold: 80,
      trend: mastery.trend,
      confidence: mastery.confidence,
      assessmentHistory: history,
      recommendation: mastery.recommendation,
      indicators: [],
      isBlocked: mastery.currentLevel < 40
    };
  }
}

export const competencyMasteryTracker = new CompetencyMasteryTracker();

