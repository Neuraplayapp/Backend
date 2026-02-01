/**
 * 🔗 SEMANTIC CLUSTERING SERVICE
 * 
 * Groups related learning items using vector embeddings
 * Powers intelligent review scheduling in NSM
 * 
 * BENEFITS:
 * - If user masters "French verb être", suggest reviewing "Spanish verb ser"
 * - Group similar concepts for interleaved practice
 * - Identify knowledge transfer opportunities
 * 
 * INTEGRATES WITH:
 * - VectorSearchService (for embeddings)
 * - NeuralSpacedMastery (for intelligent scheduling)
 */

import type { NeuralItemMetadata } from './NeuralSpacedMastery';

export interface SemanticCluster {
  clusterId: string;
  clusterName: string;
  centroid: number[]; // Average embedding vector
  itemIds: string[];
  avgDifficulty: number;
  commonThemes: string[];
}

export interface ItemSimilarity {
  itemId: string;
  similarity: number; // 0-1, cosine similarity
  relationshipType: 'prerequisite' | 'related' | 'application' | 'opposite';
}

export class SemanticClusteringService {
  private clusters: Map<string, SemanticCluster> = new Map();
  private itemEmbeddings: Map<string, number[]> = new Map();
  
  /**
   * 🎯 Add item to semantic space
   * In production, this would call your VectorSearchService
   */
  async addItem(
    itemId: string,
    content: string,
    metadata: NeuralItemMetadata
  ): Promise<void> {
    try {
      // Generate embedding (simplified - in production use VectorSearchService)
      const embedding = await this.generateEmbedding(content);
      this.itemEmbeddings.set(itemId, embedding);
      
      // Find or create cluster
      const cluster = await this.assignToCluster(itemId, embedding, metadata);
      
      console.log(`🔗 [SemanticClustering] Added item ${itemId} to cluster ${cluster.clusterId}`);
    } catch (error) {
      console.error('❌ [SemanticClustering] Failed to add item:', error);
    }
  }
  
