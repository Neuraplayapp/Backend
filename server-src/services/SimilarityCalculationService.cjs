/**
 * 🧮 STATE-OF-THE-ART SIMILARITY CALCULATION SERVICE
 * 
 * Advanced mathematical similarity calculations for vector search systems
 * Supports multiple similarity metrics with optimal performance
 * 
 * Features:
 * - Cosine Similarity (default for text embeddings)
 * - Euclidean Distance 
 * - Manhattan Distance
 * - Jaccard Similarity
 * - Semantic Similarity Scoring
 * - Adaptive Thresholding
 * - Performance Optimizations
 */

class SimilarityCalculationService {
  constructor() {
    this.metrics = {
      cosine: this.cosineSimilarity.bind(this),
      euclidean: this.euclideanSimilarity.bind(this),
      manhattan: this.manhattanSimilarity.bind(this),
      jaccard: this.jaccardSimilarity.bind(this),
      semantic: this.semanticSimilarity.bind(this)
    };
    
    this.defaultMetric = 'cosine'; // Best for text embeddings
    this.performanceStats = {
      calculationsPerformed: 0,
      totalTime: 0,
      averageTime: 0
    };
  }

  /**
   * 🎯 PRIMARY SIMILARITY CALCULATION
   * Main entry point for all similarity calculations
   */
  calculateSimilarity(vector1, vector2, metric = this.defaultMetric, options = {}) {
    const startTime = performance.now();
    
    try {
      // Input validation
      if (!this.validateVectors(vector1, vector2)) {
        console.warn('⚠️ SimilarityService: Invalid vectors provided');
        return 0;
      }

      // Normalize vectors if needed
      if (options.normalize !== false) {
        vector1 = this.normalizeVector(vector1);
        vector2 = this.normalizeVector(vector2);
      }

      // Calculate similarity using specified metric
      const similarity = this.metrics[metric](vector1, vector2, options);
      
      // Update performance stats
      const endTime = performance.now();
      this.updatePerformanceStats(endTime - startTime);
      
      // Apply adaptive scoring if enabled
      if (options.adaptiveScoring) {
        return this.applyAdaptiveScoring(similarity, options);
      }
      
      return Math.max(0, Math.min(1, similarity)); // Clamp to [0,1]
      
    } catch (error) {
      console.error('❌ SimilarityService: Calculation failed:', error);
      return 0;
    }
  }

  /**
   * 📐 COSINE SIMILARITY
   * Best for text embeddings and high-dimensional sparse vectors
   * Formula: cos(θ) = (A·B) / (||A|| ||B||)
   */
  cosineSimilarity(vector1, vector2, options = {}) {
    const dotProduct = this.dotProduct(vector1, vector2);
    const magnitude1 = this.magnitude(vector1);
    const magnitude2 = this.magnitude(vector2);
    
    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }
    
    const similarity = dotProduct / (magnitude1 * magnitude2);
    
    // Convert from [-1,1] to [0,1] range if needed
    if (options.positiveRange) {
      return (similarity + 1) / 2;
    }
    
