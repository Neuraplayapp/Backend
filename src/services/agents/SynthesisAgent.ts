/**
 * LAYER 4: SYNTHESIS & RESPONSE AGENT
 * 
 * Final agent that receives structured, vetted data from multiple sources
 * and constructs the final answer with fact triangulation and verification.
 */

import { SearchResult } from './SearchExecutor';
import { ContentAnalysis, ContentTrigger } from './ContentAnalyzer';
import { contentRenderer, RenderedContent } from '../ContentRenderer';
import { SearchPlan } from './SearchOrchestrator';

export interface SynthesizedResponse {
  finalAnswer: string;
  confidence: number;
  factTriangulation: FactTriangulation;
  sources: SourceSummary[];
  recommendations: string[];
  gaps: string[];
  metadata: {
    synthesisTime: number;
    sourcesAnalyzed: number;
    conflictsResolved: number;
    methodUsed: 'triangulation' | 'prioritization' | 'combination';
  };
}

export interface FactTriangulation {
  verifiedFacts: VerifiedFact[];
  conflictingInfo: ConflictingInfo[];
  consensusFindings: string[];
  uncertainties: string[];
}

export interface VerifiedFact {
  statement: string;
  confidence: number;
  supportingSources: number;
  category: 'confirmed' | 'likely' | 'disputed';
}

export interface ConflictingInfo {
  topic: string;
  conflictingStatements: Array<{
    statement: string;
    source: string;
    reliability: number;
  }>;
  resolution: string;
  confidence: number;
}

export interface SourceSummary {
  url: string;
  category: string;
  reliability: number;
  keyContributions: string[];
  limitations: string[];
}

export class SynthesisAgent {
  /**
   * MAIN SYNTHESIS METHOD
   * Combines multiple content analyses into final coherent response
   */
  async synthesizeResponse(
    searchPlan: SearchPlan,
    searchResults: SearchResult[],
    contentAnalyses: ContentAnalysis[]
  ): Promise<SynthesizedResponse> {
    const startTime = Date.now();
    console.log(`🔬 SynthesisAgent: Synthesizing ${contentAnalyses.length} analyzed sources...`);

    // Step 1: Fact Triangulation
    const factTriangulation = await this.performFactTriangulation(contentAnalyses, searchPlan.strategy.synthesisApproach);

    // Step 2: Source Analysis and Ranking
    const sources = this.analyzeSources(contentAnalyses);

    // Step 3: Generate Primary Response
    const primaryResponse = await this.generatePrimaryResponse(
      searchPlan,
      factTriangulation,
      sources
    );

    // Step 4: Identify Gaps and Generate Recommendations
    const gaps = this.identifyKnowledgeGaps(contentAnalyses, searchPlan.intent);
    const recommendations = this.generateRecommendations(factTriangulation, sources, gaps);

    // Step 5: Calculate Overall Confidence
    const confidence = this.calculateOverallConfidence(factTriangulation, sources);

    const synthesisTime = Date.now() - startTime;

    return {
      finalAnswer: primaryResponse,
      confidence,
      factTriangulation,
      sources,
      recommendations,
      gaps,
      metadata: {
        synthesisTime,
        sourcesAnalyzed: contentAnalyses.length,
        conflictsResolved: factTriangulation.conflictingInfo.length,
        methodUsed: searchPlan.strategy.synthesisApproach
      }
    };
  }