  /**
   * 🔍 Find similar items
   */
  async findSimilarItems(
    itemId: string,
    topK: number = 5,
    minSimilarity: number = 0.7
  ): Promise<ItemSimilarity[]> {
    const itemEmbedding = this.itemEmbeddings.get(itemId);
    if (!itemEmbedding) return [];
    
    const similarities: ItemSimilarity[] = [];
    
    for (const [otherId, otherEmbedding] of this.itemEmbeddings.entries()) {
      if (otherId === itemId) continue;
      
      const similarity = this.cosineSimilarity(itemEmbedding, otherEmbedding);
      
      if (similarity >= minSimilarity) {
        similarities.push({
          itemId: otherId,
          similarity,
          relationshipType: this.inferRelationshipType(similarity)
        });
      }
    }
    
    // Sort by similarity, return top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
  
  /**
   * 📚 Get cluster for item
   */
  getClusterForItem(itemId: string): SemanticCluster | undefined {
    for (const cluster of this.clusters.values()) {
      if (cluster.itemIds.includes(itemId)) {
        return cluster;
      }
    }
    return undefined;
  }
  
  /**
   * 🎯 Get all items in same cluster
   */
  getClusterItems(itemId: string): string[] {
    const cluster = this.getClusterForItem(itemId);
    return cluster ? cluster.itemIds.filter(id => id !== itemId) : [];
  }
  
  /**
   * 🔗 Get related items for interleaved practice
   */
  getInterleavedRecommendations(
    currentItemIds: string[],
    count: number = 3
  ): string[] {
    const recommendations = new Set<string>();
    
    for (const itemId of currentItemIds) {
      const cluster = this.getClusterForItem(itemId);
      if (!cluster) continue;
      
      // Get items from same cluster that aren't in current set
      const clusterItems = cluster.itemIds.filter(
        id => !currentItemIds.includes(id) && !recommendations.has(id)
      );
      
      // Add up to remaining count
      const needed = count - recommendations.size;
      clusterItems.slice(0, needed).forEach(id => recommendations.add(id));
      
      if (recommendations.size >= count) break;
    }
    
    return Array.from(recommendations);
  }
  
  /**
   * 🧠 Generate embedding (placeholder for VectorSearchService integration)
   */
  private async generateEmbedding(content: string): Promise<number[]> {
    // PHASE 1: Simple hash-based embeddings (deterministic)
    // PHASE 2: Will integrate with VectorSearchService for real embeddings
    
    const hash = this.simpleHash(content);
    const embedding: number[] = [];
    
    // Generate 384-dimensional embedding (matching common embedding models)
    for (let i = 0; i < 384; i++) {
      // Deterministic pseudo-random based on content hash
      const value = Math.sin(hash * (i + 1)) * 10000;
      embedding.push(value - Math.floor(value));
    }
    
    return this.normalize(embedding);
  }
  
  /**
   * 📊 Assign item to cluster
   */
  private async assignToCluster(
    itemId: string,
    embedding: number[],
    metadata: NeuralItemMetadata
  ): Promise<SemanticCluster> {
    const SIMILARITY_THRESHOLD = 0.75;
    
    // Find closest existing cluster
    let bestCluster: SemanticCluster | null = null;
    let bestSimilarity = 0;
    
    for (const cluster of this.clusters.values()) {
      const similarity = this.cosineSimilarity(embedding, cluster.centroid);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }
    
    // If similar enough to existing cluster, add to it
    if (bestCluster && bestSimilarity >= SIMILARITY_THRESHOLD) {
      bestCluster.itemIds.push(itemId);
      // Update centroid
      bestCluster.centroid = this.updateCentroid(bestCluster.clusterId, embedding);
      return bestCluster;
    }
    
    // Otherwise, create new cluster
    const newCluster: SemanticCluster = {
      clusterId: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clusterName: metadata.concept,
      centroid: embedding,
      itemIds: [itemId],
      avgDifficulty: metadata.difficulty,
      commonThemes: [metadata.concept]
    };
    
    this.clusters.set(newCluster.clusterId, newCluster);
    return newCluster;
  }
  
  /**
   * 🔢 Cosine Similarity
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
  
  /**
   * 🔄 Update cluster centroid
   */
  private updateCentroid(clusterId: string, newEmbedding: number[]): number[] {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) return newEmbedding;
    
    // Get all embeddings in cluster
    const embeddings: number[][] = [];
    for (const itemId of cluster.itemIds) {
      const emb = this.itemEmbeddings.get(itemId);
      if (emb) embeddings.push(emb);
    }
    
    if (embeddings.length === 0) return newEmbedding;
    
    // Calculate mean
    const dimensions = embeddings[0].length;
    const centroid: number[] = new Array(dimensions).fill(0);
    
    for (const emb of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        centroid[i] += emb[i];
      }
    }
    
    for (let i = 0; i < dimensions; i++) {
      centroid[i] /= embeddings.length;
    }
    
    return this.normalize(centroid);
  }
  
  /**
   * 🎯 Infer relationship type from similarity
   */
  private inferRelationshipType(similarity: number): 'prerequisite' | 'related' | 'application' | 'opposite' {
    if (similarity > 0.9) return 'related';      // Very similar → related concepts
    if (similarity > 0.8) return 'application';  // Similar → practical application
    if (similarity > 0.7) return 'prerequisite'; // Somewhat similar → foundational concept
    return 'opposite';                           // Edge case
  }
  
  /**
   * 🔢 Normalize vector to unit length
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  }
  
  /**
   * #️⃣ Simple hash function
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * 📊 Get clustering statistics
   */
  getStatistics(): {
    totalClusters: number;
    totalItems: number;
    avgClusterSize: number;
    largestCluster: { id: string; size: number; name: string } | null;
  } {
    const clusterSizes = Array.from(this.clusters.values()).map(c => c.itemIds.length);
    const totalItems = clusterSizes.reduce((sum, size) => sum + size, 0);
    const avgSize = this.clusters.size > 0 ? totalItems / this.clusters.size : 0;
    
    let largestCluster = null;
    let maxSize = 0;
    
    for (const cluster of this.clusters.values()) {
      if (cluster.itemIds.length > maxSize) {
        maxSize = cluster.itemIds.length;
        largestCluster = {
          id: cluster.clusterId,
          size: cluster.itemIds.length,
          name: cluster.clusterName
        };
      }
    }
    
    return {
      totalClusters: this.clusters.size,
      totalItems,
      avgClusterSize: avgSize,
      largestCluster
    };
  }
}

export const semanticClusteringService = new SemanticClusteringService();