    return Math.abs(similarity); // Use absolute value for similarity
  }

  /**
   * 📏 EUCLIDEAN SIMILARITY
   * Good for dense vectors and spatial data
   * Converted to similarity: 1 / (1 + distance)
   */
  euclideanSimilarity(vector1, vector2, options = {}) {
    const distance = this.euclideanDistance(vector1, vector2);
    const maxDistance = options.maxDistance || Math.sqrt(vector1.length);
    
    // Convert distance to similarity
    return 1 / (1 + (distance / maxDistance));
  }

  /**
   * 🏙️ MANHATTAN SIMILARITY
   * Robust to outliers, good for high-dimensional data
   */
  manhattanSimilarity(vector1, vector2, options = {}) {
    const distance = this.manhattanDistance(vector1, vector2);
    const maxDistance = options.maxDistance || vector1.length;
    
    return 1 / (1 + (distance / maxDistance));
  }

  /**
   * 🎲 JACCARD SIMILARITY
   * Best for binary/categorical features
   */
  jaccardSimilarity(vector1, vector2, options = {}) {
    const threshold = options.threshold || 0.5;
    
    // Convert to binary vectors
    const binary1 = vector1.map(v => v > threshold ? 1 : 0);
    const binary2 = vector2.map(v => v > threshold ? 1 : 0);
    
    let intersection = 0;
    let union = 0;
    
    for (let i = 0; i < binary1.length; i++) {
      if (binary1[i] === 1 || binary2[i] === 1) {
        union++;
        if (binary1[i] === 1 && binary2[i] === 1) {
          intersection++;
        }
      }
    }
    
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * 🧠 SEMANTIC SIMILARITY
   * Advanced similarity calculation with contextual awareness
   */
  semanticSimilarity(vector1, vector2, options = {}) {
    // Start with cosine similarity as base
    let similarity = this.cosineSimilarity(vector1, vector2, { positiveRange: true });
    
    // Apply semantic boosting factors
    if (options.context) {
      similarity = this.applyContextualBoost(similarity, options.context);
    }
    
    // Apply domain-specific adjustments
    if (options.domain) {
      similarity = this.applyDomainAdjustment(similarity, options.domain);
    }
    
    // Apply length normalization for text
    if (options.textLength) {
      similarity = this.applyLengthNormalization(similarity, options.textLength);
    }
    
    return similarity;
  }

  /**
   * 🔧 HELPER FUNCTIONS
   */
  
  dotProduct(vector1, vector2) {
    let product = 0;
    for (let i = 0; i < vector1.length; i++) {
      product += vector1[i] * vector2[i];
    }
    return product;
  }
  
  magnitude(vector) {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    return Math.sqrt(sum);
  }
  
  euclideanDistance(vector1, vector2) {
    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      const diff = vector1[i] - vector2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
  
  manhattanDistance(vector1, vector2) {
    let sum = 0;
    for (let i = 0; i < vector1.length; i++) {
      sum += Math.abs(vector1[i] - vector2[i]);
    }
    return sum;
  }
  
  normalizeVector(vector) {
    const mag = this.magnitude(vector);
    if (mag === 0) return vector;
    
    return vector.map(v => v / mag);
  }
  
  validateVectors(vector1, vector2) {
    if (!Array.isArray(vector1) || !Array.isArray(vector2)) {
      return false;
    }
    
    if (vector1.length !== vector2.length) {
      return false;
    }
    
    if (vector1.length === 0) {
      return false;
    }
    
    // Check for valid numbers
    for (let i = 0; i < vector1.length; i++) {
      if (typeof vector1[i] !== 'number' || typeof vector2[i] !== 'number') {
        return false;
      }
      if (isNaN(vector1[i]) || isNaN(vector2[i])) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 🎯 ADAPTIVE SCORING
   * Dynamic similarity adjustment based on context
   */
  applyAdaptiveScoring(similarity, options) {
    // Adjust based on query length
    if (options.queryLength) {
      const lengthFactor = Math.min(1, options.queryLength / 10); // Boost longer queries
      similarity *= (0.8 + 0.2 * lengthFactor);
    }
    
    // Adjust based on content type
    if (options.contentType) {
      const typeBoosts = {
        'memory': 1.1,
        'chat_knowledge': 1.05,
        'general': 1.0,
        'code_canvas': 1.15,
        'document_canvas': 1.1
      };
      similarity *= (typeBoosts[options.contentType] || 1.0);
    }
    
    // Adjust based on recency
    if (options.timestamp) {
      const age = Date.now() - new Date(options.timestamp).getTime();
      const daysSinceCreation = age / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0.8, 1 - (daysSinceCreation * 0.01)); // Small penalty for old content
      similarity *= recencyBoost;
    }
    
    return similarity;
  }
  
  applyContextualBoost(similarity, context) {
    // Boost similarity if context matches
    const contextBoosts = {
      'name': 1.2,
      'personal': 1.15,
      'professional': 1.1,
      'technical': 1.05
    };
    
    return similarity * (contextBoosts[context] || 1.0);
  }
  
  applyDomainAdjustment(similarity, domain) {
    // Domain-specific similarity adjustments
    const domainAdjustments = {
      'ai': 1.1,
      'programming': 1.1,
      'memory': 1.15,
      'general': 1.0
    };
    
    return similarity * (domainAdjustments[domain] || 1.0);
  }
  
  applyLengthNormalization(similarity, textLength) {
    // Adjust for text length differences
    if (textLength.query && textLength.document) {
      const lengthRatio = Math.min(textLength.query, textLength.document) / 
                         Math.max(textLength.query, textLength.document);
      const lengthBoost = 0.8 + 0.2 * lengthRatio; // Boost similar-length texts
      return similarity * lengthBoost;
    }
    
    return similarity;
  }

  /**
   * 📊 PERFORMANCE MONITORING
   */
  updatePerformanceStats(calculationTime) {
    this.performanceStats.calculationsPerformed++;
    this.performanceStats.totalTime += calculationTime;
    this.performanceStats.averageTime = this.performanceStats.totalTime / this.performanceStats.calculationsPerformed;
  }
  
  getPerformanceStats() {
    return {
      ...this.performanceStats,
      averageTimeMs: this.performanceStats.averageTime.toFixed(3)
    };
  }
  
  resetPerformanceStats() {
    this.performanceStats = {
      calculationsPerformed: 0,
      totalTime: 0,
      averageTime: 0
    };
  }

  /**
   * 🔧 BATCH SIMILARITY CALCULATIONS
   * Optimized for processing multiple vectors at once
   */
  calculateBatchSimilarity(queryVector, candidateVectors, metric = this.defaultMetric, options = {}) {
    const startTime = performance.now();
    
    const results = candidateVectors.map((candidate, index) => ({
      index,
      vector: candidate.vector,
      metadata: candidate.metadata,
      similarity: this.calculateSimilarity(queryVector, candidate.vector, metric, {
        ...options,
        contentType: candidate.metadata?.contentType,
        timestamp: candidate.metadata?.timestamp
      })
    }));
    
    // Sort by similarity (descending)
    results.sort((a, b) => b.similarity - a.similarity);
    
    const endTime = performance.now();
    console.log(`🚀 SimilarityService: Processed ${candidateVectors.length} vectors in ${(endTime - startTime).toFixed(2)}ms`);
    
    return results;
  }

  /**
   * 🎯 SMART THRESHOLD CALCULATION
   * Dynamically determine optimal similarity thresholds
   */
  calculateOptimalThreshold(similarities, options = {}) {
    if (similarities.length === 0) return 0.1;
    
    // Sort similarities
    const sorted = [...similarities].sort((a, b) => b - a);
    
    // Different threshold strategies
    const strategy = options.strategy || 'adaptive';
    
    switch (strategy) {
      case 'percentile':
        const percentile = options.percentile || 0.8;
        const index = Math.floor(sorted.length * percentile);
        return sorted[index] || 0.1;
        
      case 'gap':
        // Find the largest gap in similarities
        let maxGap = 0;
        let gapIndex = 0;
        for (let i = 0; i < sorted.length - 1; i++) {
          const gap = sorted[i] - sorted[i + 1];
          if (gap > maxGap) {
            maxGap = gap;
            gapIndex = i;
          }
        }
        return sorted[gapIndex + 1] || 0.1;
        
      case 'adaptive':
      default:
        // Use mean - 1 standard deviation
        const mean = sorted.reduce((sum, val) => sum + val, 0) / sorted.length;
        const variance = sorted.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sorted.length;
        const stdDev = Math.sqrt(variance);
        return Math.max(0.05, mean - stdDev);
    }
  }
}

// Export singleton instance
const similarityCalculationService = new SimilarityCalculationService();

module.exports = {
  SimilarityCalculationService,
  similarityCalculationService
};

console.log('🧮 State-of-the-art Similarity Calculation Service initialized');
