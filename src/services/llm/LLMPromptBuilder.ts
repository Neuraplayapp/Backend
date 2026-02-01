/**
 * LLM Prompt Builder
 * 
 * Centralized service for building LLM prompts for canvas document generation.
 * Handles complexity-aware guidance and structured examples.
 */

export class LLMPromptBuilder {
  /**
   * Build a document creation prompt
   * @param params - Request parameters
   * @param intentData - Intent analysis from cognitive analyzer  
   * @param conversationContext - Recent chat history for back-references
   * @param personalMemories - User's personal memories for personalized content
   */
  static buildDocumentCreationPrompt(
    params: { request: string }, 
    intentData: any = null,
    conversationContext?: string,
    personalMemories?: string
  ): string {
    // Extract intent if wrapped
    const intent = intentData?.intent || intentData;
    
    // CRITICAL: Use lengthRequirement for word count targets (primary), complexityLevel as secondary
    let wordCountTarget = '';
    if (intent?.lengthRequirement) {
      switch (intent.lengthRequirement) {
        case 'brief':
          wordCountTarget = 'Target 400-600 words (brief, focused content)';
          break;
        case 'standard':
          wordCountTarget = 'Target 1000-1200 words (standard depth)';
          break;
        case 'comprehensive':
          wordCountTarget = 'Target 2000-2500 words (comprehensive coverage)';
          break;
        case 'extensive':
          wordCountTarget = 'Target 3000-3500 words (extensive, thorough analysis)';
          break;
        default:
          wordCountTarget = 'Target 1000-1200 words (standard depth)';
      }
    } else if (intent?.complexityLevel) {
      // Fallback to complexityLevel if lengthRequirement not provided
      switch (intent.complexityLevel) {
        case 'simple':
          wordCountTarget = 'Target 400-600 words (brief, clear content)';
          break;
        case 'moderate':
          wordCountTarget = 'Target 1000-1200 words (balanced detail)';
          break;
        case 'complex':
          wordCountTarget = 'Target 2000-2500 words (comprehensive)';
          break;
        case 'expert':
          wordCountTarget = 'Target 3000-3500 words (expert depth)';
          break;
      }
    }
    
    const complexityGuidance = wordCountTarget 
      ? `Length Requirement: ${intent?.lengthRequirement || intent?.complexityLevel} - ${wordCountTarget}\n`
      : '';
    
    const domainGuidance = intent?.primaryDomain
      ? `Domain: ${intent.primaryDomain} - Use appropriate terminology and domain-specific knowledge\n`
      : '';
    
    // 🎯 CONVERSATION CONTEXT: PRIMARY source for document topic
    const conversationSection = conversationContext 
      ? `\n📝 RECENT CONVERSATION (THIS DETERMINES THE TOPIC):
${conversationContext}
---
⚠️ THE DOCUMENT TOPIC MUST BE DERIVED FROM THIS CONVERSATION.\n`
      : '';
    
    // 🧠 RELEVANT CONTEXT: Only included if user explicitly asked for personalization
    const memoriesSection = personalMemories
      ? `\n🧠 PERSONALIZATION DETAILS (only use if relevant to the topic above):
${personalMemories}
---\n`
      : '';
    
    return `You are a professional content writer creating a comprehensive, well-written document.
${conversationSection}${memoriesSection}
USER REQUEST: ${params.request}

🎯 CRITICAL - TOPIC DERIVATION:
1. If the user request specifies a topic (e.g., "write about cats"), write about THAT topic.
2. If the request is vague (e.g., "make a document", "create it"), find the topic from the RECENT CONVERSATION above.
3. NEVER default to topics from memory/background context - the conversation determines the topic.
4. Example: If conversation discussed "cats" → Write about CATS. If conversation discussed "project deadlines" → Write about PROJECT DEADLINES.

${complexityGuidance}${domainGuidance}
🚫 NEVER ASK FOR CLARIFICATION - JUST WRITE:
- Do NOT ask "what would you like me to include?"
- Do NOT ask for more details or requirements
- Do NOT output "Clarification Needed" or similar
- If the topic is broad (e.g., "Islamic history"), pick the most interesting/important aspects and write about them
- Use your knowledge to make intelligent choices about what to cover
- START WRITING IMMEDIATELY - the user wants content, not questions

CRITICAL WRITING GUIDELINES:

1. WRITE WITH FLOWING PROSE - Not bullet-point outlines
   ✅ GOOD: "Breastfeeding is one of the most natural and beneficial ways to nourish your newborn. It creates a unique bond between mother and child while providing optimal nutrition tailored to your baby's needs. When learning to breastfeed, proper technique is crucial..."
   ❌ BAD: Just listing "• Benefits: provides nutrition • Technique: hold baby close"

2. USE PARAGRAPHS TO EXPLAIN - Give context and detail
   - Every section needs at least 2-3 paragraphs of explanatory prose BEFORE any lists
   - Explain WHY something matters, HOW it works, WHAT the reader should know
   - Write like you're having an intelligent conversation, not creating an outline
   - Ensure that each PAGE has 2-3 paragraphs at least.

3. USE BULLETS FOR CONCRETE LISTS, TABLES FOR STRUCTURED DATA:
   ✅ GOOD for bullets: concrete items, challenges/issues, symptoms, features, steps, resources
   ✅ GOOD for tables: comparisons, specifications, timelines, categorized data, multiple attributes
   ❌ BAD for bullets: explanations of WHY, descriptions of HOW, context/background
   - Always introduce bullet lists with 1-2 sentences of context
   - Always introduce tables with 1-2 sentences explaining what data is shown
   - After lists/tables, add a closing sentence to tie it together

4. STRUCTURE EACH SECTION:
   - Opening paragraph(s): Introduce topic, explain importance, provide context
   - Body paragraphs: Detailed explanation with examples and insights  
   - Optional list: ONLY if showing concrete items or steps
   - Closing: Summary or transition to next section

5. FORMATTING (CRITICAL - FOLLOW EXACTLY):
   
   **Headers:** Use ONLY for section titles, NEVER mix with numbers
   ✅ CORRECT:
   ## Ideation & Validation
   ### Step 1: Market Research
   
   ❌ WRONG:
   ## 1. Ideation & Validation  (DO NOT mix ## with numbers!)
   
   **Lists:** Keep separate from headers
   - Use 1., 2., 3. for numbered lists
   - Use - or * for bullet points
   - Always introduce lists with 1-2 sentences
   
   **Tables:** ALWAYS use proper markdown table syntax with pipes and alignment row
   
   ✅ CORRECT TABLE FORMAT:
   | Step | Action | Benefit |
   |------|--------|---------|
   | Define vision | Write detailed description | Increases attachment |
   | Break into milestones | Set achievable targets | Boosts confidence |
   
   ❌ WRONG - This is NOT a table:
   "1. Define vision | Action | Benefit"  (missing proper table structure)
   
   CRITICAL: Every table MUST have:
   - Header row with | separators
   - Alignment row (|------|------|------|)
   - Data rows with | separators
   - Each row on its own line
   
   **Emphasis:**
   - **Bold** sparingly (3-5 key terms per section max)
   - *Italic* for emphasis and key concepts
   - > Blockquotes for important notes
   
   **NEVER:**
   - Don't write "## 1. Title" or "## 2. Title"
   - Don't break table formatting
   - Don't mix header symbols (#) with list numbers

EXAMPLE STRUCTURE (with optional table):

## Breastfeeding

Breastfeeding is one of the most natural and beneficial ways to nourish your newborn. It creates a unique bond between mother and child while providing optimal nutrition specifically designed for your baby's needs. Breast milk contains essential antibodies that boost the immune system and protect against infections, making it the gold standard for infant nutrition.

When learning to breastfeed, proper technique is crucial for both comfort and effectiveness. Hold your baby close in a comfortable position, ensuring they achieve a deep latch that covers most of the areola, not just the nipple. Newborns typically feed 8-12 times in a 24-hour period. Feeding on demand rather than on a strict schedule helps establish a healthy milk supply and ensures your baby gets adequate nutrition.

Many new mothers face common challenges during the breastfeeding journey:
- **Breast engorgement**: Swelling and discomfort as milk comes in
- **Nipple soreness**: Pain from incorrect latch or frequent feeding  
- **Low milk supply concerns**: Anxiety about producing enough milk
- **Positioning difficulties**: Finding comfortable feeding positions

These issues usually resolve with time, proper technique, and support from a lactation consultant. Remember that breastfeeding is a learned skill for both mother and baby, and patience during this learning process is essential.

IMPORTANT COMPLETION REQUIREMENTS:
- Write naturally until you reach your target word count, then COMPLETE YOUR CURRENT SECTION
- DO NOT cut off mid-sentence - finish your thought and end with proper punctuation
- If you're running out of space, wrap up with a brief closing paragraph
- Ensure all markdown (code blocks, tables) are properly closed
- End with a complete sentence followed by period, exclamation mark, or question mark
- End on 2-3 paragraphs of content and if close to the target word count, complete the section rather than starting a new one
- Never end on table without closing the table.
- If closing on table add italic notes about the table.
- Never end on bullet list without closing the list.
- Never end without a closing sentence.
- Never end without a closing paragraph.
- Never start a new section within approximately 2-3 paragraphs of the target word count.
  

Generate a completed, professional document with rich explanatory content.
IMPORTANT: Return ONLY valid JSON (no extra text before or after):
{
  "title": "Clear, descriptive document title",
  "content": "Full markdown document content"
}`;
  }

