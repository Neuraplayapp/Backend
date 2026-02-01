import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useUser } from './UserContext';

interface AIAgentContextType {
  isVisible: boolean;
  showAgent: (context?: AIAgentContext) => void;
  hideAgent: () => void;
  currentContext: AIAgentContext | null;
  triggerAgent: (triggerType: 'manual' | 'auto' | 'achievement' | 'struggle' | 'milestone', context?: AIAgentContext) => void;
  updateContext: (context: Partial<AIAgentContext>) => void;
}

interface AIAgentContext {
  gameId?: string;
  gameState?: any;
  playerActions?: any[];
  currentProgress?: number;
  sessionData?: any;
  moveHistory?: any[];
  cognitiveMetrics?: any;
  lastAction?: string;
  timeSpent?: number;
  difficulty?: string;
  achievements?: string[];
  struggles?: string[];
}

const AIAgentContext = createContext<AIAgentContextType | undefined>(undefined);

export const useAIAgent = () => {
  const context = useContext(AIAgentContext);
  if (!context) {
    throw new Error('useAIAgent must be used within an AIAgentProvider');
  }
  return context;
};

export const AIAgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);
  const [currentContext, setCurrentContext] = useState<AIAgentContext | null>(null);
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(true);

  // Game-specific trigger conditions
  const gameTriggerConditions = {
    'the-cube': {
      achievement: (context: AIAgentContext) => {
        return context.currentProgress && context.currentProgress > 80;
      },
      struggle: (context: AIAgentContext) => {
        // Trigger when player makes many moves but has low progress
        return context.moveHistory && context.moveHistory.length > 15 && context.currentProgress && context.currentProgress < 25;
      },
      milestone: (context: AIAgentContext) => {
        // Trigger at key progress milestones
        return context.currentProgress && (context.currentProgress === 25 || context.currentProgress === 50 || context.currentProgress === 75);
      },
      auto: (context: AIAgentContext) => {
        // Auto-trigger every 3 minutes of active play for engagement
        return context.timeSpent && context.timeSpent > 180000; // 3 minutes
      },
      // New: Trigger when player is stuck on same move pattern
      stuck: (context: AIAgentContext) => {
        if (!context.moveHistory || context.moveHistory.length < 10) return false;
        const recentMoves = context.moveHistory.slice(-10);
        const uniqueMoves = new Set(recentMoves.map(move => move.move));
        // If player is repeating same moves, they might be stuck
        return uniqueMoves.size < 4 && context.currentProgress && context.currentProgress < 40;
      },
      // New: Trigger when player makes rapid moves (might be frustrated)
      rapid: (context: AIAgentContext) => {
        if (!context.moveHistory || context.moveHistory.length < 5) return false;
        const recentMoves = context.moveHistory.slice(-5);
        const timeSpan = recentMoves[recentMoves.length - 1].timestamp - recentMoves[0].timestamp;
        // If moves are happening very quickly (less than 2 seconds for 5 moves)
        return timeSpan < 2000 && context.currentProgress && context.currentProgress < 50;
      }
    }
  };

  const showAgent = useCallback((context?: AIAgentContext) => {
    setCurrentContext(context || null);
    setIsVisible(true);
  }, []);

  const hideAgent = useCallback(() => {
    setIsVisible(false);
    setCurrentContext(null);
  }, []);

  const triggerAgent = useCallback((triggerType: 'manual' | 'auto' | 'achievement' | 'struggle' | 'milestone' | 'stuck' | 'rapid', context?: AIAgentContext) => {
    if (!autoTriggerEnabled && triggerType !== 'manual') return;

    const gameId = context?.gameId;
    if (!gameId) return;

    const conditions = gameTriggerConditions[gameId as keyof typeof gameTriggerConditions];
    if (!conditions) return;

    let shouldTrigger = false;

    switch (triggerType) {
      case 'achievement':
        shouldTrigger = conditions.achievement?.(context || {}) || false;
        break;
      case 'struggle':
        shouldTrigger = conditions.struggle?.(context || {}) || false;
        break;
      case 'milestone':
        shouldTrigger = conditions.milestone?.(context || {}) || false;
        break;
      case 'stuck':
        shouldTrigger = conditions.stuck?.(context || {}) || false;
        break;
      case 'rapid':
        shouldTrigger = conditions.rapid?.(context || {}) || false;
        break;
      case 'auto':
        shouldTrigger = conditions.auto?.(context || {}) || false;
        break;
      case 'manual':
        shouldTrigger = true;
        break;
    }

    if (shouldTrigger) {
      showAgent(context);
    }
  }, [autoTriggerEnabled, showAgent]);

  const updateContext = useCallback((newContext: Partial<AIAgentContext>) => {
    setCurrentContext(prev => ({
      ...prev,
      ...newContext
    } as AIAgentContext));
  }, []);

  // Auto-trigger based on game events
  useEffect(() => {
    if (!currentContext?.gameId || !autoTriggerEnabled) return;

    const gameId = currentContext.gameId;
    const conditions = gameTriggerConditions[gameId as keyof typeof gameTriggerConditions];
    
    if (!conditions) return;

    // Check for achievements
    if (conditions.achievement?.(currentContext)) {
      triggerAgent('achievement', currentContext);
    }
    
    // Check for struggles
    if (conditions.struggle?.(currentContext)) {
      triggerAgent('struggle', currentContext);
    }
    
    // Check for milestones
    if (conditions.milestone?.(currentContext)) {
      triggerAgent('milestone', currentContext);
    }
    
    // Check for stuck patterns
    if (conditions.stuck?.(currentContext)) {
      triggerAgent('stuck', currentContext);
    }
    
    // Check for rapid moves
    if (conditions.rapid?.(currentContext)) {
      triggerAgent('rapid', currentContext);
    }
    
    // Check for auto triggers
    if (conditions.auto?.(currentContext)) {
      triggerAgent('auto', currentContext);
    }
  }, [currentContext, autoTriggerEnabled, triggerAgent]);

  const value: AIAgentContextType = {
    isVisible,
    showAgent,
    hideAgent,
    currentContext,
    triggerAgent,
    updateContext
  };

  return (
    <AIAgentContext.Provider value={value}>
      {children}
    </AIAgentContext.Provider>
  );
}; 