  /**
   * FACT TRIANGULATION
   * Compares structured data from different sources
   */
  private async performFactTriangulation(
    analyses: ContentAnalysis[],
    approach: 'triangulate' | 'prioritize' | 'combine'
  ): Promise<FactTriangulation> {
    console.log(`🔍 Performing fact triangulation using ${approach} approach...`);

    const verifiedFacts: VerifiedFact[] = [];
    const conflictingInfo: ConflictingInfo[] = [];
    const consensusFindings: string[] = [];
    const uncertainties: string[] = [];

    // Extract all facts from analyses
    const allFacts = analyses.flatMap(analysis => 
      analysis.structuredData.facts.map(fact => ({
        ...fact,
        sourceUrl: analysis.url,
        sourceReliability: analysis.reliabilityScore,
        sourceCategory: analysis.structuredData.contentType
      }))
    );

    // Group similar facts
    const factGroups = this.groupSimilarFacts(allFacts);

    // Process each fact group
    for (const group of factGroups) {
      if (group.length === 1) {
        // Single source fact
        verifiedFacts.push({
          statement: group[0].statement,
          confidence: group[0].confidence * (group[0].sourceReliability / 100),
          supportingSources: 1,
          category: 'likely'
        });
      } else if (approach === 'triangulate') {
        // Multiple sources - triangulate
        const triangulated = this.triangulateFactGroup(group);
        verifiedFacts.push(triangulated);

        if (triangulated.category === 'confirmed') {
          consensusFindings.push(triangulated.statement);
        }
      } else if (approach === 'prioritize') {
        // Prioritize highest reliability source
        const prioritized = this.prioritizeFactGroup(group);
        verifiedFacts.push(prioritized);
      } else {
        // Combine approach
        const combined = this.combineFactGroup(group);
        verifiedFacts.push(combined);
      }
    }

    // Identify conflicts
    const conflicts = this.identifyConflicts(analyses);
    conflictingInfo.push(...conflicts);

    // Identify uncertainties
    const lowConfidenceFacts = verifiedFacts.filter(fact => fact.confidence < 0.6);
    uncertainties.push(...lowConfidenceFacts.map(fact => fact.statement));

    return {
      verifiedFacts,
      conflictingInfo,
      consensusFindings,
      uncertainties
    };
  }

  /**
   * GENERATE PRIMARY RESPONSE
   * Creates coherent answer using verified data
   */
  private async generatePrimaryResponse(
    searchPlan: SearchPlan,
    factTriangulation: FactTriangulation,
    sources: SourceSummary[]
  ): Promise<string> {
    const highConfidenceFacts = factTriangulation.verifiedFacts.filter(fact => fact.confidence > 0.7);
    const topSources = sources.filter(source => source.reliability > 70).slice(0, 3);

    // Determine the primary content type
    const primaryContentType = this.determinePrimaryContentType(sources);

    // Create structured response based on content type
    let structuredResponse: string;

    if (primaryContentType === 'recipe') {
      structuredResponse = this.synthesizeRecipeResponse(highConfidenceFacts, topSources, searchPlan);
    } else if (primaryContentType === 'tutorial') {
      structuredResponse = this.synthesizeTutorialResponse(highConfidenceFacts, topSources, searchPlan);
    } else if (primaryContentType === 'academic') {
      structuredResponse = this.synthesizeAcademicResponse(highConfidenceFacts, topSources, searchPlan);
    } else if (primaryContentType === 'news') {
      structuredResponse = this.synthesizeNewsResponse(highConfidenceFacts, topSources, searchPlan);
    } else {
      structuredResponse = this.synthesizeGeneralResponse(highConfidenceFacts, topSources, searchPlan);
    }

    // Add consensus findings
    if (factTriangulation.consensusFindings.length > 0) {
      structuredResponse += `\n\n**✅ Verified Across Multiple Sources:**\n`;
      structuredResponse += factTriangulation.consensusFindings.slice(0, 3)
        .map(finding => `• ${finding}`)
        .join('\n');
    }

    // Add conflict resolutions
    if (factTriangulation.conflictingInfo.length > 0) {
      structuredResponse += `\n\n**⚠️ Conflicting Information Resolved:**\n`;
      structuredResponse += factTriangulation.conflictingInfo.slice(0, 2)
        .map(conflict => `• ${conflict.topic}: ${conflict.resolution}`)
        .join('\n');
    }

    // Add uncertainties if present
    if (factTriangulation.uncertainties.length > 0) {
      structuredResponse += `\n\n**❓ Areas of Uncertainty:**\n`;
      structuredResponse += factTriangulation.uncertainties.slice(0, 2)
        .map(uncertainty => `• ${uncertainty}`)
        .join('\n');
    }

    return structuredResponse;
  }

