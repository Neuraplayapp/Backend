/**
 * CONTENT RENDERER SERVICE - State-of-the-Art Message Formatting
 * 
 * Renders different content categories with specialized formats and structures.
 * Each content type gets its own optimized presentation format.
 */

import { ContentAnalysis, ContentCategory, StructuredContent, RecipeData, TutorialData, ArticleData, NewsData, ReviewData, AcademicData, ForumData } from './agents/ContentAnalyzer';

export interface RenderedContent {
  category: ContentCategory;
  formattedMessage: string;
  metadata: {
    renderTime: number;
    templateUsed: string;
    interactiveElements: string[];
    accessibility: AccessibilityFeatures;
  };
}

export interface AccessibilityFeatures {
  hasHeadings: boolean;
  hasLists: boolean;
  hasEmphasis: boolean;
  readingLevel: 'beginner' | 'intermediate' | 'advanced';
  estimatedReadTime: string;
}

export interface WeatherData {
  location: string;
  temperature: number;
  description: string;
  humidity: number;
  windSpeed: number;
  units: string;
  forecast?: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
  }>;
}

export class ContentRenderer {
  private static instance: ContentRenderer;

  static getInstance(): ContentRenderer {
    if (!ContentRenderer.instance) {
      ContentRenderer.instance = new ContentRenderer();
    }
    return ContentRenderer.instance;
  }

