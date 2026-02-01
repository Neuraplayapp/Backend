/**
 * LAYER 3: CONTENT ANALYSIS & VETTING AGENT
 * 
 * This agent turns unstructured web content into reliable, structured data.
 * It extracts content, scores reliability, and structures information.
 */

import { apiService } from '../APIService';
import { SearchResult, RawSearchResult } from './SearchExecutor';

export interface ContentAnalysis {
  url: string;
  extractedContent: string;
  reliabilityScore: number;
  structuredData: StructuredContent;
  metadata: {
    contentLength: number;
    extractionMethod: 'jina' | 'fallback';
    processingTime: number;
    qualityIndicators: QualityIndicators;
  };
}

export interface StructuredContent {
  title: string;
  mainContent: string;
  keyPoints: string[];
  facts: ExtractedFact[];
  citations: string[];
  contentType: ContentCategory;
  contentTriggers: ContentTrigger[];
  structuredFields?: RecipeData | TutorialData | ArticleData | NewsData | ReviewData | AcademicData | ForumData;
}

export type ContentCategory = 
  | 'recipe' | 'tutorial' | 'article' | 'documentation' | 'forum' 
  | 'news' | 'review' | 'academic' | 'product' | 'comparison' 
  | 'troubleshooting' | 'opinion' | 'reference' | 'commercial';

export interface ContentTrigger {
  type: TriggerType;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
  context: Record<string, any>;
}

export type TriggerType = 
  | 'missing_ingredients' | 'unusual_ingredients' | 'conflicting_cook_times'
  | 'outdated_information' | 'broken_links' | 'insufficient_detail'
  | 'credibility_low' | 'bias_detected' | 'commercial_content'
  | 'missing_prerequisites' | 'version_mismatch' | 'deprecated_method'
  | 'conflicting_sources' | 'incomplete_data' | 'expert_needed';

export interface ExtractedFact {
  statement: string;
  confidence: number;
  section: string;
}

export interface QualityIndicators {
  domainAuthority: number;
  contentDepth: number;
  recency: number;
  citationCount: number;
  authorCredibility: number;
}

export interface RecipeData {
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  difficulty?: string;
}

export interface TutorialData {
  steps: string[];
  prerequisites: string[];
  difficulty: string;
  estimatedTime?: string;
}

export interface ArticleData {
  summary: string;
  keyFindings: string[];
  methodology?: string;
  sources: string[];
}

export interface NewsData {
  headline: string;
  publishDate: string;
  author?: string;
  location?: string;
  keyEvents: string[];
  sources: string[];
  updateFrequency: 'breaking' | 'developing' | 'static';
}

export interface ReviewData {
  productName: string;
  rating?: string;
  pros: string[];
  cons: string[];
  verdict: string;
  testingMethod?: string;
  alternatives?: string[];
}

export interface AcademicData {
  abstract: string;
  authors: string[];
  institution?: string;
  methodology: string;
  findings: string[];
  citations: string[];
  publicationDate?: string;
  peerReviewed: boolean;
}

export interface ForumData {
  question: string;
  bestAnswer?: string;
  answerCount: number;
  votes?: number;
  tags: string[];
  lastActivity?: string;
  expertise: 'beginner' | 'intermediate' | 'expert';
}

export class ContentAnalyzer {
  /**
   * MAIN CONTENT ANALYSIS METHOD
   * Processes search results and extracts structured content
   */
  async analyzeSearchResults(
    searchResults: SearchResult[], 
    topN: number = 5
  ): Promise<ContentAnalysis[]> {
    console.log(`🔬 ContentAnalyzer: Analyzing top ${topN} results from ${searchResults.length} search queries...`);
    
    // Collect top URLs from all search results
    const topUrls = this.selectTopUrls(searchResults, topN);
    console.log(`📄 Selected ${topUrls.length} URLs for deep analysis`);
    
    // Process URLs in parallel for efficiency
    const analysisPromises = topUrls.map(result => this.analyzeContent(result));
    const analyses = await Promise.allSettled(analysisPromises);
    
    // Filter successful analyses and sort by reliability
    const successfulAnalyses = analyses
      .filter((result): result is PromiseFulfilledResult<ContentAnalysis> => 
        result.status === 'fulfilled' && result.value !== null
      )
      .map(result => result.value)
      .sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    
    console.log(`✅ Successfully analyzed ${successfulAnalyses.length}/${topUrls.length} URLs`);
    return successfulAnalyses;
  }