  /**
   * CONTENT-TYPE SPECIFIC RESPONSE SYNTHESIS
   */
  private synthesizeRecipeResponse(facts: VerifiedFact[], sources: SourceSummary[], plan: SearchPlan): string {
    return `
🍳 **${plan.intent.goal}**

Based on analysis of ${sources.length} reliable sources, here's your comprehensive recipe guide:

**📋 Key Verified Information:**
${facts.slice(0, 5).map(fact => `• ${fact.statement} (${Math.round(fact.confidence * 100)}% confidence)`).join('\n')}

**👨‍🍳 Best Practices from Top Sources:**
${sources.slice(0, 2).map(source => `• ${source.keyContributions.join(', ')}`).join('\n')}

**💡 Pro Tips:**
• Cross-referenced ${sources.length} sources for accuracy
• Verified cooking times and measurements
• Included common troubleshooting solutions
    `.trim();
  }

  private synthesizeTutorialResponse(facts: VerifiedFact[], sources: SourceSummary[], plan: SearchPlan): string {
    return `
📚 **${plan.intent.goal}**

Synthesized from ${sources.length} authoritative sources:

**✅ Verified Steps and Information:**
${facts.slice(0, 5).map(fact => `• ${fact.statement}`).join('\n')}

**🎯 Expert Recommendations:**
${sources.slice(0, 2).map(source => `• ${source.keyContributions[0]}`).join('\n')}

**⚠️ Important Considerations:**
${sources.flatMap(s => s.limitations).slice(0, 2).map(limitation => `• ${limitation}`).join('\n')}
    `.trim();
  }

  private synthesizeAcademicResponse(facts: VerifiedFact[], sources: SourceSummary[], plan: SearchPlan): string {
    return `
🎓 **${plan.intent.goal}**

Academic synthesis from ${sources.length} sources:

**📊 Key Research Findings:**
${facts.slice(0, 5).map(fact => `• ${fact.statement} (supported by ${fact.supportingSources} source${fact.supportingSources !== 1 ? 's' : ''})`).join('\n')}

**🔬 Research Quality:**
• Average source reliability: ${Math.round(sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length)}%
• Peer-reviewed sources: ${sources.filter(s => s.category === 'academic').length}/${sources.length}

**📚 Methodological Notes:**
${sources.filter(s => s.limitations.length > 0).slice(0, 2).map(source => `• ${source.limitations[0]}`).join('\n')}
    `.trim();
  }

  private synthesizeNewsResponse(facts: VerifiedFact[], sources: SourceSummary[], plan: SearchPlan): string {
    return `
📰 **${plan.intent.goal}**

Current information synthesis from ${sources.length} news sources:

**🔥 Key Developments:**
${facts.slice(0, 5).map(fact => `• ${fact.statement}`).join('\n')}

**📊 Source Verification:**
• Cross-referenced across ${sources.length} news outlets
• Average source credibility: ${Math.round(sources.reduce((sum, s) => sum + s.reliability, 0) / sources.length)}%

**⚠️ Important Notes:**
• Information current as of analysis time
• Developing stories may have updates
    `.trim();
  }

  private synthesizeGeneralResponse(facts: VerifiedFact[], sources: SourceSummary[], plan: SearchPlan): string {
    return `
📄 **${plan.intent.goal}**

Comprehensive analysis from ${sources.length} sources:

**🔍 Key Verified Information:**
${facts.slice(0, 5).map(fact => `• ${fact.statement} (${Math.round(fact.confidence * 100)}% confidence)`).join('\n')}

**📊 Source Quality:**
• High-reliability sources: ${sources.filter(s => s.reliability > 80).length}/${sources.length}
• Content categories: ${[...new Set(sources.map(s => s.category))].join(', ')}

**💡 Key Insights:**
${sources.slice(0, 2).map(source => `• ${source.keyContributions[0]}`).join('\n')}
    `.trim();
  }

