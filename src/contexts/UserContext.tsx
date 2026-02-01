import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dataCollectionService } from '../services/DataCollectionService';
import { serviceContainer } from '../services/ServiceContainer';
import { memoryDatabaseBridge } from '../services/MemoryDatabaseBridge';
import { userIdService } from '../services/UserIdService';
import { conversationService } from '../services/ConversationService';

export interface NeuropsychologicalProfile {
  [conceptName: string]: {
    level: number; // 1-5 scale
    frequency: number; // How often this concept appears in gameplay
    lastUpdated: string;
    trend: 'improving' | 'stable' | 'declining';
    gameContributions: { // Which games contributed to this score
      [gameId: string]: {
        sessions: number;
        avgScore: number;
        lastPlayed: string;
      };
    };
  };
}

export interface AIAssessment {
  cognitiveProfile: NeuropsychologicalProfile;
  strengths: string[]; // Top performing neuropsychological concepts
  growthAreas: string[]; // Areas needing improvement
  recommendations: string[]; // AI-generated recommendations
  overallScore: number; // 1-100 overall cognitive performance
  lastUpdated: string;
  totalSessions: number;
  personalityInsights: {
    traits: string[];
    preferredLearningStyle: string;
    motivationalFactors: string[];
  };
  detailedAnalysis: string; // AI-generated detailed analysis
  learningModules?: {
    [moduleId: string]: {
      overallComprehension: number; // 0-100
      timeSpent: number; // minutes
      questionsAnswered: number;
      accuracyRate: number; // 0-100
      lastAccessed: Date;
      status: 'not_started' | 'in_progress' | 'completed';
      cognitiveProfile: {
        conceptGrasp: number; // 1-5 scale
        retentionLevel: number; // 0-100
        learningSpeed: 'fast' | 'moderate' | 'slow';
        preferredContentType: 'visual' | 'textual' | 'interactive';
      };
    };
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'learner' | 'parent' | 'admin';
  age?: number;
  
  // Authentication & Verification
  isVerified: boolean;
  verificationMethod?: 'email' | 'phone' | 'manual';
  verificationToken?: string;
  verifiedAt?: string;
  subscription?: {
    tier: 'free' | 'premium' | 'premium_plus' | 'unlimited';
    startDate: string;
    endDate?: string;
    status: 'active' | 'expired' | 'cancelled';
  };
  
  // Usage Tracking
  usage: {
    aiPrompts: {
      count: number;
      lastReset: string; // Reset daily/monthly based on subscription
      history: Array<{
        date: string;
        count: number;
      }>;
    };
    imageGeneration: {
      count: number;
      lastReset: string;
      history: Array<{
        date: string;
        count: number;
      }>;
    };
  };
  
  profile: {
    avatar: string;
    rank: string;
    xp: number;
    xpToNextLevel: number;
    stars: number;
    about: string;
    gameProgress: {
      [gameId: string]: {
        level: number;
        stars: number;
        bestScore: number;
        timesPlayed: number;
        playTime?: number;
      };
    };
    aiAssessment?: AIAssessment;
  };
  journeyLog: Array<{
    id: string;
    title: string;
    content: string;
    date: string;
    xpEarned: number;
  }>;
  hasPosted: boolean;
  friends: string[]; // Array of user IDs
  friendRequests: {
    sent: string[]; // Array of user IDs
    received: string[]; // Array of user IDs
  };
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  addXP: (amount: number) => void;
  addStars: (amount: number) => void;
  updateGameProgress: (gameId: string, progress: Partial<User['profile']['gameProgress'][string]>) => void;
  updateFriends: (friends: string[]) => void;
  updateFriendRequests: (friendRequests: { sent: string[]; received: string[] }) => void;
  
  // Usage Tracking & Limits
  canUseAI: () => { allowed: boolean; remaining: number; limit: number };
  canGenerateImage: () => { allowed: boolean; remaining: number; limit: number };
  recordAIUsage: () => void;
  recordImageGeneration: () => void;
  resetUsageCounts: () => void;
  
  // Verification Functions
  sendVerificationCode: (method: 'email' | 'phone') => Promise<{ success: boolean; message: string }>;
  verifyUser: (code: string) => Promise<{ success: boolean; message: string }>;
  
  // New standardized analytics function
  recordGameSession: (gameId: string, sessionData: {
    score: number;
    level?: number;
    starsEarned?: number;
    xpEarned?: number;
    playTime?: number;
    success?: boolean;
  }) => void;
  
  // AI Assessment functions
  updateAIAssessment: (gameId: string, neuropsychConcepts: string[], choiceData: any[]) => Promise<void>;
  generateAIReport: () => Promise<string>;
  getStrengthsAndGrowthAreas: () => { strengths: string[], growthAreas: string[] };
  
  // Learning Module functions
  updateLearningModuleProgress: (moduleId: string, progress: Partial<NonNullable<AIAssessment['learningModules']>[string]>) => void;
  getLearningModuleProgress: (moduleId: string) => NonNullable<AIAssessment['learningModules']>[string] | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize data collection service when user changes
  useEffect(() => {
    if (user?.id) {
      dataCollectionService.setUserId(user.id);
      console.log('🔗 Data collection service initialized for user:', user.id);
    }
  }, [user?.id]);

  // Initialize user from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('neuraplay_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error('Error loading user from localStorage:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const ranks = [
    { name: "New Learner", xpThreshold: 0, stars: 1 },
    { name: "Distinguished Learner", xpThreshold: 100, stars: 2 },
    { name: "Master Learner", xpThreshold: 300, stars: 3 },
    { name: "Superhero Learner", xpThreshold: 1000, stars: 4 }
  ];