  /**
   * CONTENT EXTRACTION
   * Crawls actual source pages and extracts main content
   */
  private async analyzeContent(searchResult: RawSearchResult): Promise<ContentAnalysis | null> {
    const startTime = Date.now();
    console.log(`🔍 Analyzing content from: ${searchResult.domain}`);
    
    try {
      // Step 1: Extract content using Jina AI
      const extractedContent = await this.extractContent(searchResult.url);
      
      if (!extractedContent.success) {
        console.warn(`⚠️ Content extraction failed for ${searchResult.url}`);
        return null;
      }
      
      // Step 2: Calculate reliability score
      const reliabilityScore = this.calculateReliabilityScore(searchResult, extractedContent.data);
      
      // Step 3: Structure the content
      const structuredData = this.structureContent(extractedContent.data, searchResult);
      
      // Step 4: Extract quality indicators
      const qualityIndicators = this.assessQualityIndicators(extractedContent.data, searchResult);
      
      const processingTime = Date.now() - startTime;
      
      return {
        url: searchResult.url,
        extractedContent: extractedContent.data,
        reliabilityScore,
        structuredData,
        metadata: {
          contentLength: extractedContent.data.length,
          extractionMethod: 'jina',
          processingTime,
          qualityIndicators
        }
      };
      
    } catch (error) {
      console.error(`❌ Content analysis failed for ${searchResult.url}:`, error);
      return null;
    }
  }

  /**
   * CONTENT EXTRACTION using Jina AI
   */
  private async extractContent(url: string): Promise<any> {
    return await apiService.readURL(url, {
      format: 'markdown',
      includeImages: false,
      includeLinks: true
    });
  }

  /**
   * SOURCE RELIABILITY SCORING
   * Assigns reliability score based on multiple factors
   */
  private calculateReliabilityScore(
    searchResult: RawSearchResult,
    content: string
  ): number {
    let score = 0;
    
    // Domain Authority (40% of score)
    score += this.scoreDomainAuthority(searchResult.domain) * 0.4;
    
    // Content Quality (30% of score)
    score += this.scoreContentQuality(content) * 0.3;
    
    // Publication Recency (15% of score)
    score += this.scoreRecency(content) * 0.15;
    
    // Citations and References (15% of score)
    score += this.scoreCitations(content) * 0.15;
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * DOMAIN AUTHORITY SCORING
   */
  private scoreDomainAuthority(domain: string): number {
    const authorityMap: { [key: string]: number } = {
      // High Authority
      'edu': 95,
      'gov': 95,
      'who.int': 95,
      'nih.gov': 95,
      'nature.com': 90,
      'science.org': 90,
      'harvard.edu': 95,
      'mit.edu': 95,
      'stanford.edu': 95,
      
      // Technical Authority
      'stackoverflow.com': 85,
      'github.com': 80,
      'mozilla.org': 85,
      'w3.org': 90,
      'developer.mozilla.org': 85,
      'docs.microsoft.com': 80,
      'developers.google.com': 80,
      
      // Recipe Authority
      'allrecipes.com': 75,
      'foodnetwork.com': 75,
      'seriouseats.com': 80,
      'kingarthurbaking.com': 75,
      
      // News Authority
      'reuters.com': 85,
      'bbc.com': 80,
      'npr.org': 80,
      'apnews.com': 85,
      'wsj.com': 75,
      
      // General Reference
      'wikipedia.org': 70,
      'britannica.com': 75,
      
      // Low Authority
      'pinterest.com': 20,
      'blogspot.com': 30,
      'wordpress.com': 35,
      'medium.com': 45
    };
    
    // Check exact matches first
    for (const [pattern, score] of Object.entries(authorityMap)) {
      if (domain.includes(pattern)) {
        return score;
      }
    }
    
    // Domain type scoring
    if (domain.endsWith('.edu')) return 85;
    if (domain.endsWith('.gov')) return 85;
    if (domain.endsWith('.org')) return 65;
    if (domain.endsWith('.com')) return 55;
    
    return 50; // Default score
  }

  /**
   * CONTENT QUALITY SCORING
   */
  private scoreContentQuality(content: string): number {
    let score = 0;
    
    // Length indicates depth
    const wordCount = content.split(/\s+/).length;
    if (wordCount > 1000) score += 30;
    else if (wordCount > 500) score += 20;
    else if (wordCount > 200) score += 10;
    
    // Structure indicators
    if (content.includes('##') || content.includes('###')) score += 15; // Headers
    if (content.match(/\d+\./g)?.length > 3) score += 10; // Numbered lists
    if (content.match(/[-*]/g)?.length > 3) score += 10; // Bullet points
    
    // Code/technical content
    if (content.includes('```')) score += 15; // Code blocks
    if (content.includes('`')) score += 5; // Inline code
    
    // Recipe structure
    if (content.includes('ingredients') && content.includes('instructions')) score += 20;
    if (content.match(/\d+\s+(cup|tablespoon|teaspoon|pound|ounce)/gi)) score += 10;
    
    // Professional indicators
    if (content.includes('methodology')) score += 10;
    if (content.includes('conclusion')) score += 5;
    if (content.includes('references')) score += 10;
    
    return Math.min(100, score);
  }

  /**
   * RECENCY SCORING
   */
  private scoreRecency(content: string): number {
    const currentYear = new Date().getFullYear();
    const yearMatches = content.match(/\b20\d{2}\b/g);
    
    if (!yearMatches) return 50; // No date found
    
    const years = yearMatches.map(y => parseInt(y)).filter(y => y <= currentYear);
    const latestYear = Math.max(...years);
    
    const ageInYears = currentYear - latestYear;
    
    if (ageInYears === 0) return 100; // Current year
    if (ageInYears === 1) return 90;  // Last year
    if (ageInYears <= 3) return 75;   // Within 3 years
    if (ageInYears <= 5) return 50;   // Within 5 years
    return 25; // Older than 5 years
  }

  /**
   * CITATIONS SCORING
   */
  private scoreCitations(content: string): number {
    let score = 0;
    
    // Academic citations
    const academicCitations = content.match(/\[[0-9]+\]|\([0-9]{4}\)/g) || [];
    score += Math.min(30, academicCitations.length * 5);
    
    // DOI/arXiv references
    if (content.includes('doi:')) score += 20;
    if (content.includes('arxiv:')) score += 20;
    if (content.includes('pubmed')) score += 15;
    
    // URL references
    const urlCitations = content.match(/https?:\/\/[^\s)]+/g) || [];
    score += Math.min(20, urlCitations.length * 2);
    
    // Author credentials
    if (content.includes('PhD') || content.includes('Professor')) score += 15;
    if (content.includes('MD') || content.includes('Doctor')) score += 15;
    
    return Math.min(100, score);
  }