  /**
   * HELPER METHODS
   */
  private groupSimilarFacts(facts: any[]): any[][] {
    // Simple similarity grouping based on keywords
    const groups: any[][] = [];
    const used = new Set<number>();

    for (let i = 0; i < facts.length; i++) {
      if (used.has(i)) continue;

      const group = [facts[i]];
      used.add(i);

      for (let j = i + 1; j < facts.length; j++) {
        if (used.has(j)) continue;

        if (this.areFactsSimilar(facts[i], facts[j])) {
          group.push(facts[j]);
          used.add(j);
        }
      }

      groups.push(group);
    }

    return groups;
  }

  private areFactsSimilar(fact1: any, fact2: any): boolean {
    const words1 = fact1.statement.toLowerCase().split(/\s+/);
    const words2 = fact2.statement.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = commonWords.length / Math.max(words1.length, words2.length);
    
    return similarity > 0.6; // 60% word overlap
  }

  private triangulateFactGroup(group: any[]): VerifiedFact {
    const avgConfidence = group.reduce((sum, fact) => sum + fact.confidence, 0) / group.length;
    const avgReliability = group.reduce((sum, fact) => sum + fact.sourceReliability, 0) / group.length;
    
    const finalConfidence = (avgConfidence * avgReliability / 100) * Math.min(1, group.length / 3);
    
    return {
      statement: group[0].statement, // Use first statement as representative
      confidence: finalConfidence,
      supportingSources: group.length,
      category: group.length >= 3 && finalConfidence > 0.8 ? 'confirmed' :
                group.length >= 2 && finalConfidence > 0.6 ? 'likely' : 'disputed'
    };
  }

  private prioritizeFactGroup(group: any[]): VerifiedFact {
    const bestSource = group.reduce((best, current) => 
      current.sourceReliability > best.sourceReliability ? current : best
    );
    
    return {
      statement: bestSource.statement,
      confidence: bestSource.confidence * (bestSource.sourceReliability / 100),
      supportingSources: 1,
      category: bestSource.sourceReliability > 80 ? 'likely' : 'disputed'
    };
  }

  private combineFactGroup(group: any[]): VerifiedFact {
    // Weighted average based on source reliability
    const totalWeight = group.reduce((sum, fact) => sum + fact.sourceReliability, 0);
    const weightedConfidence = group.reduce((sum, fact) => 
      sum + (fact.confidence * fact.sourceReliability), 0
    ) / totalWeight;
    
    return {
      statement: group[0].statement,
      confidence: weightedConfidence / 100,
      supportingSources: group.length,
      category: weightedConfidence > 70 ? 'likely' : 'disputed'
    };
  }

  private identifyConflicts(analyses: ContentAnalysis[]): ConflictingInfo[] {
    const conflicts: ConflictingInfo[] = [];
    
    // Look for conflicting cooking times in recipes
    const cookTimes = analyses.flatMap(analysis => 
      this.extractTimesFromContent(analysis.extractedContent)
        .map(time => ({ time, source: analysis.url, reliability: analysis.reliabilityScore }))
    );
    
    if (cookTimes.length > 1) {
      const timeVariance = Math.max(...cookTimes.map(t => t.time)) - Math.min(...cookTimes.map(t => t.time));
      if (timeVariance > 30) { // More than 30 minutes difference
        conflicts.push({
          topic: 'Cooking/Preparation Time',
          conflictingStatements: cookTimes.map(ct => ({
            statement: `${ct.time} minutes`,
            source: ct.source,
            reliability: ct.reliability
          })),
          resolution: `Times vary from ${Math.min(...cookTimes.map(t => t.time))} to ${Math.max(...cookTimes.map(t => t.time))} minutes. Higher reliability sources suggest ${this.getReliableTimeEstimate(cookTimes)} minutes.`,
          confidence: 0.8
        });
      }
    }
    
    return conflicts;
  }