  // Custom setUser that also saves to localStorage
  // 🚨 CRITICAL: Clears all caches to prevent cross-user data leakage
  const setUserWithPersistence = (newUser: User | null) => {
    const previousUserId = user?.id;
    const newUserId = newUser?.id;
    
    // 🚨 CLEAR ALL CACHES when user changes (prevents cross-user data leakage)
    if (previousUserId !== newUserId) {
      console.log('🔄 User changed - clearing all caches and conversations');
      memoryDatabaseBridge.clearAllCaches();
      userIdService.clearUser();
      // 🚨 CRITICAL: Clear conversations to prevent session bleed between users
      conversationService.clearAllConversations();
    }
    
    setUser(newUser);
    try {
      if (newUser) {
        localStorage.setItem('neuraplay_user', JSON.stringify(newUser));
        // Set the new user on conversation service
        conversationService.setCurrentUser(newUser.id);
      } else {
        localStorage.removeItem('neuraplay_user');
        // 🚨 Clear everything on logout
        memoryDatabaseBridge.clearAllCaches();
        userIdService.clearUser();
        conversationService.clearAllConversations();
      }
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
    }
  };

  const addXP = (amount: number) => {
    if (!user) return;
    
    const newXP = user.profile.xp + amount;
    const currentRankIndex = ranks.findIndex(r => r.name === user.profile.rank);
    const nextRank = ranks[currentRankIndex + 1];
    
    let updatedUser = { ...user };
    updatedUser.profile.xp = newXP;
    
    if (nextRank && newXP >= nextRank.xpThreshold) {
      updatedUser.profile.rank = nextRank.name;
      updatedUser.profile.xpToNextLevel = ranks[currentRankIndex + 2]?.xpThreshold || 2000;
    }
    
    setUserWithPersistence(updatedUser);
  };

  const addStars = (amount: number) => {
    if (!user) return;
    
    const updatedUser = { ...user };
    updatedUser.profile.stars += amount;
    setUserWithPersistence(updatedUser);
  };

