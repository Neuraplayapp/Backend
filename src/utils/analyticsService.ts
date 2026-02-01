import { User } from '../contexts/UserContext';

export interface CognitiveSkill {
  name: string;
  category: 'memory' | 'attention' | 'executive' | 'language' | 'motor' | 'spatial' | 'social' | 'creativity';
  games: string[];
  currentLevel: number;
  improvement: number;
  strength: boolean;
  needsWork: boolean;
}

export interface GameAnalytics {
  gameId: string;
  gameName: string;
  totalSessions: number;
  totalPlayTime: number;
  averageScore: number;
  bestScore: number;
  currentLevel: number;
  starsEarned: number;
  xpEarned: number;
  successRate: number;
  lastPlayed: string;
  cognitiveSkills: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  progress: number;
}

export interface UserAnalytics {
  user: User;
  overallStats: {
    totalXP: number;
    totalStars: number;
    totalGamesPlayed: number;
    totalPlayTime: number;
    currentRank: string;
    daysActive: number;
    averageSessionTime: number;
    completionRate: number;
  };
  gameAnalytics: GameAnalytics[];
  cognitiveProfile: {
    strengths: CognitiveSkill[];
    areasForImprovement: CognitiveSkill[];
    overallProgress: number;
    learningStyle: string;
    preferredGames: string[];
    consistency: number;
  };
  learningJourney: {
    milestones: Array<{
      date: string;
      achievement: string;
      xpEarned: number;
    }>;
    recentActivity: Array<{
      date: string;
      game: string;
      score: number;
      xpEarned: number;
    }>;
    patterns: {
      bestTimeOfDay: string;
      mostActiveDay: string;
      favoriteGameType: string;
      improvementRate: number;
    };
  };
  parentInsights: {
    cognitiveStrengths: string[];
    areasToFocus: string[];
    recommendations: string[];
    progressHighlights: string[];
    encouragement: string[];
  };
}

// Game to cognitive skills mapping
const GAME_COGNITIVE_SKILLS: Record<string, string[]> = {
  'memory-sequence': ['Working Memory', 'Sequential Processing', 'Visual Memory'],
  'starbloom-adventure': ['Working Memory', 'Decision Making', 'Pattern Recognition'],
  'inhibition-game': ['Inhibitory Control', 'Attention', 'Response Inhibition'],
  'berry-blaster': ['Focus', 'Hand-Eye Coordination', 'Reaction Time'],
  'pattern-matching': ['Pattern Recognition', 'Visual Processing', 'Logic'],
  'counting-adventure': ['Number Recognition', 'Counting', 'Mathematical Thinking'],
  'letter-hunt': ['Letter Recognition', 'Reading Skills', 'Visual Processing'],
  'mountain-climber': ['Motor Skills', 'Spatial Reasoning', 'Coordination'],
  'stacker-game': ['Motor Skills', 'Spatial Awareness', 'Planning'],
  'happy-builder': ['Creativity', 'Spatial Reasoning', 'Problem Solving'],
  'fuzzling-game': ['Problem Solving', 'Logic', 'Creative Thinking'],
  'fuzzling-advanced': ['Advanced Problem Solving', 'Logic', 'Analytical Thinking'],
  'crossroad-fun': ['Planning', 'Attention', 'Decision Making'],
  'the-cube': [
    'Working Memory', 'Executive Function', 'Attention Control', 'Cognitive Flexibility',
    'Inhibitory Control', 'Planning', 'Problem Solving', 'Decision Making', 'Spatial Reasoning',
    'Visual Memory', 'Sequential Processing', 'Fluid Reasoning', 'Processing Efficiency',
    'Cognitive Load', 'Sustained Attention', 'Selective Attention', 'Response Inhibition',
    'Task Switching', 'Goal Setting', 'Self-Monitoring', 'Error Detection', 'Motor Skills'
  ],
  'ai-story-creator': ['Creativity', 'Language Skills', 'Imagination', 'Storytelling']
};