  /**
   * INFORMATION STRUCTURING
   * Converts raw text into structured format
   */
  private structureContent(content: string, searchResult: RawSearchResult): StructuredContent {
    const contentType = this.detectContentType(content, searchResult);
    
    const baseStructure: StructuredContent = {
      title: this.extractTitle(content, searchResult.title),
      mainContent: this.extractMainContent(content),
      keyPoints: this.extractKeyPoints(content),
      facts: this.extractFacts(content),
      citations: this.extractCitations(content),
      contentType,
      contentTriggers: this.analyzeContentTriggers(content, contentType, searchResult)
    };
    
    // Add specialized structured fields based on content type
    switch (contentType) {
      case 'recipe':
        baseStructure.structuredFields = this.structureRecipeData(content);
        break;
      case 'tutorial':
        baseStructure.structuredFields = this.structureTutorialData(content);
        break;
      case 'article':
        baseStructure.structuredFields = this.structureArticleData(content);
        break;
    }
    
    return baseStructure;
  }

  /**
   * ENHANCED CONTENT TYPE DETECTION
   * Analyzes content patterns, domain, and structure to categorize
   */
  private detectContentType(content: string, searchResult: RawSearchResult): ContentCategory {
    const lowerContent = content.toLowerCase();
    const lowerTitle = searchResult.title.toLowerCase();
    const domain = searchResult.domain.toLowerCase();
    
    // Academic content detection
    if (this.isAcademicContent(content, domain)) return 'academic';
    
    // News content detection
    if (this.isNewsContent(content, domain, lowerTitle)) return 'news';
    
    // Recipe detection - enhanced
    if (this.isRecipeContent(content)) return 'recipe';
    
    // Review detection
    if (this.isReviewContent(content, lowerTitle)) return 'review';
    
    // Product/Commercial detection
    if (this.isCommercialContent(content, domain)) return 'commercial';
    
    // Tutorial detection - enhanced
    if (this.isTutorialContent(content, lowerTitle)) return 'tutorial';
    
    // Documentation detection - enhanced
    if (this.isDocumentationContent(content, domain)) return 'documentation';
    
    // Forum detection - enhanced
    if (this.isForumContent(content, domain)) return 'forum';
    
    // Troubleshooting detection
    if (this.isTroubleshootingContent(content, lowerTitle)) return 'troubleshooting';
    
    // Comparison detection
    if (this.isComparisonContent(content, lowerTitle)) return 'comparison';
    
    // Opinion detection
    if (this.isOpinionContent(content, lowerTitle)) return 'opinion';
    
    // Reference detection
    if (this.isReferenceContent(content, domain)) return 'reference';
    
    // Default to article
    return 'article';
  }

  /**
   * CONTENT TYPE DETECTION HELPERS
   */
  private isAcademicContent(content: string, domain: string): boolean {
    const academicIndicators = [
      domain.includes('edu'), domain.includes('arxiv'), domain.includes('pubmed'),
      content.includes('abstract'), content.includes('methodology'),
      content.includes('peer review'), content.includes('doi:'),
      content.includes('university'), content.includes('research')
    ];
    return academicIndicators.filter(Boolean).length >= 2;
  }

  private isNewsContent(content: string, domain: string, title: string): boolean {
    const newsIndicators = [
      domain.includes('news'), domain.includes('cnn'), domain.includes('bbc'),
      domain.includes('reuters'), domain.includes('npr'),
      content.includes('breaking'), content.includes('reported'),
      title.includes('breaking'), title.includes('update'),
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+20\d{2}/i.test(content)
    ];
    return newsIndicators.filter(Boolean).length >= 2;
  }