  const updateGameProgress = (gameId: string, progress: Partial<User['profile']['gameProgress'][string]>) => {
    if (!user) return;
    
    const updatedUser = { ...user };
    if (!updatedUser.profile.gameProgress[gameId]) {
      updatedUser.profile.gameProgress[gameId] = {
        level: 1,
        stars: 0,
        bestScore: 0,
        timesPlayed: 0,
        playTime: 0
      };
    }
    
    updatedUser.profile.gameProgress[gameId] = {
      ...updatedUser.profile.gameProgress[gameId],
      ...progress
    };
    
    setUserWithPersistence(updatedUser);
  };

  // Standardized analytics function for consistent game session recording
  const recordGameSession = (gameId: string, sessionData: {
    score: number;
    level?: number;
    starsEarned?: number;
    xpEarned?: number;
    playTime?: number;
    success?: boolean;
  }) => {
    if (!user) return;
    
    const {
      score,
      level = 1,
      starsEarned = Math.floor(score / 50),
      xpEarned = score + (level * 5),
      playTime = 0,
      success = score > 0
    } = sessionData;
    
    // Award XP and stars
    addXP(xpEarned);
    addStars(starsEarned);
    
    // Update game progress
    const currentProgress = user.profile.gameProgress[gameId] || { 
      level: 1, 
      stars: 0, 
      bestScore: 0, 
      timesPlayed: 0, 
      playTime: 0 
    };
    
    updateGameProgress(gameId, {
      level: Math.max(currentProgress.level, level),
      stars: currentProgress.stars + starsEarned,
      bestScore: Math.max(currentProgress.bestScore, score),
      timesPlayed: currentProgress.timesPlayed + 1,
      playTime: (currentProgress.playTime || 0) + playTime
    });

    // 🗄️ DATABASE INTEGRATION: Log game session to database
    dataCollectionService.logGameSession(gameId, {
      score,
      level,
      starsEarned,
      xpEarned,
      playTime,
      success,
      moves: sessionData.moves || 0,
      errors: sessionData.errors || 0,
      completionRate: sessionData.completionRate || (success ? 1 : 0)
    }).catch(error => {
      console.error('Failed to log game session to database:', error);
    });
  };

  const updateFriends = (friends: string[]) => {
    if (!user) return;
    const updatedUser = { ...user, friends };
    setUserWithPersistence(updatedUser);
  };

  const updateFriendRequests = (friendRequests: { sent: string[]; received: string[] }) => {
    if (!user) return;
    const updatedUser = { ...user, friendRequests };
    setUserWithPersistence(updatedUser);
  };

  // The comprehensive 41 neuropsychological concepts
  const NEUROPSYCHOLOGICAL_CONCEPTS = [
    'Working Memory', 'Executive Function', 'Attention Control', 'Cognitive Flexibility',
    'Inhibitory Control', 'Planning', 'Problem Solving', 'Decision Making',
    'Emotional Regulation', 'Social Cognition', 'Theory of Mind', 'Metacognition',
    'Processing Speed', 'Visual Processing', 'Auditory Processing', 'Spatial Reasoning',
    'Verbal Memory', 'Visual Memory', 'Sequential Processing', 'Simultaneous Processing',
    'Fluid Reasoning', 'Crystallized Intelligence', 'Processing Efficiency', 'Cognitive Load',
    'Mental Set', 'Cognitive Bias', 'Heuristic Processing', 'Automatic Processing',
    'Controlled Processing', 'Divided Attention', 'Sustained Attention', 'Selective Attention',
    'Response Inhibition', 'Task Switching', 'Goal Setting', 'Self-Monitoring',
    'Error Detection', 'Feedback Processing', 'Adaptive Behavior', 'Cognitive Strategy',
    'Motor Skills'
  ];