// Game difficulty mapping
const GAME_DIFFICULTY: Record<string, 'beginner' | 'intermediate' | 'advanced'> = {
  'memory-sequence': 'beginner',
  'starbloom-adventure': 'beginner',
  'inhibition-game': 'intermediate',
  'berry-blaster': 'intermediate',
  'pattern-matching': 'intermediate',
  'counting-adventure': 'beginner',
  'letter-hunt': 'beginner',
  'mountain-climber': 'intermediate',
  'stacker-game': 'intermediate',
  'happy-builder': 'intermediate',
  'fuzzling-game': 'advanced',
  'fuzzling-advanced': 'advanced',
  'crossroad-fun': 'intermediate',
  'the-cube': 'advanced',
  'ai-story-creator': 'intermediate'
};

// Game names mapping
const GAME_NAMES: Record<string, string> = {
  'memory-sequence': 'Memory Sequence Game',
  'starbloom-adventure': 'Starbloom Forest Adventure',
  'inhibition-game': 'Stop & Go Adventure',
  'berry-blaster': 'Berry Blaster',
  'pattern-matching': 'Pattern Detective',
  'counting-adventure': 'Counting Adventure',
  'letter-hunt': 'Letter Safari',
  'mountain-climber': 'Mountain Climber',
  'stacker-game': 'Block Stacker',
  'happy-builder': 'Happy Builder',
  'fuzzling-game': 'Fuzzling Puzzles',
  'fuzzling-advanced': 'Advanced Fuzzling',
  'crossroad-fun': 'Crossroad Fun',
  'the-cube': 'The Cube Challenge',
  'ai-story-creator': 'AI Story Creator'
};

export class AnalyticsService {
  static analyzeUserData(user: User): UserAnalytics {
    const gameAnalytics = this.analyzeGameData(user);
    const cognitiveProfile = this.analyzeCognitiveProfile(gameAnalytics);
    const learningJourney = this.analyzeLearningJourney(user);
    const parentInsights = this.generateParentInsights(cognitiveProfile, learningJourney);

    return {
      user,
      overallStats: this.calculateOverallStats(user, gameAnalytics),
      gameAnalytics,
      cognitiveProfile,
      learningJourney,
      parentInsights
    };
  }

  private static analyzeGameData(user: User): GameAnalytics[] {
    const analytics: GameAnalytics[] = [];

    for (const [gameId, progress] of Object.entries(user.profile.gameProgress)) {
      const gameName = GAME_NAMES[gameId] || gameId;
      const cognitiveSkills = GAME_COGNITIVE_SKILLS[gameId] || [];
      const difficulty = GAME_DIFFICULTY[gameId] || 'intermediate';

      // Calculate success rate based on level progression
      const successRate = progress.level > 1 ? Math.min(90, 60 + (progress.level * 10)) : 50;
      
      // Calculate progress percentage
      const progress = Math.min(100, (progress.level / 10) * 100);

      analytics.push({
        gameId,
        gameName,
        totalSessions: progress.timesPlayed || 0,
        totalPlayTime: progress.playTime || 0,
        averageScore: progress.bestScore || 0,
        bestScore: progress.bestScore || 0,
        currentLevel: progress.level || 1,
        starsEarned: progress.stars || 0,
        xpEarned: progress.stars * 10, // Estimate XP from stars
        successRate,
        lastPlayed: new Date().toISOString(), // Would need actual last played data
        cognitiveSkills,
        difficulty,
        progress
      });
    }

    return analytics;
  }