  /**
   * Build a document revision/addition prompt
   */
  static buildDocumentRevisionPrompt(
    params: { request: string; conversationContext?: string },
    existingTitle: string,
    existingContent: string,
    intentData: any = null,
    isAppend: boolean
  ): string {
    // Extract intent if wrapped
    const intent = intentData?.intent || intentData;
    
    // CRITICAL: Use lengthRequirement for word count targets when adding/expanding content
    let wordCountGuidance = '';
    if (isAppend && intent?.lengthRequirement) {
      switch (intent.lengthRequirement) {
        case 'brief':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 400-600 words of new content';
          break;
        case 'standard':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 1000-1200 words of new content';
          break;
        case 'comprehensive':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 2000-2500 words of new content';
          break;
        case 'extensive':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 3000-3500 words of new content (substantial expansion)';
          break;
      }
    } else if (isAppend && intent?.complexityLevel) {
      // Fallback to complexityLevel
      switch (intent.complexityLevel) {
        case 'simple':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 400-600 words of new content';
          break;
        case 'moderate':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 1000-1200 words of new content';
          break;
        case 'complex':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 2000-2500 words of new content';
          break;
        case 'expert':
          wordCountGuidance = '\n📏 LENGTH TARGET: Add 3000-3500 words of new content';
          break;
      }
    }
    
    const complexityGuidance = intent?.complexityLevel 
      ? `\nCOMPLEXITY LEVEL: ${intent.complexityLevel} - ${
          intent.complexityLevel === 'simple' ? 'Keep it clear and concise' :
          intent.complexityLevel === 'moderate' ? 'Provide good detail with examples' :
          intent.complexityLevel === 'complex' ? 'Be comprehensive with deep analysis' :
          'Provide expert-level depth and nuance'
        }`
      : '';
    
    const domainGuidance = intent?.primaryDomain
      ? `\nDOMAIN: ${intent.primaryDomain} - Tailor content to this domain's terminology and expectations`
      : '';
    
    const styleGuidance = intent?.interactionStyle
      ? `\nSTYLE: ${intent.interactionStyle}`
      : '';
    
    // CRITICAL: For revisions, ONLY show the ending (not the full document)
    // This prevents massive prompts that leave no room for the actual new content
    // We only need to know: (1) What the document is about, (2) Where it ends
    const documentEnding = existingContent.slice(-800); // Last 800 chars show exact cutoff point
    
    // For context: Show first 300 chars (introduction) + last 800 chars (ending)
    const documentIntro = existingContent.substring(0, 300);
    const contextContent = existingContent.length > 1100
      ? `${documentIntro}\n\n...[middle section omitted to save tokens for YOUR new content]...\n\n${documentEnding}`
      : existingContent;
    
    if (isAppend) {
      // Check if this is specifically a CONTINUATION request (not just adding new content)
      // Short, vague requests are likely continuations: "go on", "keep going", "more", etc.
      const requestLower = params.request.toLowerCase();
      const isContinuationRequest = 
        intent?.primaryIntent === 'modification' ||
        intent?.secondaryIntent?.toLowerCase().includes('continu') ||
        intent?.secondaryIntent?.toLowerCase().includes('expand') ||
        (params.request.length < 40 && !requestLower.includes('add')); // Short requests without "add"
      
      const expandGuidance = isContinuationRequest 
        ? `\n\n🔍 **CRITICAL - EXPANSION REQUEST:**
The user wants you to continue from WHERE THE DOCUMENT ENDED (shown above).

📍 YOUR TASK: Continue writing FROM THE ENDING POINT shown in the existing content. 
- Identify what topic/section was being discussed at the end
- Continue that thought naturally as if you're writing the next paragraph
- Maintain the same style, tone, and level of detail
- DO NOT restart or summarize - just continue writing
- If the document ended mid-section, complete that section
- If it ended at a natural break, start the next logical section`
        : '';
      
      // 🎯 CRITICAL: Include conversation context so AI knows WHAT to add
      // When user says "add it" or "yes", we need to know what the AI proposed
      const conversationSection = params.conversationContext 
        ? `\n📝 RECENT CONVERSATION (THE AI PROPOSED TO ADD THIS CONTENT - USE IT):
${params.conversationContext}
---
⚠️ CRITICAL: The user said "${params.request}" to confirm adding the content proposed above.
Write the EXACT content that was proposed in the conversation, not generic content.\n`
        : '';
      
      return `You are a professional content writer adding comprehensive new content to an existing document.

EXISTING DOCUMENT:
Title: ${existingTitle}
Content:
${contextContent}
${expandGuidance}
${conversationSection}
---

USER REQUEST: ${params.request}${wordCountGuidance}${complexityGuidance}${domainGuidance}${styleGuidance}

🚨 LENGTH: ${wordCountGuidance ? wordCountGuidance.replace('\n📏 LENGTH TARGET: ', '').toUpperCase() + ' - NOT optional!' : 'Generate substantial content!'}

GUIDELINES:
- Write multiple full sections (3-5 paragraphs each)
- Use flowing prose, not bullet outlines
- Introduce lists/tables with context sentences
- Be specific to this document's topic (no placeholders)
- Format: ## for sections, ### for subsections, **bold** sparingly
- Keep writing until target word count reached

---
IMPORTANT: Return ONLY valid JSON (no extra text before or after):
{
  "title": "${existingTitle}",
  "content": "ONLY the new markdown content to ADD (not the entire document)"
}`;
    } else {
      return `You are revising an existing document.${complexityGuidance}${domainGuidance}${styleGuidance}

EXISTING DOCUMENT:
Title: ${existingTitle}
Content:
${contextContent}

USER REQUEST: ${params.request}

IMPORTANT: Return ONLY valid JSON (no extra text before or after):
{
  "title": "${existingTitle}",
  "content": "ONLY the new/revised markdown content (not the entire document)"
}`;
    }
  }
}