  // Update AI Assessment based on game session data
  const updateAIAssessment = async (gameId: string, neuropsychConcepts: string[], choiceData: any[]) => {
    if (!user) return;

    const updatedUser = { ...user };
    
    // Initialize AI assessment if it doesn't exist
    if (!updatedUser.profile.aiAssessment) {
      updatedUser.profile.aiAssessment = {
        cognitiveProfile: {},
        strengths: [],
        growthAreas: [],
        recommendations: [],
        overallScore: 50,
        lastUpdated: new Date().toISOString(),
        totalSessions: 0,
        personalityInsights: {
          traits: [],
          preferredLearningStyle: 'adaptive',
          motivationalFactors: []
        },
        detailedAnalysis: ''
      };
    }

    const assessment = updatedUser.profile.aiAssessment;
    const now = new Date().toISOString();

    // Update total sessions
    assessment.totalSessions += 1;
    assessment.lastUpdated = now;

    // Process each neuropsychological concept from the session
    neuropsychConcepts.forEach((concept, index) => {
      if (!NEUROPSYCHOLOGICAL_CONCEPTS.includes(concept)) return;

      // Initialize concept if it doesn't exist
      if (!assessment.cognitiveProfile[concept]) {
        assessment.cognitiveProfile[concept] = {
          level: 3, // Start at middle
          frequency: 0,
          lastUpdated: now,
          trend: 'stable',
          gameContributions: {}
        };
      }

      const profile = assessment.cognitiveProfile[concept];
      
      // Update frequency
      profile.frequency += 1;
      profile.lastUpdated = now;

      // Initialize game contribution
      if (!profile.gameContributions[gameId]) {
        profile.gameContributions[gameId] = {
          sessions: 0,
          avgScore: 0,
          lastPlayed: now
        };
      }

      const gameContrib = profile.gameContributions[gameId];
      gameContrib.sessions += 1;
      gameContrib.lastPlayed = now;

      // Calculate performance score based on choice quality (simplified)
      const choiceScore = choiceData[index] ? 4 : 3; // Good choice = 4, average = 3
      gameContrib.avgScore = (gameContrib.avgScore * (gameContrib.sessions - 1) + choiceScore) / gameContrib.sessions;

      // Update concept level based on performance trend
      const previousLevel = profile.level;
      profile.level = Math.max(1, Math.min(5, 
        (profile.level * 0.8) + (gameContrib.avgScore * 0.2)
      ));

      // Determine trend
      if (profile.level > previousLevel + 0.1) profile.trend = 'improving';
      else if (profile.level < previousLevel - 0.1) profile.trend = 'declining';
      else profile.trend = 'stable';
    });

    // Calculate overall score
    const conceptLevels = Object.values(assessment.cognitiveProfile).map(p => p.level);
    assessment.overallScore = conceptLevels.length > 0 
      ? Math.round((conceptLevels.reduce((sum, level) => sum + level, 0) / conceptLevels.length) * 20)
      : 50;

    // Update strengths and growth areas
    const { strengths, growthAreas } = getStrengthsAndGrowthAreas();
    assessment.strengths = strengths;
    assessment.growthAreas = growthAreas;

    // Generate AI recommendations
    try {
      const recommendations = await generateRecommendations(assessment);
      assessment.recommendations = recommendations;
      
      const detailedAnalysis = await generateDetailedAnalysis(assessment);
      assessment.detailedAnalysis = detailedAnalysis;
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
    }

    setUserWithPersistence(updatedUser);
  };

  // Generate AI-powered recommendations
  const generateRecommendations = async (assessment: AIAssessment): Promise<string[]> => {
    try {
      const prompt = `Based on this cognitive assessment data:
      
Overall Score: ${assessment.overallScore}/100
Strengths: ${assessment.strengths.join(', ')}
Growth Areas: ${assessment.growthAreas.join(', ')}
Total Sessions: ${assessment.totalSessions}

Generate 3-5 specific, actionable recommendations for improving cognitive performance and learning. Focus on practical activities and strategies.`;

      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              { role: 'system', content: 'You are an expert educational psychologist providing personalized learning recommendations for children.' },
              { role: 'user', content: prompt }
            ]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.response || data.data || '';
        
        // Extract recommendations (simple parsing)
        const recommendations = aiResponse
          .split('\n')
          .filter((line: string) => line.trim().length > 0 && (line.includes('•') || line.includes('-') || line.includes('1.') || line.includes('2.')))
          .map((line: string) => line.replace(/^[-•\d.]\s*/, '').trim())
          .slice(0, 5);

        return recommendations.length > 0 ? recommendations : [
          'Continue playing diverse cognitive games to strengthen different skills',
          'Practice mindful attention exercises for improved focus',
          'Engage in creative storytelling to enhance imagination and language skills'
        ];
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }

