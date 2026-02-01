/**
 * 🎯 COMPETENCY REMEDIATION SERVICE
 * 
 * Generates TARGETED help for struggling competencies
 * - Creates practice exercises specific to the weak area
 * - Provides step-by-step review materials
 * - Generates quiz questions focused on the competency
 * - Schedules spaced repetition for reinforcement
 */

import { unifiedAPIRouter } from './UnifiedAPIRouter';
import type { Question } from '../types/LearningModule.types';

export interface RemediationContent {
  competencyName: string;
  currentLevel: number;
  
  // Review materials
  explanation: string; // Simplified explanation of the concept
  keyPoints: string[]; // Core concepts to understand
  examples: string[]; // Concrete examples
  
  // Practice exercises
  practiceQuestions: Question[]; // 5-10 targeted questions
  
  // Next steps
  studyPlan: {
    step: number;
    title: string;
    description: string;
    estimatedMinutes: number;
  }[];
  
  // Motivation
  encouragement: string;
}

export class CompetencyRemediationService {
  /**
   * Generate complete remediation content for a struggling competency
   */
  async generateRemediation(
    competencyName: string,
    currentLevel: number,
    courseContext: string,
    strengthAreas: string[]
  ): Promise<RemediationContent> {
    console.log(`🎯 Generating remediation for: ${competencyName} (${currentLevel}%)`);

    try {
      // Build prompt for LLM
      const prompt = this.buildRemediationPrompt(
        competencyName,
        currentLevel,
        courseContext,
        strengthAreas
      );

      // Call LLM API with ChatGPT OSS 120b
      const response = await unifiedAPIRouter.chat(prompt, {
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 2000
      });

      // Parse response
      const content = this.parseRemediationResponse(response, competencyName, currentLevel);
      
      return content;
    } catch (error) {
      console.error('❌ Failed to generate remediation:', error);
      // Return fallback content
      return this.getFallbackRemediation(competencyName, currentLevel);
    }
  }

  /**
   * Build LLM prompt for remediation content
   */
  private buildRemediationPrompt(
    competencyName: string,
    currentLevel: number,
    courseContext: string,
    strengthAreas: string[]
  ): string {
    const strengthText = strengthAreas.length > 0
      ? `The learner is strong in: ${strengthAreas.join(', ')}. Build on these strengths.`
      : '';

    return `You are a expert tutor helping a student who is struggling with "${competencyName}" (currently at ${currentLevel}%).

Context: This is part of a course on "${courseContext}".
${strengthText}

Your task: Create TARGETED remediation content to help them improve this specific skill.

Generate a JSON response with this EXACT structure:
{
  "explanation": "A clear, simplified explanation of ${competencyName}. Use analogies and concrete examples. Break it down step-by-step.",
  "keyPoints": [
    "Core concept 1 (most important)",
    "Core concept 2",
    "Core concept 3",
    "Core concept 4"
  ],
  "examples": [
    "Concrete example 1 with explanation",
    "Concrete example 2 with explanation",
    "Concrete example 3 with explanation"
  ],
  "practiceQuestions": [
    {
      "question": "Question 1 targeting ${competencyName}",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "Why this is correct and how it relates to ${competencyName}"
    },
    {
      "question": "Question 2 (slightly harder)",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "B",
      "explanation": "Explanation"
    },
    {
      "question": "Question 3 (application)",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "C",
      "explanation": "Explanation"
    }
  ],
  "studyPlan": [
    {
      "step": 1,
      "title": "Review core concepts",
      "description": "Read the explanation and examples carefully",
      "estimatedMinutes": 10
    },
    {
      "step": 2,
      "title": "Practice with questions",
      "description": "Complete the practice questions",
      "estimatedMinutes": 15
    },
    {
      "step": 3,
      "title": "Apply in new contexts",
      "description": "Try using ${competencyName} in different scenarios",
      "estimatedMinutes": 10
    }
  ],
  "encouragement": "A personalized, motivating message about improving ${competencyName}. Mention that they're at ${currentLevel}% and can definitely reach mastery with focused practice."
}

CRITICAL: Return ONLY valid JSON. No markdown, no extra text.`;
  }

  /**
   * Parse LLM response into RemediationContent
   */
  private parseRemediationResponse(
    response: string,
    competencyName: string,
    currentLevel: number
  ): RemediationContent {
    try {
      // Clean up response
      let cleaned = response.trim();
      
      // Remove markdown code blocks
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }
      
      // Parse JSON
      const parsed = JSON.parse(cleaned);
      
      // Convert practice questions to proper format
      const practiceQuestions: Question[] = parsed.practiceQuestions.map((q: any, idx: number) => ({
        id: `remediation_${competencyName}_${idx}`,
        text: q.question,
        type: 'multiple-choice' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: currentLevel < 40 ? 'easy' : currentLevel < 60 ? 'medium' : 'hard',
        category: competencyName
      }));
      
      return {
        competencyName,
        currentLevel,
        explanation: parsed.explanation,
        keyPoints: parsed.keyPoints,
        examples: parsed.examples,
        practiceQuestions,
        studyPlan: parsed.studyPlan,
        encouragement: parsed.encouragement
      };
    } catch (error) {
      console.error('Failed to parse remediation response:', error);
      throw error;
    }
  }

  /**
   * Fallback content if LLM fails
   */
  private getFallbackRemediation(
    competencyName: string,
    currentLevel: number
  ): RemediationContent {
    return {
      competencyName,
      currentLevel,
      explanation: `Let's review ${competencyName} together. This is a foundational concept that requires focused practice.`,
      keyPoints: [
        `Understanding the basics of ${competencyName}`,
        'Identifying key patterns and rules',
        'Applying concepts in different contexts',
        'Building confidence through practice'
      ],
      examples: [
        `Example 1: A basic application of ${competencyName}`,
        `Example 2: A more complex scenario using ${competencyName}`,
        `Example 3: Real-world application of ${competencyName}`
      ],
      practiceQuestions: [],
      studyPlan: [
        {
          step: 1,
          title: 'Review fundamentals',
          description: 'Go back to the basics and ensure strong foundation',
          estimatedMinutes: 15
        },
        {
          step: 2,
          title: 'Practice exercises',
          description: 'Complete targeted practice problems',
          estimatedMinutes: 20
        },
        {
          step: 3,
          title: 'Self-assessment',
          description: 'Test your understanding',
          estimatedMinutes: 10
        }
      ],
      encouragement: `You're currently at ${currentLevel}%, but with focused practice on ${competencyName}, you can definitely improve! Let's work on this together.`
    };
  }

  /**
   * Generate quick practice drill (3 questions)
   */
  async generateQuickDrill(
    competencyName: string,
    currentLevel: number,
    courseContext: string
  ): Promise<Question[]> {
    const prompt = `Generate 3 practice questions for "${competencyName}" at ${currentLevel}% difficulty level.
Context: ${courseContext}

Return ONLY JSON array:
[
  {
    "question": "Question text",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A",
    "explanation": "Why this is correct"
  }
]`;

    try {
      const response = await unifiedAPIRouter.chat(prompt, {
        model: 'accounts/fireworks/models/gpt-oss-120b',
        temperature: 0.7,
        maxTokens: 800
      });

      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);
      
      return parsed.map((q: any, idx: number) => ({
        id: `drill_${competencyName}_${idx}`,
        text: q.question,
        type: 'multiple-choice' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: currentLevel < 40 ? 'easy' : 'medium',
        category: competencyName
      }));
    } catch (error) {
      console.error('Failed to generate quick drill:', error);
      return [];
    }
  }
}

export const competencyRemediationService = new CompetencyRemediationService();

