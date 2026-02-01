/**
 * LAYER 1: ORCHESTRATION & PLANNING AGENT
 * 
 * This agent THINKS and PLANS but does NOT search.
 * It decomposes intent and creates strategic search plans.
 */

import { apiService } from '../APIService';

export interface SearchPlan {
  intent: {
    goal: string;
    concepts: string[];
    complexity: 'simple' | 'moderate' | 'complex';
    domain: 'general' | 'technical' | 'academic' | 'current_events';
  };
  strategy: {
    initialSearch: SearchStep;
    parallelSearches?: SearchStep[];
    conditionalSearches?: ConditionalStep[];
    synthesisApproach: 'combine' | 'triangulate' | 'prioritize';
  };
  expectedOutcome: string;
}

export interface SearchStep {
  query: string;
  rationale: string;
  expectedSources: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ConditionalStep extends SearchStep {
  condition: string;
  trigger: 'unusual_ingredients' | 'conflicting_info' | 'insufficient_depth' | 'credibility_concerns';
}

export class SearchOrchestrator {
  /**
   * MAIN ORCHESTRATION METHOD
   * Analyzes user intent and creates strategic search plan
   */
  async createSearchPlan(userQuery: string): Promise<SearchPlan> {
    console.log('🧠 SearchOrchestrator: Analyzing user intent...');
    
    // Step 1: Intent Decomposition
    const intent = await this.decomposeIntent(userQuery);
    console.log('🎯 Intent decomposed:', intent);
    
    // Step 2: Strategic Plan Generation
    const strategy = await this.generateStrategy(intent, userQuery);
    console.log('📋 Strategy generated:', strategy);
    
    return {
      intent,
      strategy,
      expectedOutcome: this.defineExpectedOutcome(intent, strategy)
    };
  }

  /**
   * INTENT DECOMPOSITION
   * Breaks down user query into distinct concepts and goals
   */
  private async decomposeIntent(userQuery: string): Promise<SearchPlan['intent']> {
    // Example: "Find me a good recipe for vegan lasagna that's not too complicated"
    // Concepts: [vegan lasagna, recipe, low complexity]
    // Goal: Find simple vegan lasagna recipe
    
    const concepts = this.extractConcepts(userQuery);
    const complexity = this.assessComplexity(userQuery);
    const domain = this.identifyDomain(userQuery);
    const goal = this.defineGoal(userQuery, concepts);
    
    return { goal, concepts, complexity, domain };
  }

  /**
   * STRATEGIC PLAN GENERATION
   * Creates multi-step search plan based on intent
   */
  private async generateStrategy(intent: SearchPlan['intent'], userQuery: string): Promise<SearchPlan['strategy']> {
    const initialSearch = this.planInitialSearch(intent, userQuery);
    const parallelSearches = this.planParallelSearches(intent);
    const conditionalSearches = this.planConditionalSearches(intent);
    const synthesisApproach = this.chooseSynthesisApproach(intent);
    
    return {
      initialSearch,
      parallelSearches,
      conditionalSearches,
      synthesisApproach
    };
  }

  /**
   * INITIAL SEARCH PLANNING
   * Creates the primary search strategy
   */
  private planInitialSearch(intent: SearchPlan['intent'], userQuery: string): SearchStep {
    // For "vegan lasagna recipe not complicated":
    // Query: "easy vegan lasagna recipes"
    // Rationale: "Broad search to find general recipes with simplicity focus"
    
    let query = userQuery;
    let rationale = "Direct search based on user query";
    let expectedSources = ["recipe websites", "food blogs"];
    
    // Optimize query based on intent
    if (intent.domain === 'technical') {
      query = this.addTechnicalSearchOperators(userQuery);
      expectedSources = ["documentation sites", "technical blogs", "Stack Overflow"];
      rationale = "Technical query with enhanced search operators";
    } else if (intent.domain === 'academic') {
      query = this.addAcademicSearchOperators(userQuery);
      expectedSources = ["academic papers", "research institutions", "educational sites"];
      rationale = "Academic query targeting scholarly sources";
    } else if (intent.concepts.includes('recipe') || intent.concepts.includes('food')) {
      query = this.optimizeRecipeQuery(userQuery);
      expectedSources = ["recipe websites", "cooking blogs", "food networks"];
      rationale = "Recipe-optimized query for cooking sources";
    }
    
    return {
      query,
      rationale,
      expectedSources,
      priority: 'high'
    };
  }

  /**
   * PARALLEL SEARCH PLANNING
   * Creates simultaneous searches for comprehensive coverage
   */
  private planParallelSearches(intent: SearchPlan['intent']): SearchStep[] {
    const parallelSearches: SearchStep[] = [];
    
    // Example for vegan lasagna:
    // Parallel search: "common problems vegan lasagna" to anticipate failure points
    
    if (intent.concepts.includes('recipe')) {
      parallelSearches.push({
        query: `common problems ${intent.concepts.join(' ')}`,
        rationale: "Anticipate potential issues and failure points",
        expectedSources: ["cooking forums", "Q&A sites", "cooking blogs"],
        priority: 'medium'
      });
      
      parallelSearches.push({
        query: `${intent.concepts.join(' ')} tips tricks`,
        rationale: "Find expert tips and best practices",
        expectedSources: ["chef blogs", "cooking websites", "food forums"],
        priority: 'medium'
      });
    }
    
    if (intent.domain === 'technical') {
      parallelSearches.push({
        query: `${intent.concepts.join(' ')} best practices`,
        rationale: "Find implementation best practices",
        expectedSources: ["technical blogs", "documentation", "developer forums"],
        priority: 'medium'
      });
      
      parallelSearches.push({
        query: `${intent.concepts.join(' ')} common issues problems`,
        rationale: "Identify potential pitfalls and solutions",
        expectedSources: ["Stack Overflow", "GitHub issues", "technical forums"],
        priority: 'medium'
      });
    }
    
    return parallelSearches;
  }