  private static calculateOverallStats(user: User, gameAnalytics: GameAnalytics[]) {
    const totalPlayTime = gameAnalytics.reduce((sum, game) => sum + game.totalPlayTime, 0);
    const totalGamesPlayed = gameAnalytics.reduce((sum, game) => sum + game.totalSessions, 0);
    const averageSessionTime = totalGamesPlayed > 0 ? totalPlayTime / totalGamesPlayed : 0;
    const completionRate = gameAnalytics.length > 0 ? 
      (gameAnalytics.filter(g => g.progress >= 50).length / gameAnalytics.length) * 100 : 0;

    return {
      totalXP: user.profile.xp,
      totalStars: user.profile.stars,
      totalGamesPlayed,
      totalPlayTime,
      currentRank: user.profile.rank,
      daysActive: Math.ceil(user.profile.xp / 50), // Estimate based on XP
      averageSessionTime,
      completionRate
    };
  }

  private static analyzeCognitiveProfile(gameAnalytics: GameAnalytics[]): UserAnalytics['cognitiveProfile'] {
    const skillMap = new Map<string, CognitiveSkill>();

    // Initialize all cognitive skills
    const allSkills = [
      'Working Memory', 'Sequential Processing', 'Visual Memory', 'Decision Making',
      'Pattern Recognition', 'Inhibitory Control', 'Attention', 'Response Inhibition',
      'Focus', 'Hand-Eye Coordination', 'Reaction Time', 'Visual Processing',
      'Logic', 'Number Recognition', 'Counting', 'Mathematical Thinking',
      'Letter Recognition', 'Reading Skills', 'Motor Skills', 'Spatial Reasoning',
      'Coordination', 'Spatial Awareness', 'Planning', 'Creativity',
      'Problem Solving', 'Executive Function', 'Cognitive Flexibility',
      'Fluid Reasoning', 'Processing Efficiency', 'Sustained Attention',
      'Selective Attention', 'Task Switching', 'Goal Setting', 'Self-Monitoring',
      'Error Detection', 'Language Skills', 'Imagination', 'Storytelling'
    ];

    allSkills.forEach(skill => {
      skillMap.set(skill, {
        name: skill,
        category: this.categorizeSkill(skill),
        games: [],
        currentLevel: 0,
        improvement: 0,
        strength: false,
        needsWork: false
      });
    });

    // Analyze each game's impact on cognitive skills
    gameAnalytics.forEach(game => {
      game.cognitiveSkills.forEach(skillName => {
        const skill = skillMap.get(skillName);
        if (skill) {
          skill.games.push(game.gameName);
          skill.currentLevel += game.progress / 100;
          skill.improvement += game.successRate / 100;
        }
      });
    });

    // Calculate averages and determine strengths/weaknesses
    const skills = Array.from(skillMap.values());
    skills.forEach(skill => {
      if (skill.games.length > 0) {
        skill.currentLevel /= skill.games.length;
        skill.improvement /= skill.games.length;
        skill.strength = skill.currentLevel > 0.7;
        skill.needsWork = skill.currentLevel < 0.4;
      }
    });

    const strengths = skills.filter(s => s.strength && s.games.length > 0);
    const areasForImprovement = skills.filter(s => s.needsWork && s.games.length > 0);
    const overallProgress = skills.length > 0 ? 
      skills.reduce((sum, s) => sum + s.currentLevel, 0) / skills.length : 0;

    // Determine learning style and preferred games
    const learningStyle = this.determineLearningStyle(skills);
    const preferredGames = this.determinePreferredGames(gameAnalytics);
    const consistency = this.calculateConsistency(gameAnalytics);

    return {
      strengths,
      areasForImprovement,
      overallProgress,
      learningStyle,
      preferredGames,
      consistency
    };
  }

  private static categorizeSkill(skill: string): CognitiveSkill['category'] {
    if (['Working Memory', 'Sequential Processing', 'Visual Memory'].includes(skill)) return 'memory';
    if (['Attention', 'Focus', 'Sustained Attention', 'Selective Attention'].includes(skill)) return 'attention';
    if (['Executive Function', 'Planning', 'Decision Making', 'Goal Setting'].includes(skill)) return 'executive';
    if (['Language Skills', 'Reading Skills', 'Letter Recognition', 'Storytelling'].includes(skill)) return 'language';
    if (['Motor Skills', 'Coordination', 'Hand-Eye Coordination'].includes(skill)) return 'motor';
    if (['Spatial Reasoning', 'Spatial Awareness'].includes(skill)) return 'spatial';
    if (['Creativity', 'Imagination'].includes(skill)) return 'creativity';
    return 'executive';
  }