    // Fallback recommendations
    return [
      'Continue playing diverse cognitive games to strengthen different skills',
      'Practice mindful attention exercises for improved focus',
      'Engage in creative storytelling to enhance imagination and language skills'
    ];
  };

  // Generate detailed AI analysis
  const generateDetailedAnalysis = async (assessment: AIAssessment): Promise<string> => {
    try {
      const conceptSummary = Object.entries(assessment.cognitiveProfile)
        .map(([concept, data]) => `${concept}: Level ${data.level.toFixed(1)} (${data.trend})`)
        .join(', ');

      const prompt = `Create a comprehensive cognitive assessment report for a young learner:

Cognitive Profile: ${conceptSummary}
Overall Performance: ${assessment.overallScore}/100
Total Learning Sessions: ${assessment.totalSessions}
Key Strengths: ${assessment.strengths.join(', ')}
Growth Areas: ${assessment.growthAreas.join(', ')}

Write a detailed, encouraging analysis (2-3 paragraphs) that explains their cognitive development patterns, celebrates their strengths, and provides insight into their learning journey. Use positive, child-friendly language while being informative for parents.`;

      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              { role: 'system', content: 'You are an expert child psychologist writing encouraging, insightful assessment reports for parents and educators.' },
              { role: 'user', content: prompt }
            ]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || data.data || 'Your learning journey shows great progress across multiple cognitive areas. Keep exploring and growing!';
      }
    } catch (error) {
      console.error('Error generating detailed analysis:', error);
    }

    return 'Your learning journey shows great progress across multiple cognitive areas. Keep exploring and growing!';
  };

  // Generate comprehensive AI report
  const generateAIReport = async (): Promise<string> => {
    if (!user?.profile.aiAssessment) return 'No assessment data available yet. Play some games to generate your cognitive profile!';
    
    const assessment = user.profile.aiAssessment;
    
    try {
      const conceptDetails = Object.entries(assessment.cognitiveProfile)
        .sort(([,a], [,b]) => b.level - a.level)
        .slice(0, 10)
        .map(([concept, data]) => `${concept}: ${data.level.toFixed(1)}/5.0 (${data.frequency} sessions, ${data.trend})`)
        .join('\n');

      const prompt = `Generate a comprehensive cognitive assessment report:

LEARNER PROFILE:
${user.username}, Age: ${user.age || 'Not specified'}
Total XP: ${user.profile.xp}
Games Played: ${Object.keys(user.profile.gameProgress).length}
Assessment Sessions: ${assessment.totalSessions}

COGNITIVE PERFORMANCE:
Overall Score: ${assessment.overallScore}/100
${conceptDetails}

STRENGTHS: ${assessment.strengths.join(', ')}
GROWTH AREAS: ${assessment.growthAreas.join(', ')}

Create a detailed psychological report (4-5 paragraphs) that:
1. Summarizes cognitive strengths and development patterns
2. Identifies learning preferences and motivational factors  
3. Provides educational recommendations for parents/teachers
4. Celebrates progress and encourages continued growth
5. Includes specific next steps for cognitive development

Use professional but accessible language suitable for parents and educators.`;

      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: {
            messages: [
              { role: 'system', content: 'You are a licensed educational psychologist creating comprehensive cognitive assessment reports for children.' },
              { role: 'user', content: prompt }
            ]
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.response || data.data || assessment.detailedAnalysis || 'Assessment report generation is temporarily unavailable.';
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
    }

    return assessment.detailedAnalysis || 'Your cognitive assessment shows positive development across multiple areas. Continue your learning journey!';
  };

  // Get current strengths and growth areas
  const getStrengthsAndGrowthAreas = (): { strengths: string[], growthAreas: string[] } => {
    if (!user?.profile.aiAssessment?.cognitiveProfile) {
      return { strengths: [], growthAreas: [] };
    }

    const concepts = Object.entries(user.profile.aiAssessment.cognitiveProfile);
    const sorted = concepts.sort(([,a], [,b]) => b.level - a.level);
    
    const strengths = sorted.slice(0, 3).map(([concept]) => concept);
    const growthAreas = sorted.slice(-3).map(([concept]) => concept);
    
    return { strengths, growthAreas };
  };

  // Usage Tracking Functions
  const getUsageLimits = () => {
    if (!user) return { aiLimit: 0, imageLimit: 0 };
    
    // Admin users always get unlimited access
    if (user.role === 'admin') {
      return { aiLimit: -1, imageLimit: -1 }; // Unlimited for admin
    }
    
    // Unlimited tier gets unlimited access
    if (user.subscription?.tier === 'unlimited') {
      return { aiLimit: -1, imageLimit: -1 }; // Unlimited tier
    }
    
    // Premium Plus verified users get unlimited access
    if (user.isVerified && user.subscription?.tier === 'premium_plus') {
      return { aiLimit: -1, imageLimit: -1 }; // Unlimited
    } else if (user.isVerified && user.subscription?.tier === 'premium') {
      return { aiLimit: 100, imageLimit: 20 }; // Premium limits
    } else {
      return { aiLimit: 20, imageLimit: 2 }; // Free/unverified limits
    }
  };

  const isUsageExpired = (lastReset: string): boolean => {
    const lastResetDate = new Date(lastReset);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 24; // Reset daily
  };

  const canUseAI = () => {
    if (!user) return { allowed: false, remaining: 0, limit: 0 };
    
    // Admin user bypass - smt@neuraplay.biz gets unlimited access
    if (user.email === 'smt@neuraplay.biz') {
      console.log('👑 Admin user detected, bypassing chat limits');
      return { allowed: true, remaining: -1, limit: -1 }; // Unlimited for admin
    }
    
    // Initialize usage if missing (safety check)
    if (!user.usage || !user.usage.aiPrompts) {
      console.log('🔧 User missing usage object, initializing...');
      const updatedUser = {
        ...user,
        usage: {
          aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
          imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
        }
      };
      setUserWithPersistence(updatedUser);
      // Sync with database
      syncUserDataToDatabase(updatedUser);
      return { allowed: true, remaining: 19, limit: 20 }; // Allow with default limits
    }
    
    const { aiLimit } = getUsageLimits();
    if (aiLimit === -1) return { allowed: true, remaining: -1, limit: -1 }; // Unlimited
    
    // Reset usage if expired (now safe to access)
    if (isUsageExpired(user.usage.aiPrompts.lastReset)) {
      resetUsageCounts();
      return { allowed: true, remaining: aiLimit - 1, limit: aiLimit };
    }
    
    const remaining = aiLimit - user.usage.aiPrompts.count;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: aiLimit
    };
  };

  const canGenerateImage = () => {
    if (!user) return { allowed: false, remaining: 0, limit: 0 };
    
    // Admin user bypass - smt@neuraplay.biz gets unlimited access
    if (user.email === 'smt@neuraplay.biz') {
      console.log('👑 Admin user detected, bypassing image generation limits');
      return { allowed: true, remaining: -1, limit: -1 }; // Unlimited for admin
    }
    
    // Initialize usage if missing (safety check)
    if (!user.usage || !user.usage.imageGeneration) {
      console.log('🔧 User missing usage object for image gen, initializing...');
      const updatedUser = {
        ...user,
        usage: {
          aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
          imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
        }
      };
      setUserWithPersistence(updatedUser);
      return { allowed: true, remaining: 1, limit: 2 }; // Allow with default limits
    }
    
    const { imageLimit } = getUsageLimits();
    if (imageLimit === -1) return { allowed: true, remaining: -1, limit: -1 }; // Unlimited
    
    // Reset usage if expired (now safe to access)
    if (isUsageExpired(user.usage.imageGeneration.lastReset)) {
      resetUsageCounts();
      return { allowed: true, remaining: imageLimit - 1, limit: imageLimit };
    }
    
    const remaining = imageLimit - user.usage.imageGeneration.count;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: imageLimit
    };
  };

  const recordAIUsage = () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const updatedUser: any = { ...user };
    // Ensure usage objects exist
    if (!updatedUser.usage) {
      updatedUser.usage = {
        aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
        imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
      };
    } else if (!updatedUser.usage.aiPrompts) {
      updatedUser.usage.aiPrompts = { count: 0, lastReset: new Date().toISOString(), history: [] };
    }
    
    // Reset if needed
    if (isUsageExpired(updatedUser.usage.aiPrompts.lastReset)) {
      updatedUser.usage.aiPrompts.count = 1;
      updatedUser.usage.aiPrompts.lastReset = new Date().toISOString();
    } else {
      updatedUser.usage.aiPrompts.count += 1;
    }
    
    // Update history
    const todayEntry = updatedUser.usage.aiPrompts.history.find((h: any) => h.date === today);
    if (todayEntry) {
      todayEntry.count += 1;
    } else {
      updatedUser.usage.aiPrompts.history.push({ date: today, count: 1 });
    }
    
    // Keep only last 30 days of history
    updatedUser.usage.aiPrompts.history = updatedUser.usage.aiPrompts.history
      .slice(-30);
    
    setUserWithPersistence(updatedUser);
  };

  const recordImageGeneration = () => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const updatedUser: any = { ...user };
    // Ensure usage objects exist
    if (!updatedUser.usage) {
      updatedUser.usage = {
        aiPrompts: { count: 0, lastReset: new Date().toISOString(), history: [] },
        imageGeneration: { count: 0, lastReset: new Date().toISOString(), history: [] }
      };
    } else if (!updatedUser.usage.imageGeneration) {
      updatedUser.usage.imageGeneration = { count: 0, lastReset: new Date().toISOString(), history: [] };
    }
    
    // Reset if needed
    if (isUsageExpired(updatedUser.usage.imageGeneration.lastReset)) {
      updatedUser.usage.imageGeneration.count = 1;
      updatedUser.usage.imageGeneration.lastReset = new Date().toISOString();
    } else {
      updatedUser.usage.imageGeneration.count += 1;
    }
    
    // Update history
    const todayEntry = updatedUser.usage.imageGeneration.history.find((h: any) => h.date === today);
    if (todayEntry) {
      todayEntry.count += 1;
    } else {
      updatedUser.usage.imageGeneration.history.push({ date: today, count: 1 });
    }
    
    // Keep only last 30 days of history
    updatedUser.usage.imageGeneration.history = updatedUser.usage.imageGeneration.history
      .slice(-30);
    
    setUserWithPersistence(updatedUser);
  };

  const resetUsageCounts = () => {
    if (!user) return;
    
    const now = new Date().toISOString();
    const updatedUser: any = { ...user };
    if (!updatedUser.usage) {
      updatedUser.usage = {
        aiPrompts: { count: 0, lastReset: now, history: [] },
        imageGeneration: { count: 0, lastReset: now, history: [] }
      };
    } else {
      if (!updatedUser.usage.aiPrompts) {
        updatedUser.usage.aiPrompts = { count: 0, lastReset: now, history: [] };
      } else {
        updatedUser.usage.aiPrompts.count = 0;
        updatedUser.usage.aiPrompts.lastReset = now;
      }
      if (!updatedUser.usage.imageGeneration) {
        updatedUser.usage.imageGeneration = { count: 0, lastReset: now, history: [] };
      } else {
        updatedUser.usage.imageGeneration.count = 0;
        updatedUser.usage.imageGeneration.lastReset = now;
      }
    }
    
    setUserWithPersistence(updatedUser);
  };

  // Database sync function for user data
  const syncUserDataToDatabase = async (userData: User) => {
    try {
      console.log('🔄 Syncing user data to database:', userData.id);
      
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.id,
          userData: {
            id: userData.id,
            username: userData.username,
            email: userData.email,
            role: userData.role,
            age: userData.age,
            isVerified: userData.isVerified,
            subscription: userData.subscription,
            usage: userData.usage,
            profile: userData.profile,
            journeyLog: userData.journeyLog,
            hasPosted: userData.hasPosted,
            friends: userData.friends,
            friendRequests: userData.friendRequests
          }
        })
      });

      if (response.ok) {
        console.log('✅ User data synced to database successfully');
      } else {
        console.warn('⚠️ User data sync response not ok:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to sync user data to database:', error);
    }
  };

  // Verification Functions
  const sendVerificationCode = async (method: 'email' | 'phone'): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'No user found' };
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          method
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Store verification token locally (temporary)
        const updatedUser = { ...user };
        updatedUser.verificationToken = result.token;
        updatedUser.verificationMethod = method;
        setUserWithPersistence(updatedUser);
        
        return { success: true, message: `Verification code sent to your ${method}` };
      } else {
        return { success: false, message: result.message || 'Failed to send verification code' };
      }
    } catch (error) {
      console.error('Verification send error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  const verifyUser = async (code: string): Promise<{ success: boolean; message: string }> => {
    if (!user) return { success: false, message: 'No user found' };
    
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          token: user.verificationToken,
          code
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Mark user as verified
        const updatedUser = { ...user };
        updatedUser.isVerified = true;
        updatedUser.verifiedAt = new Date().toISOString();
        updatedUser.verificationToken = undefined;
        
        // Give them a free premium trial for 7 days
        updatedUser.subscription = {
          tier: 'premium',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active'
        };
        
        setUserWithPersistence(updatedUser);
        
        return { success: true, message: 'Email verified! You now have premium access for 7 days.' };
      } else {
        return { success: false, message: result.message || 'Invalid verification code' };
      }
    } catch (error) {
      console.error('Verification error:', error);
      return { success: false, message: 'Network error. Please try again.' };
    }
  };

  // Learning Module Progress Functions
  const updateLearningModuleProgress = (moduleId: string, progress: Partial<NonNullable<AIAssessment['learningModules']>[string]>) => {
    if (!user) return;
    
    const currentProgress = user.profile.aiAssessment?.learningModules?.[moduleId];
    
    const updatedUser = {
      ...user,
      profile: {
        ...user.profile,
        aiAssessment: {
          ...user.profile.aiAssessment,
          learningModules: {
            ...(user.profile.aiAssessment?.learningModules || {}),
            [moduleId]: {
              ...currentProgress,
              ...progress,
              lastAccessed: new Date()
            } as NonNullable<AIAssessment['learningModules']>[string]
          }
        } as AIAssessment
      }
    };
    
    setUserWithPersistence(updatedUser);
    console.log('✅ Updated learning module progress:', moduleId);
  };

  const getLearningModuleProgress = (moduleId: string): NonNullable<AIAssessment['learningModules']>[string] | null => {
    if (!user || !user.profile.aiAssessment?.learningModules) return null;
    return user.profile.aiAssessment.learningModules[moduleId] || null;
  };

  if (loading) {
    return <div>Loading user data...</div>;
  }

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser: setUserWithPersistence, 
      addXP, 
      addStars, 
      updateGameProgress, 
      updateFriends, 
      updateFriendRequests,
      recordGameSession,
      updateAIAssessment,
      generateAIReport,
      getStrengthsAndGrowthAreas,
      updateLearningModuleProgress,
      getLearningModuleProgress,
      // Usage tracking functions
      canUseAI,
      canGenerateImage,
      recordAIUsage,
      recordImageGeneration,
      resetUsageCounts,
      // Verification functions
      sendVerificationCode,
      verifyUser
    }}>
      {children}
    </UserContext.Provider>
  );
};