  /**
   * CONDITIONAL SEARCH PLANNING
   * Creates follow-up searches based on initial results
   */
  private planConditionalSearches(intent: SearchPlan['intent']): ConditionalStep[] {
    const conditionalSearches: ConditionalStep[] = [];
    
    // Example: If initial results contain unusual ingredients, search for substitutions
    if (intent.concepts.includes('recipe')) {
      conditionalSearches.push({
        query: "substitute for vegan ricotta cheese",
        rationale: "Find alternatives for hard-to-find vegan ingredients",
        expectedSources: ["vegan blogs", "recipe sites", "cooking forums"],
        priority: 'low',
        condition: "Initial results contain unusual or hard-to-find vegan ingredients",
        trigger: 'unusual_ingredients'
      });
    }
    
    if (intent.domain === 'technical') {
      conditionalSearches.push({
        query: `${intent.concepts.join(' ')} alternatives comparison`,
        rationale: "Find alternative approaches if initial solution seems complex",
        expectedSources: ["technical comparison sites", "developer blogs"],
        priority: 'medium',
        condition: "Initial results suggest overly complex implementation",
        trigger: 'insufficient_depth'
      });
    }
    
    // Universal conditional searches
    conditionalSearches.push({
      query: `${intent.concepts.join(' ')} "peer reviewed" OR "research study"`,
      rationale: "Find more credible sources if initial results lack authority",
      expectedSources: ["academic sites", "research institutions", "peer-reviewed sources"],
      priority: 'high',
      condition: "Initial results have low credibility scores",
      trigger: 'credibility_concerns'
    });
    
    return conditionalSearches;
  }

  /**
   * SYNTHESIS APPROACH SELECTION
   * Determines how to combine results from multiple searches
   */
  private chooseSynthesisApproach(intent: SearchPlan['intent']): 'combine' | 'triangulate' | 'prioritize' {
    if (intent.complexity === 'complex' || intent.domain === 'academic') {
      return 'triangulate'; // Cross-verify information from multiple sources
    } else if (intent.domain === 'technical') {
      return 'prioritize'; // Prioritize authoritative technical sources
    } else {
      return 'combine'; // Combine complementary information
    }
  }

  /**
   * HELPER METHODS FOR QUERY OPTIMIZATION
   */
  private extractConcepts(query: string): string[] {
    // Simple concept extraction - could be enhanced with NLP
    const concepts = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'been', 'were'].includes(word));
    
    return [...new Set(concepts)]; // Remove duplicates
  }

  private assessComplexity(query: string): 'simple' | 'moderate' | 'complex' {
    const complexityIndicators = {
      simple: /simple|easy|basic|quick|beginner/i,
      complex: /advanced|complex|comprehensive|detailed|professional|expert/i
    };
    
    if (complexityIndicators.simple.test(query)) return 'simple';
    if (complexityIndicators.complex.test(query)) return 'complex';
    return 'moderate';
  }

  private identifyDomain(query: string): 'general' | 'technical' | 'academic' | 'current_events' {
    const domainIndicators = {
      technical: /api|code|programming|implementation|system|architecture|software/i,
      academic: /research|study|analysis|theory|methodology|academic/i,
      current_events: /news|recent|latest|today|breaking|current/i
    };
    
    for (const [domain, pattern] of Object.entries(domainIndicators)) {
      if (pattern.test(query)) {
        return domain as any;
      }
    }
    return 'general';
  }

  private defineGoal(query: string, concepts: string[]): string {
    // Extract the main action and object
    const actions = ['find', 'get', 'search', 'look', 'need', 'want'];
    const words = query.toLowerCase().split(/\s+/);
    
    const actionIndex = words.findIndex(word => actions.some(action => word.includes(action)));
    
    if (actionIndex !== -1) {
      return words.slice(actionIndex).join(' ');
    }
    
    return `Find information about ${concepts.slice(0, 3).join(', ')}`;
  }

  private addTechnicalSearchOperators(query: string): string {
    // Add technical search operators
    return `${query} (site:stackoverflow.com OR site:github.com OR "documentation")`;
  }

  private addAcademicSearchOperators(query: string): string {
    // Add academic search operators
    return `${query} (site:edu OR "peer reviewed" OR "research study")`;
  }

  private optimizeRecipeQuery(query: string): string {
    // Optimize for recipe searches
    const optimized = query.replace(/not too complicated|simple|easy/gi, 'easy beginner');
    return `${optimized} recipe step by step`;
  }

  private defineExpectedOutcome(intent: SearchPlan['intent'], strategy: SearchPlan['strategy']): string {
    return `${strategy.synthesisApproach} approach to ${intent.goal} using ${strategy.parallelSearches?.length || 0} parallel searches and ${strategy.conditionalSearches?.length || 0} conditional searches`;
  }
}

export const searchOrchestrator = new SearchOrchestrator();