  private isRecipeContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    const recipeIndicators = [
      lowerContent.includes('ingredients') && lowerContent.includes('instructions'),
      /\d+\s+(cup|tablespoon|teaspoon|pound|ounce|gram|ml|liter)s?/i.test(content),
      lowerContent.includes('recipe'),
      lowerContent.includes('cook') || lowerContent.includes('bake'),
      lowerContent.includes('prep time') || lowerContent.includes('cook time'),
      /serves?\s+\d+/i.test(content)
    ];
    return recipeIndicators.filter(Boolean).length >= 3;
  }

  private isReviewContent(content: string, title: string): boolean {
    const reviewIndicators = [
      /\b(review|rating|stars?)\b/i.test(content),
      /\b(pros?|cons?|advantages?|disadvantages?)\b/i.test(content),
      /\b(verdict|conclusion|recommendation)\b/i.test(content),
      /\b(\d+\/\d+|\d+\s*stars?|\d+\.\d+\/\d+)\b/i.test(content),
      title.includes('review') || title.includes('tested'),
      /\b(better|worse|compared to|vs\.?|versus)\b/i.test(content)
    ];
    return reviewIndicators.filter(Boolean).length >= 3;
  }

  private isCommercialContent(content: string, domain: string): boolean {
    const commercialIndicators = [
      content.includes('buy now') || content.includes('purchase'),
      content.includes('price') || content.includes('$'),
      content.includes('sale') || content.includes('discount'),
      domain.includes('shop') || domain.includes('store'),
      content.includes('product') && content.includes('features'),
      content.includes('free shipping') || content.includes('warranty')
    ];
    return commercialIndicators.filter(Boolean).length >= 3;
  }

  private isTutorialContent(content: string, title: string): boolean {
    const tutorialIndicators = [
      /\b(step\s+\d+|steps?)\b/i.test(content),
      title.includes('how to') || title.includes('tutorial') || title.includes('guide'),
      /\b(first|next|then|finally|last)\b/i.test(content),
      content.includes('you will need') || content.includes('requirements'),
      /\d+\.\s+/g.test(content) && content.split(/\d+\.\s+/).length > 3
    ];
    return tutorialIndicators.filter(Boolean).length >= 3;
  }

  private isDocumentationContent(content: string, domain: string): boolean {
    const docIndicators = [
      domain.includes('docs.') || domain.includes('developer.'),
      content.includes('api') || content.includes('```'),
      content.includes('parameters') || content.includes('returns'),
      content.includes('example') && content.includes('code'),
      content.includes('installation') || content.includes('configuration'),
      content.includes('reference') || content.includes('specification')
    ];
    return docIndicators.filter(Boolean).length >= 3;
  }

  private isForumContent(content: string, domain: string): boolean {
    const forumIndicators = [
      domain.includes('stackoverflow') || domain.includes('reddit') || domain.includes('forum'),
      content.includes('asked') || content.includes('question'),
      content.includes('answered') || content.includes('reply'),
      content.includes('votes') || content.includes('upvoted'),
      content.includes('community') || content.includes('discussion')
    ];
    return forumIndicators.filter(Boolean).length >= 2;
  }

  private isTroubleshootingContent(content: string, title: string): boolean {
    const troubleshootingIndicators = [
      title.includes('fix') || title.includes('solve') || title.includes('error'),
      content.includes('problem') || content.includes('issue'),
      content.includes('solution') || content.includes('workaround'),
      content.includes('troubleshoot') || content.includes('debug'),
      title.includes('not working') || title.includes('broken')
    ];
    return troubleshootingIndicators.filter(Boolean).length >= 2;
  }

  private isComparisonContent(content: string, title: string): boolean {
    const comparisonIndicators = [
      title.includes(' vs ') || title.includes(' versus '),
      content.includes('compared to') || content.includes('comparison'),
      content.includes('difference between') || content.includes('which is better'),
      /\b(option [ab]|alternative|choice)\b/i.test(content),
      content.includes('pros and cons')
    ];
    return comparisonIndicators.filter(Boolean).length >= 2;
  }

  private isOpinionContent(content: string, title: string): boolean {
    const opinionIndicators = [
      content.includes('i think') || content.includes('in my opinion'),
      content.includes('personally') || content.includes('i believe'),
      title.includes('thoughts on') || title.includes('my take'),
      content.includes('subjective') || content.includes('perspective'),
      /\b(feels?|seems?|appears?)\b/i.test(content)
    ];
    return opinionIndicators.filter(Boolean).length >= 2;
  }

  private isReferenceContent(content: string, domain: string): boolean {
    const referenceIndicators = [
      domain.includes('wikipedia') || domain.includes('britannica'),
      content.includes('definition') || content.includes('meaning'),
      content.includes('etymology') || content.includes('history'),
      content.includes('see also') || content.includes('references'),
      /\[\d+\]/g.test(content) && content.split(/\[\d+\]/).length > 5
    ];
    return referenceIndicators.filter(Boolean).length >= 2;
  }

  /**
   * CONTENT-AWARE TRIGGER ANALYSIS
   * Analyzes content to identify specific issues and trigger follow-up actions
   */
  private analyzeContentTriggers(
    content: string, 
    contentType: ContentCategory, 
    searchResult: RawSearchResult
  ): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Universal triggers (apply to all content types)
    triggers.push(...this.analyzeUniversalTriggers(content, searchResult));
    
    // Content-type specific triggers
    switch (contentType) {
      case 'recipe':
        triggers.push(...this.analyzeRecipeTriggers(content));
        break;
      case 'tutorial':
        triggers.push(...this.analyzeTutorialTriggers(content));
        break;
      case 'documentation':
        triggers.push(...this.analyzeDocumentationTriggers(content));
        break;
      case 'academic':
        triggers.push(...this.analyzeAcademicTriggers(content));
        break;
      case 'news':
        triggers.push(...this.analyzeNewsTriggers(content));
        break;
      case 'review':
        triggers.push(...this.analyzeReviewTriggers(content));
        break;
      case 'forum':
        triggers.push(...this.analyzeForumTriggers(content));
        break;
      case 'troubleshooting':
        triggers.push(...this.analyzeTroubleshootingTriggers(content));
        break;
      case 'commercial':
        triggers.push(...this.analyzeCommercialTriggers(content));
        break;
    }
    
    return triggers;
  }

  /**
   * UNIVERSAL TRIGGERS - Apply to all content types
   */
  private analyzeUniversalTriggers(content: string, searchResult: RawSearchResult): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Credibility concerns
    const credibilityScore = this.scoreDomainAuthority(searchResult.domain);
    if (credibilityScore < 50) {
      triggers.push({
        type: 'credibility_low',
        reason: `Domain ${searchResult.domain} has low authority score: ${credibilityScore}`,
        severity: 'medium',
        suggestedAction: 'Search for additional sources from high-authority domains (.edu, .gov, reputable organizations)',
        context: { domain: searchResult.domain, score: credibilityScore }
      });
    }
    
    // Outdated information
    const currentYear = new Date().getFullYear();
    const years = content.match(/\b20\d{2}\b/g);
    if (years) {
      const latestYear = Math.max(...years.map(y => parseInt(y)));
      if (currentYear - latestYear > 3) {
        triggers.push({
          type: 'outdated_information',
          reason: `Content appears to be from ${latestYear}, which is ${currentYear - latestYear} years old`,
          severity: 'medium',
          suggestedAction: 'Search for more recent information with date restrictions (after:2022)',
          context: { latestYear, ageInYears: currentYear - latestYear }
        });
      }
    }
    
    // Broken or missing links
    const linkCount = (content.match(/https?:\/\/[^\s)]+/g) || []).length;
    if (linkCount === 0 && content.length > 500) {
      triggers.push({
        type: 'broken_links',
        reason: 'Content lacks external references or supporting links',
        severity: 'low',
        suggestedAction: 'Search for content with more citations and references',
        context: { linkCount, contentLength: content.length }
      });
    }
    
    // Bias detection
    const biasIndicators = content.match(/\b(definitely|absolutely|clearly|obviously|without doubt|everyone knows|it's obvious)\b/gi) || [];
    if (biasIndicators.length > 3) {
      triggers.push({
        type: 'bias_detected',
        reason: `Found ${biasIndicators.length} bias indicators suggesting subjective language`,
        severity: 'medium',
        suggestedAction: 'Search for more objective, factual sources',
        context: { biasIndicators: biasIndicators.slice(0, 5) }
      });
    }
    
    // Insufficient detail
    if (content.length < 200) {
      triggers.push({
        type: 'insufficient_detail',
        reason: 'Content is very brief and may lack comprehensive information',
        severity: 'medium',
        suggestedAction: 'Search for more detailed, in-depth content on this topic',
        context: { contentLength: content.length }
      });
    }
    
    return triggers;
  }

  /**
   * RECIPE-SPECIFIC TRIGGERS
   */
  private analyzeRecipeTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Missing ingredients
    if (!content.toLowerCase().includes('ingredients')) {
      triggers.push({
        type: 'missing_ingredients',
        reason: 'Recipe content found but ingredients list is missing or unclear',
        severity: 'high',
        suggestedAction: 'Search specifically for "ingredients for [recipe name]"',
        context: { missingSection: 'ingredients' }
      });
    }
    
    // Unusual ingredients detection
    const unusualIngredients = [
      'nutritional yeast', 'aquafaba', 'xanthan gum', 'agar powder',
      'tahini', 'miso paste', 'tempeh', 'seitan', 'cashew cream'
    ];
    
    const foundUnusualIngredients = unusualIngredients.filter(ingredient =>
      content.toLowerCase().includes(ingredient)
    );
    
    if (foundUnusualIngredients.length > 0) {
      triggers.push({
        type: 'unusual_ingredients',
        reason: `Recipe contains uncommon ingredients: ${foundUnusualIngredients.join(', ')}`,
        severity: 'medium',
        suggestedAction: 'Search for ingredient substitutions and where to buy these items',
        context: { unusualIngredients: foundUnusualIngredients }
      });
    }
    
    // Conflicting cook times
    const timeMatches = content.match(/\d+\s*(?:minute|min|hour|hr)s?/gi) || [];
    const times = timeMatches.map(t => {
      const num = parseInt(t);
      return t.toLowerCase().includes('hour') || t.toLowerCase().includes('hr') ? num * 60 : num;
    });
    
    if (times.length > 1) {
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      if (maxTime - minTime > 60) { // More than 1 hour difference
        triggers.push({
          type: 'conflicting_cook_times',
          reason: `Found conflicting time estimates: ${minTime} to ${maxTime} minutes`,
          severity: 'medium',
          suggestedAction: 'Search for additional recipes to verify typical cooking times',
          context: { minTime, maxTime, difference: maxTime - minTime }
        });
      }
    }
    
    return triggers;
  }

  /**
   * TUTORIAL-SPECIFIC TRIGGERS
   */
  private analyzeTutorialTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Missing prerequisites
    if (!content.toLowerCase().includes('prerequisite') && 
        !content.toLowerCase().includes('requirement') &&
        !content.toLowerCase().includes('need')) {
      triggers.push({
        type: 'missing_prerequisites',
        reason: 'Tutorial lacks clear prerequisites or requirements section',
        severity: 'medium',
        suggestedAction: 'Search for beginner guides or prerequisite information',
        context: { missingSection: 'prerequisites' }
      });
    }
    
    // Version mismatch detection
    const versionPattern = /v?\d+\.\d+/g;
    const versions = content.match(versionPattern) || [];
    if (versions.length > 0) {
      const currentYear = new Date().getFullYear();
      const yearInContent = content.match(/\b20\d{2}\b/g);
      const contentYear = yearInContent ? Math.max(...yearInContent.map(y => parseInt(y))) : currentYear;
      
      if (currentYear - contentYear > 2) {
        triggers.push({
          type: 'version_mismatch',
          reason: `Tutorial mentions versions ${versions.join(', ')} but content is from ${contentYear}`,
          severity: 'high',
          suggestedAction: 'Search for tutorials with current software versions',
          context: { versions, contentYear, ageInYears: currentYear - contentYear }
        });
      }
    }
    
    return triggers;
  }

  /**
   * DOCUMENTATION-SPECIFIC TRIGGERS
   */
  private analyzeDocumentationTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Deprecated method detection
    if (content.toLowerCase().includes('deprecated') || 
        content.toLowerCase().includes('legacy') ||
        content.toLowerCase().includes('no longer supported')) {
      triggers.push({
        type: 'deprecated_method',
        reason: 'Documentation mentions deprecated or legacy methods',
        severity: 'high',
        suggestedAction: 'Search for current, supported alternatives and migration guides',
        context: { deprecationMentioned: true }
      });
    }
    
    // Missing code examples
    if (!content.includes('```') && !content.includes('example')) {
      triggers.push({
        type: 'insufficient_detail',
        reason: 'Documentation lacks code examples or practical implementation details',
        severity: 'medium',
        suggestedAction: 'Search for tutorials with code examples and practical implementations',
        context: { missingSection: 'code_examples' }
      });
    }
    
    return triggers;
  }

  /**
   * ACADEMIC-SPECIFIC TRIGGERS
   */
  private analyzeAcademicTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Check if peer reviewed
    const isPeerReviewed = content.toLowerCase().includes('peer review') || 
                          content.toLowerCase().includes('peer-reviewed');
    
    if (!isPeerReviewed) {
      triggers.push({
        type: 'expert_needed',
        reason: 'Academic content may not be peer-reviewed',
        severity: 'medium',
        suggestedAction: 'Search for peer-reviewed sources using site:edu or "peer reviewed" filters',
        context: { peerReviewed: false }
      });
    }
    
    // Missing methodology
    if (!content.toLowerCase().includes('method') && 
        !content.toLowerCase().includes('procedure')) {
      triggers.push({
        type: 'incomplete_data',
        reason: 'Academic content lacks clear methodology section',
        severity: 'medium',
        suggestedAction: 'Search for full research papers with detailed methodology',
        context: { missingSection: 'methodology' }
      });
    }
    
    return triggers;
  }

  /**
   * NEWS-SPECIFIC TRIGGERS
   */
  private analyzeNewsTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Check for developing story
    if (content.toLowerCase().includes('developing') || 
        content.toLowerCase().includes('breaking') ||
        content.toLowerCase().includes('update')) {
      triggers.push({
        type: 'expert_needed',
        reason: 'Breaking or developing news story - information may be incomplete',
        severity: 'high',
        suggestedAction: 'Search for latest updates and multiple news sources for verification',
        context: { developingStory: true }
      });
    }
    
    return triggers;
  }

  /**
   * REVIEW-SPECIFIC TRIGGERS
   */
  private analyzeReviewTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Missing testing methodology
    if (!content.toLowerCase().includes('test') && 
        !content.toLowerCase().includes('experience')) {
      triggers.push({
        type: 'insufficient_detail',
        reason: 'Review lacks testing methodology or hands-on experience details',
        severity: 'medium',
        suggestedAction: 'Search for detailed reviews with testing procedures',
        context: { missingSection: 'testing_methodology' }
      });
    }
    
    return triggers;
  }

  /**
   * FORUM-SPECIFIC TRIGGERS
   */
  private analyzeForumTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Check for unanswered questions
    if (content.toLowerCase().includes('question') && 
        !content.toLowerCase().includes('answer')) {
      triggers.push({
        type: 'incomplete_data',
        reason: 'Forum post contains questions but may lack definitive answers',
        severity: 'medium',
        suggestedAction: 'Search for resolved discussions or official documentation',
        context: { hasQuestion: true, hasAnswer: false }
      });
    }
    
    return triggers;
  }

  /**
   * TROUBLESHOOTING-SPECIFIC TRIGGERS
   */
  private analyzeTroubleshootingTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Check for solution verification
    if (content.toLowerCase().includes('problem') && 
        !content.toLowerCase().includes('solved') &&
        !content.toLowerCase().includes('fixed')) {
      triggers.push({
        type: 'incomplete_data',
        reason: 'Troubleshooting content describes problems but solution status is unclear',
        severity: 'medium',
        suggestedAction: 'Search for verified solutions and success stories',
        context: { problemDescribed: true, solutionVerified: false }
      });
    }
    
    return triggers;
  }

  /**
   * COMMERCIAL-SPECIFIC TRIGGERS
   */
  private analyzeCommercialTriggers(content: string): ContentTrigger[] {
    const triggers: ContentTrigger[] = [];
    
    // Commercial bias detection
    if (content.includes('buy now') || content.includes('limited time')) {
      triggers.push({
        type: 'commercial_content',
        reason: 'Content has strong commercial bias with sales language',
        severity: 'high',
        suggestedAction: 'Search for unbiased reviews and comparisons from non-commercial sources',
        context: { commercialBias: true }
      });
    }
    
    return triggers;
  }

  /**
   * SPECIALIZED CONTENT STRUCTURING
   */
  private structureRecipeData(content: string): RecipeData {
    return {
      ingredients: this.extractIngredients(content),
      instructions: this.extractInstructions(content),
      prepTime: this.extractTime(content, 'prep'),
      cookTime: this.extractTime(content, 'cook'),
      servings: this.extractServings(content),
      difficulty: this.extractDifficulty(content)
    };
  }

  private structureTutorialData(content: string): TutorialData {
    return {
      steps: this.extractSteps(content),
      prerequisites: this.extractPrerequisites(content),
      difficulty: this.extractDifficulty(content),
      estimatedTime: this.extractTime(content, 'total')
    };
  }

  private structureArticleData(content: string): ArticleData {
    return {
      summary: this.extractSummary(content),
      keyFindings: this.extractKeyFindings(content),
      methodology: this.extractMethodology(content),
      sources: this.extractSources(content)
    };
  }

  /**
   * URL SELECTION LOGIC
   */
  private selectTopUrls(searchResults: SearchResult[], topN: number): RawSearchResult[] {
    // Flatten all results and score them
    const allResults = searchResults.flatMap(sr => sr.results);
    
    // Score each result
    const scoredResults = allResults.map(result => ({
      ...result,
      selectionScore: this.calculateSelectionScore(result)
    }));
    
    // Sort by score and take top N, avoiding duplicates
    const seenDomains = new Set<string>();
    const selectedResults: RawSearchResult[] = [];
    
    for (const result of scoredResults.sort((a, b) => b.selectionScore - a.selectionScore)) {
      if (selectedResults.length >= topN) break;
      
      // Avoid duplicate domains (take only best from each domain)
      if (!seenDomains.has(result.domain)) {
        seenDomains.add(result.domain);
        selectedResults.push(result);
      }
    }
    
    return selectedResults;
  }

  private calculateSelectionScore(result: RawSearchResult): number {
    let score = 0;
    
    // Position bias (earlier results are better)
    score += Math.max(0, 50 - (result.position * 5));
    
    // Domain authority
    score += this.scoreDomainAuthority(result.domain) * 0.3;
    
    // Snippet quality
    if (result.snippet.length > 100) score += 10;
    if (result.snippet.length > 200) score += 10;
    
    // Title relevance
    if (result.title.length > 10 && result.title.length < 100) score += 5;
    
    return score;
  }

  /**
   * QUALITY INDICATORS ASSESSMENT
   */
  private assessQualityIndicators(content: string, searchResult: RawSearchResult): QualityIndicators {
    return {
      domainAuthority: this.scoreDomainAuthority(searchResult.domain),
      contentDepth: this.scoreContentQuality(content),
      recency: this.scoreRecency(content),
      citationCount: (content.match(/\[[0-9]+\]|\([0-9]{4}\)/g) || []).length,
      authorCredibility: this.scoreAuthorCredibility(content)
    };
  }

  private scoreAuthorCredibility(content: string): number {
    let score = 50; // Base score
    
    if (content.includes('PhD')) score += 20;
    if (content.includes('Professor')) score += 15;
    if (content.includes('MD')) score += 20;
    if (content.includes('researcher')) score += 10;
    if (content.includes('author:') || content.includes('by:')) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * EXTRACTION HELPER METHODS
   * These would be more sophisticated in a real implementation
   */
  private extractTitle(content: string, fallbackTitle: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : fallbackTitle;
  }

  private extractMainContent(content: string): string {
    // Remove headers and extract main paragraphs
    const paragraphs = content.split('\n\n').filter(p => 
      p.length > 50 && !p.startsWith('#') && !p.startsWith('*')
    );
    return paragraphs.slice(0, 3).join('\n\n');
  }

  private extractKeyPoints(content: string): string[] {
    const bulletPoints = content.match(/^[-*•]\s+(.+)$/gm) || [];
    const numberedPoints = content.match(/^\d+\.\s+(.+)$/gm) || [];
    return [...bulletPoints, ...numberedPoints].slice(0, 5);
  }

  private extractFacts(content: string): ExtractedFact[] {
    // Simple fact extraction - look for definitive statements
    const sentences = content.split(/[.!?]+/).filter(s => s.length > 20);
    return sentences.slice(0, 3).map((statement, index) => ({
      statement: statement.trim(),
      confidence: 0.7, // Default confidence
      section: `section_${index + 1}`
    }));
  }

  private extractCitations(content: string): string[] {
    const urlCitations = content.match(/https?:\/\/[^\s)]+/g) || [];
    return urlCitations.slice(0, 5);
  }

  private extractIngredients(content: string): string[] {
    // Look for ingredient lists
    const ingredientSection = content.match(/ingredients?:?\s*([\s\S]*?)(?=instructions?|directions?|method)/i);
    if (ingredientSection) {
      return ingredientSection[1].split('\n').filter(line => 
        line.trim().length > 0 && (line.includes('cup') || line.includes('tablespoon') || line.includes('-'))
      ).slice(0, 15);
    }
    return [];
  }

  private extractInstructions(content: string): string[] {
    const instructionSection = content.match(/(?:instructions?|directions?|method):?\s*([\s\S]*)/i);
    if (instructionSection) {
      return instructionSection[1].split(/\d+\./).filter(step => step.trim().length > 10).slice(0, 20);
    }
    return [];
  }

  private extractTime(content: string, type: 'prep' | 'cook' | 'total'): string | undefined {
    const timePattern = new RegExp(`${type}\\s*time:?\\s*(\\d+\\s*(?:minute|min|hour|hr))`, 'i');
    const match = content.match(timePattern);
    return match ? match[1] : undefined;
  }

  private extractServings(content: string): string | undefined {
    const servingPattern = /(?:serves?|servings?):?\s*(\d+(?:-\d+)?)/i;
    const match = content.match(servingPattern);
    return match ? match[1] : undefined;
  }

  private extractDifficulty(content: string): string {
    const difficultyPattern = /(?:difficulty|level):?\s*(easy|medium|hard|beginner|intermediate|advanced)/i;
    const match = content.match(difficultyPattern);
    return match ? match[1].toLowerCase() : 'medium';
  }

  private extractSteps(content: string): string[] {
    const steps = content.match(/(?:step\s+)?\d+[.:]\s*(.+?)(?=(?:step\s+)?\d+[.:]|$)/gi) || [];
    return steps.map(step => step.replace(/^(?:step\s+)?\d+[.:]\s*/i, '').trim()).slice(0, 20);
  }

  private extractPrerequisites(content: string): string[] {
    const prereqSection = content.match(/(?:prerequisite|requirement|before|need):?\s*([\s\S]*?)(?=\n\n|\d+\.)/i);
    if (prereqSection) {
      return prereqSection[1].split(/[-*•]/).filter(p => p.trim().length > 5).slice(0, 10);
    }
    return [];
  }

  private extractSummary(content: string): string {
    const paragraphs = content.split('\n\n').filter(p => p.length > 100);
    return paragraphs[0] || content.substring(0, 300) + '...';
  }

  private extractKeyFindings(content: string): string[] {
    const findings = content.match(/(?:found|discovered|concluded|results? show):?\s*(.+?)(?=\.|$)/gi) || [];
    return findings.slice(0, 5);
  }

  private extractMethodology(content: string): string | undefined {
    const methodSection = content.match(/methodology:?\s*([\s\S]*?)(?=results?|conclusion|references)/i);
    return methodSection ? methodSection[1].trim() : undefined;
  }

  private extractSources(content: string): string[] {
    const sources = content.match(/(?:source|reference):?\s*(.+?)(?=\n|$)/gi) || [];
    return sources.slice(0, 10);
  }
}

export const contentAnalyzer = new ContentAnalyzer();