  /**
   * MAIN RENDERING METHOD
   * Routes content to appropriate category-specific renderer
   */
  renderContent(analysis: ContentAnalysis): RenderedContent {
    const startTime = Date.now();
    console.log(`🎨 ContentRenderer: Rendering ${analysis.structuredData.contentType} content`);

    let formattedMessage: string;
    let templateUsed: string;
    let interactiveElements: string[] = [];

    switch (analysis.structuredData.contentType) {
      case 'recipe':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderRecipe(analysis));
        break;
      case 'tutorial':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderTutorial(analysis));
        break;
      case 'academic':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderAcademic(analysis));
        break;
      case 'news':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderNews(analysis));
        break;
      case 'review':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderReview(analysis));
        break;
      case 'documentation':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderDocumentation(analysis));
        break;
      case 'forum':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderForum(analysis));
        break;
      case 'troubleshooting':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderTroubleshooting(analysis));
        break;
      case 'comparison':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderComparison(analysis));
        break;
      case 'commercial':
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderCommercial(analysis));
        break;
      default:
        ({ formattedMessage, templateUsed, interactiveElements } = this.renderGenericArticle(analysis));
    }

    const renderTime = Date.now() - startTime;
    const accessibility = this.analyzeAccessibility(formattedMessage, analysis.structuredData.contentType);

    return {
      category: analysis.structuredData.contentType,
      formattedMessage,
      metadata: {
        renderTime,
        templateUsed,
        interactiveElements,
        accessibility
      }
    };
  }

  /**
   * SPECIALIZED WEATHER RENDERING
   * Weather gets its own special format
   */
  renderWeather(weatherData: WeatherData): RenderedContent {
    const startTime = Date.now();

    const temperature = weatherData.units === 'imperial' 
      ? `${weatherData.temperature}°F` 
      : `${weatherData.temperature}°C`;

    const formattedMessage = `# 🌤️ Weather Report
## Real-time conditions for ${weatherData.location}${weatherData.country ? `, ${weatherData.country}` : ''}

### Current Conditions
- **🌡️ Temperature:** ${temperature}${weatherData.feels_like ? ` (feels like ${weatherData.feels_like}°${weatherData.units === 'metric' ? 'C' : 'F'})` : ''}
- **☁️ Conditions:** ${weatherData.description}
- **💧 Humidity:** ${weatherData.humidity}%
- **💨 Wind:** ${weatherData.windSpeed} ${weatherData.units === 'imperial' ? 'mph' : 'km/h'}

${weatherData.forecast ? this.renderWeatherForecast(weatherData.forecast, weatherData.units) : ''}`;

    const renderTime = Date.now() - startTime;

    return {
      category: 'reference',
      formattedMessage,
      metadata: {
        renderTime,
        templateUsed: 'weather_card',
        interactiveElements: ['location_link'],
        accessibility: {
          hasHeadings: true,
          hasLists: true,
          hasEmphasis: true,
          readingLevel: 'beginner',
          estimatedReadTime: '30 seconds'
        }
      }
    };
  }

  /**
   * RECIPE RENDERING - Specialized for cooking content
   */
  private renderRecipe(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const recipe = analysis.structuredData.structuredFields as RecipeData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
🍳 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📋 Quick Info:**
${recipe?.prepTime ? `⏱️ Prep: ${recipe.prepTime}` : ''}
${recipe?.cookTime ? `🔥 Cook: ${recipe.cookTime}` : ''}
${recipe?.servings ? `👥 Serves: ${recipe.servings}` : ''}
${recipe?.difficulty ? `📊 Difficulty: ${recipe.difficulty}` : ''}

**🛒 Ingredients:**
${recipe?.ingredients?.map(ing => `• ${ing}`).join('\n') || 'See source for ingredients'}

**👨‍🍳 Instructions:**
${recipe?.instructions?.map((inst, i) => `${i + 1}. ${inst.trim()}`).join('\n') || 'See source for instructions'}

**💡 Key Tips:**
${analysis.structuredData.keyPoints.slice(0, 3).map(tip => `• ${tip}`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'recipe_card',
      interactiveElements: ['ingredient_checkboxes', 'timer_buttons', 'serving_calculator']
    };
  }

  /**
   * TUTORIAL RENDERING - Step-by-step format
   */
  private renderTutorial(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const tutorial = analysis.structuredData.structuredFields as TutorialData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
📚 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📋 Overview:**
${tutorial?.difficulty ? `📊 **Difficulty:** ${tutorial.difficulty}` : ''}
${tutorial?.estimatedTime ? `⏱️ **Time:** ${tutorial.estimatedTime}` : ''}

**✅ Prerequisites:**
${tutorial?.prerequisites?.map(req => `• ${req}`).join('\n') || '• Basic knowledge assumed'}

**🚀 Steps:**
${tutorial?.steps?.map((step, i) => `**${i + 1}.** ${step}`).join('\n\n') || 'See source for detailed steps'}

**💡 Key Points:**
${analysis.structuredData.keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'tutorial_guide',
      interactiveElements: ['step_tracker', 'progress_bar', 'bookmark_steps']
    };
  }

  /**
   * ACADEMIC RENDERING - Research paper format
   */
  private renderAcademic(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const academic = analysis.structuredData.structuredFields as AcademicData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
🎓 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📊 Research Summary:**
${academic?.authors?.length ? `👨‍🔬 **Authors:** ${academic.authors.join(', ')}` : ''}
${academic?.institution ? `🏛️ **Institution:** ${academic.institution}` : ''}
${academic?.publicationDate ? `📅 **Published:** ${academic.publicationDate}` : ''}
${academic?.peerReviewed ? '✅ **Peer Reviewed**' : '⚠️ **Not Peer Reviewed**'}

**📝 Abstract:**
${academic?.abstract || analysis.structuredData.mainContent.substring(0, 300) + '...'}

**🔍 Key Findings:**
${academic?.findings?.map(finding => `• ${finding}`).join('\n') || analysis.structuredData.keyPoints.slice(0, 3).map(point => `• ${point}`).join('\n')}

**📚 Citations:** ${academic?.citations?.length || 0} references

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'academic_paper',
      interactiveElements: ['citation_links', 'save_reference', 'related_papers']
    };
  }

  /**
   * NEWS RENDERING - Breaking news format
   */
  private renderNews(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const news = analysis.structuredData.structuredFields as NewsData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const urgencyEmoji = news?.updateFrequency === 'breaking' ? '🚨' : 
                        news?.updateFrequency === 'developing' ? '📈' : '📰';

    const formattedMessage = `
${urgencyEmoji} **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📰 News Summary:**
${news?.publishDate ? `📅 **Published:** ${news.publishDate}` : ''}
${news?.author ? `✍️ **Reporter:** ${news.author}` : ''}
${news?.location ? `📍 **Location:** ${news.location}` : ''}
${news?.updateFrequency ? `📊 **Status:** ${news.updateFrequency}` : ''}

**🔥 Key Events:**
${news?.keyEvents?.map(event => `• ${event}`).join('\n') || analysis.structuredData.keyPoints.slice(0, 4).map(point => `• ${point}`).join('\n')}

**📄 Article Summary:**
${analysis.structuredData.mainContent.substring(0, 400) + '...'}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'news_article',
      interactiveElements: ['follow_story', 'share_news', 'related_articles']
    };
  }

  /**
   * REVIEW RENDERING - Product review format
   */
  private renderReview(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const review = analysis.structuredData.structuredFields as ReviewData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const ratingDisplay = review?.rating ? `⭐ **Rating:** ${review.rating}` : '';

    const formattedMessage = `
⭐ **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📊 Review Summary:**
${review?.productName ? `📦 **Product:** ${review.productName}` : ''}
${ratingDisplay}
${review?.testingMethod ? `🧪 **Testing:** ${review.testingMethod}` : ''}

**✅ Pros:**
${review?.pros?.map(pro => `• ${pro}`).join('\n') || '• See full review for details'}

**❌ Cons:**
${review?.cons?.map(con => `• ${con}`).join('\n') || '• See full review for details'}

**🎯 Verdict:**
${review?.verdict || analysis.structuredData.mainContent.substring(0, 200) + '...'}

**🔄 Alternatives:**
${review?.alternatives?.map(alt => `• ${alt}`).join('\n') || '• Check source for alternatives'}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'product_review',
      interactiveElements: ['rating_breakdown', 'price_tracker', 'compare_products']
    };
  }

  /**
   * DOCUMENTATION RENDERING - Technical docs format
   */
  private renderDocumentation(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
📖 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**🔧 Documentation Overview:**
${analysis.structuredData.mainContent.substring(0, 300)}...

**📋 Key Information:**
${analysis.structuredData.keyPoints.slice(0, 5).map(point => `• ${point}`).join('\n')}

**🔗 Quick Facts:**
${analysis.structuredData.facts.slice(0, 3).map(fact => `• ${fact.statement}`).join('\n')}

**📚 Related References:**
${analysis.structuredData.citations.slice(0, 3).map(citation => `• [Link](${citation})`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'technical_docs',
      interactiveElements: ['code_copy', 'api_explorer', 'version_selector']
    };
  }

  /**
   * FORUM RENDERING - Q&A format
   */
  private renderForum(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const forum = analysis.structuredData.structuredFields as ForumData;
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
💬 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**❓ Question:**
${forum?.question || analysis.structuredData.title}

**💡 Best Answer:**
${forum?.bestAnswer || analysis.structuredData.mainContent.substring(0, 400) + '...'}

**📊 Discussion Stats:**
${forum?.answerCount ? `💬 **Answers:** ${forum.answerCount}` : ''}
${forum?.votes ? `👍 **Votes:** ${forum.votes}` : ''}
${forum?.expertise ? `🎯 **Level:** ${forum.expertise}` : ''}
${forum?.lastActivity ? `🕒 **Last Active:** ${forum.lastActivity}` : ''}

**🏷️ Tags:**
${forum?.tags?.map(tag => `\`${tag}\``).join(' ') || 'No tags'}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'forum_qa',
      interactiveElements: ['vote_buttons', 'follow_thread', 'ask_question']
    };
  }

  /**
   * TROUBLESHOOTING RENDERING - Problem-solution format
   */
  private renderTroubleshooting(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
🔧 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**⚠️ Problem Description:**
${analysis.structuredData.mainContent.substring(0, 300)}...

**✅ Solution Steps:**
${analysis.structuredData.keyPoints.slice(0, 5).map((step, i) => `${i + 1}. ${step}`).join('\n')}

**🎯 Quick Fixes:**
${analysis.structuredData.facts.slice(0, 3).map(fact => `• ${fact.statement}`).join('\n')}

**📚 Additional Resources:**
${analysis.structuredData.citations.slice(0, 2).map(citation => `• [Reference](${citation})`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'troubleshooting_guide',
      interactiveElements: ['solution_tracker', 'report_success', 'get_help']
    };
  }

  /**
   * COMPARISON RENDERING - Side-by-side format
   */
  private renderComparison(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
⚖️ **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**🔍 Comparison Overview:**
${analysis.structuredData.mainContent.substring(0, 300)}...

**📊 Key Differences:**
${analysis.structuredData.keyPoints.slice(0, 5).map(point => `• ${point}`).join('\n')}

**🎯 Bottom Line:**
${analysis.structuredData.facts.slice(0, 2).map(fact => `• ${fact.statement}`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'comparison_table',
      interactiveElements: ['feature_matrix', 'filter_options', 'save_comparison']
    };
  }

  /**
   * COMMERCIAL RENDERING - Product info with bias warning
   */
  private renderCommercial(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
🛍️ **${analysis.structuredData.title}** ${reliability}

⚠️ **Commercial Content Notice:** This source may have commercial bias

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**🛒 Product Information:**
${analysis.structuredData.mainContent.substring(0, 300)}...

**🔍 Key Features:**
${analysis.structuredData.keyPoints.slice(0, 4).map(point => `• ${point}`).join('\n')}

**💡 Consider Also:**
• Look for independent reviews
• Compare with alternatives
• Check return policies

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'commercial_product',
      interactiveElements: ['price_alerts', 'review_finder', 'alternative_search']
    };
  }

  /**
   * GENERIC ARTICLE RENDERING - Fallback format
   */
  private renderGenericArticle(analysis: ContentAnalysis): { formattedMessage: string; templateUsed: string; interactiveElements: string[] } {
    const reliability = this.getReliabilityBadge(analysis.reliabilityScore);

    const formattedMessage = `
📄 **${analysis.structuredData.title}** ${reliability}

${this.renderTriggerAlerts(analysis.structuredData.contentTriggers)}

**📝 Summary:**
${analysis.structuredData.mainContent.substring(0, 400)}...

**🔍 Key Points:**
${analysis.structuredData.keyPoints.slice(0, 5).map(point => `• ${point}`).join('\n')}

${this.renderSourceInfo(analysis)}
    `.trim();

    return {
      formattedMessage,
      templateUsed: 'generic_article',
      interactiveElements: ['bookmark', 'share', 'related_articles']
    };
  }

  /**
   * HELPER METHODS
   */
  private renderWeatherForecast(forecast: WeatherData['forecast'], units: string): string {
    if (!forecast || forecast.length === 0) return '';

    const tempUnit = units === 'imperial' ? '°F' : '°C';
    
    return `
**📅 Forecast:**
${forecast.map(day => 
  `• **${day.day}:** ${day.condition} - High: ${day.high}${tempUnit}, Low: ${day.low}${tempUnit}`
).join('\n')}`;
  }

  private getReliabilityBadge(score: number): string {
    if (score >= 80) return '🟢 Highly Reliable';
    if (score >= 60) return '🟡 Moderately Reliable';
    return '🔴 Low Reliability';
  }

  private renderTriggerAlerts(triggers: any[]): string {
    if (!triggers || triggers.length === 0) return '';

    const highSeverityTriggers = triggers.filter(t => t.severity === 'high');
    if (highSeverityTriggers.length === 0) return '';

    return `
⚠️ **Content Alerts:**
${highSeverityTriggers.map(trigger => `• ${trigger.reason}`).join('\n')}
`;
  }

  private renderSourceInfo(analysis: ContentAnalysis): string {
    return `
---
**📍 Source:** [${analysis.url}](${analysis.url})
**🔍 Reliability:** ${analysis.reliabilityScore}/100
**⏱️ Analyzed:** ${new Date(analysis.metadata.processingTime).toLocaleTimeString()}
    `.trim();
  }

  private analyzeAccessibility(content: string, category: ContentCategory): AccessibilityFeatures {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    return {
      hasHeadings: /\*\*.*\*\*/.test(content),
      hasLists: /•/.test(content),
      hasEmphasis: /\*\*/.test(content),
      readingLevel: this.determineReadingLevel(category),
      estimatedReadTime: `${readingTime} minute${readingTime !== 1 ? 's' : ''}`
    };
  }

  private determineReadingLevel(category: ContentCategory): 'beginner' | 'intermediate' | 'advanced' {
    const levelMap: Record<ContentCategory, 'beginner' | 'intermediate' | 'advanced'> = {
      'recipe': 'beginner',
      'tutorial': 'intermediate',
      'academic': 'advanced',
      'news': 'beginner',
      'review': 'intermediate',
      'documentation': 'advanced',
      'forum': 'intermediate',
      'troubleshooting': 'intermediate',
      'comparison': 'intermediate',
      'commercial': 'beginner',
      'article': 'intermediate',
      'opinion': 'beginner',
      'reference': 'intermediate',
      'product': 'beginner'
    };
    
    return levelMap[category] || 'intermediate';
  }
}

// Export both the class and the instance
export const contentRenderer = ContentRenderer.getInstance();
// Note: ContentRenderer class is already exported implicitly