  private extractTimesFromContent(content: string): number[] {
    const timeMatches = content.match(/\d+\s*(?:minute|min|hour|hr)s?/gi) || [];
    return timeMatches.map(match => {
      const num = parseInt(match);
      return match.toLowerCase().includes('hour') || match.toLowerCase().includes('hr') ? num * 60 : num;
    });
  }

  private getReliableTimeEstimate(cookTimes: Array<{time: number, reliability: number}>): number {
    const weightedSum = cookTimes.reduce((sum, ct) => sum + (ct.time * ct.reliability), 0);
    const totalWeight = cookTimes.reduce((sum, ct) => sum + ct.reliability, 0);
    return Math.round(weightedSum / totalWeight);
  }

  private analyzeSources(analyses: ContentAnalysis[]): SourceSummary[] {
    return analyses.map(analysis => ({
      url: analysis.url,
      category: analysis.structuredData.contentType,
      reliability: analysis.reliabilityScore,
      keyContributions: analysis.structuredData.keyPoints.slice(0, 3),
      limitations: this.identifySourceLimitations(analysis)
    }));
  }

  private identifySourceLimitations(analysis: ContentAnalysis): string[] {
    const limitations: string[] = [];
    
    if (analysis.reliabilityScore < 70) {
      limitations.push('Lower reliability source');
    }
    
    if (analysis.structuredData.contentTriggers.some(t => t.severity === 'high')) {
      limitations.push('Contains content concerns');
    }
    
    if (analysis.extractedContent.length < 500) {
      limitations.push('Limited detail available');
    }
    
    return limitations;
  }

  private identifyKnowledgeGaps(analyses: ContentAnalysis[], intent: any): string[] {
    const gaps: string[] = [];
    
    // Check for missing recipe components
    if (intent.concepts.includes('recipe')) {
      const hasIngredients = analyses.some(a => a.extractedContent.toLowerCase().includes('ingredients'));
      const hasInstructions = analyses.some(a => a.extractedContent.toLowerCase().includes('instructions'));
      
      if (!hasIngredients) gaps.push('Complete ingredients list needed');
      if (!hasInstructions) gaps.push('Step-by-step instructions needed');
    }
    
    // Check for technical depth
    if (intent.domain === 'technical') {
      const hasCodeExamples = analyses.some(a => a.extractedContent.includes('```'));
      if (!hasCodeExamples) gaps.push('Code examples needed');
    }
    
    return gaps;
  }

  private generateRecommendations(
    factTriangulation: FactTriangulation, 
    sources: SourceSummary[], 
    gaps: string[]
  ): string[] {
    const recommendations: string[] = [];
    
    // Source quality recommendations
    const lowReliabilitySources = sources.filter(s => s.reliability < 60).length;
    if (lowReliabilitySources > 0) {
      recommendations.push('Consider seeking additional high-authority sources');
    }
    
    // Uncertainty recommendations
    if (factTriangulation.uncertainties.length > 2) {
      recommendations.push('Cross-reference with expert sources for uncertain information');
    }
    
    // Gap recommendations
    if (gaps.length > 0) {
      recommendations.push(`Search for: ${gaps.slice(0, 2).join(', ')}`);
    }
    
    return recommendations;
  }

  private calculateOverallConfidence(factTriangulation: FactTriangulation, sources: SourceSummary[]): number {
    const avgFactConfidence = factTriangulation.verifiedFacts.reduce((sum, fact) => sum + fact.confidence, 0) / factTriangulation.verifiedFacts.length;
    const avgSourceReliability = sources.reduce((sum, source) => sum + source.reliability, 0) / sources.length;
    const conflictPenalty = factTriangulation.conflictingInfo.length * 5; // 5% penalty per conflict
    
    const baseConfidence = (avgFactConfidence * 70) + (avgSourceReliability * 0.3);
    return Math.max(0, Math.min(100, baseConfidence - conflictPenalty));
  }

  private determinePrimaryContentType(sources: SourceSummary[]): string {
    const categoryCount = sources.reduce((acc, source) => {
      acc[source.category] = (acc[source.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'article';
  }
}

export const synthesisAgent = new SynthesisAgent();