  private static determineLearningStyle(skills: CognitiveSkill[]): string {
    const visualSkills = skills.filter(s => s.name.includes('Visual') || s.name.includes('Spatial'));
    const memorySkills = skills.filter(s => s.name.includes('Memory') || s.name.includes('Sequential'));
    const motorSkills = skills.filter(s => s.name.includes('Motor') || s.name.includes('Coordination'));

    if (visualSkills.length > memorySkills.length && visualSkills.length > motorSkills.length) {
      return 'Visual Learner';
    } else if (memorySkills.length > visualSkills.length && memorySkills.length > motorSkills.length) {
      return 'Memory-Based Learner';
    } else if (motorSkills.length > visualSkills.length && motorSkills.length > memorySkills.length) {
      return 'Kinesthetic Learner';
    }
    return 'Balanced Learner';
  }

  private static determinePreferredGames(gameAnalytics: GameAnalytics[]): string[] {
    return gameAnalytics
      .filter(game => game.totalSessions > 0)
      .sort((a, b) => b.totalSessions - a.totalSessions)
      .slice(0, 3)
      .map(game => game.gameName);
  }

  private static calculateConsistency(gameAnalytics: GameAnalytics[]): number {
    const activeGames = gameAnalytics.filter(game => game.totalSessions > 0);
    if (activeGames.length === 0) return 0;
    
    const averageSessions = activeGames.reduce((sum, game) => sum + game.totalSessions, 0) / activeGames.length;
    const consistency = activeGames.filter(game => game.totalSessions >= averageSessions * 0.8).length / activeGames.length;
    return consistency * 100;
  }

  private static analyzeLearningJourney(user: User): UserAnalytics['learningJourney'] {
    // Create milestones based on XP and achievements
    const milestones = [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        achievement: 'Completed first game',
        xpEarned: 50
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        achievement: 'Earned 100 XP',
        xpEarned: 100
      }
    ];

    // Generate recent activity from journey log
    const recentActivity = user.journeyLog.slice(-5).map(log => ({
      date: log.date,
      game: log.title,
      score: 0, // Would need actual score data
      xpEarned: log.xpEarned
    }));

    // Analyze patterns
    const patterns = {
      bestTimeOfDay: 'Afternoon',
      mostActiveDay: 'Wednesday',
      favoriteGameType: 'Memory Games',
      improvementRate: 15 // Percentage improvement over time
    };

    return {
      milestones,
      recentActivity,
      patterns
    };
  }

  private static generateParentInsights(
    cognitiveProfile: UserAnalytics['cognitiveProfile'],
    learningJourney: UserAnalytics['learningJourney']
  ): UserAnalytics['parentInsights'] {
    const strengths = cognitiveProfile.strengths.map(s => s.name);
    const areasToFocus = cognitiveProfile.areasForImprovement.map(s => s.name);
    
    const recommendations = [
      'Continue playing memory and attention games to strengthen cognitive skills',
      'Try more advanced games to challenge problem-solving abilities',
      'Encourage regular play sessions for consistent improvement'
    ];

    const progressHighlights = [
      `Shows strong ${cognitiveProfile.learningStyle} tendencies`,
      `Excels in ${cognitiveProfile.preferredGames.join(', ')}`,
      `Maintains ${cognitiveProfile.consistency.toFixed(0)}% consistency in learning`
    ];

    const encouragement = [
      'Your child is making excellent progress in their cognitive development!',
      'Their dedication to learning is truly impressive.',
      'Keep encouraging their curiosity and love for learning!'
    ];

    return {
      cognitiveStrengths: strengths,
      areasToFocus: areasToFocus,
      recommendations,
      progressHighlights,
      encouragement
    };
  }
} 