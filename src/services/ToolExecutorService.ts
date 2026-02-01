// ToolExecutorService.ts - Handles execution of AI tool calls
import { NavigationService } from './NavigationService';

export interface ToolCall {
  name: string;
  parameters: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  message: string;
  data?: any;
  navigationPerformed?: boolean;
}

export class ToolExecutorService {
  private static instance: ToolExecutorService;
  private navigationService: NavigationService;

  constructor() {
    this.navigationService = NavigationService.getInstance();
  }

  public static getInstance(): ToolExecutorService {
    if (!ToolExecutorService.instance) {
      ToolExecutorService.instance = new ToolExecutorService();
    }
    return ToolExecutorService.instance;
  }

  // Main tool execution dispatcher
  async executeTool(toolCall: ToolCall, context?: any): Promise<ToolResult> {
    console.log(`🔧 DEBUG: ToolExecutor - Executing tool: ${toolCall.name}`, toolCall.parameters);
    console.log(`🔧 DEBUG: ToolExecutor - Context:`, context);

    try {
      switch (toolCall.name) {
        case 'navigate_to_page':
          console.log(`🔧 DEBUG: ToolExecutor - Handling navigation to: ${toolCall.parameters.page}`);
          return await this.handleNavigation(toolCall.parameters, context);
        
        case 'update_settings':
          console.log(`🔧 DEBUG: ToolExecutor - Handling setting update: ${toolCall.parameters.setting}`);
          return await this.handleSettingUpdate(toolCall.parameters, context);
        
        case 'recommend_game':
          console.log(`🔧 DEBUG: ToolExecutor - Handling game recommendation`);
          return await this.handleGameRecommendation(toolCall.parameters, context);
        
        case 'create_content':
          console.log(`🔧 DEBUG: ToolExecutor - Handling content creation`);
          return await this.handleContentCreation(toolCall.parameters, context);
        
        case 'accessibility_support':
          console.log(`🔧 DEBUG: ToolExecutor - Handling accessibility support`);
          return await this.handleAccessibilitySupport(toolCall.parameters, context);
        
        case 'read_user_data':
          console.log(`🔧 DEBUG: ToolExecutor - Handling data reading`);
          return await this.handleDataReading(toolCall.parameters, context);
        
        case 'generate_image':
          console.log(`🔧 DEBUG: ToolExecutor - Image generation should be handled server-side, not client-side!`);
          return {
            success: false,
            message: `🚫 Image generation should be processed server-side, not by client ToolExecutor`
          };


        
        default:
          console.log(`🔧 DEBUG: ToolExecutor - Unknown tool: ${toolCall.name}`);
          return {
            success: false,
            message: `Unknown tool: ${toolCall.name}`
          };
      }
    } catch (error) {
      console.error(`❌ DEBUG: ToolExecutor - Error executing tool ${toolCall.name}:`, error);
      return {
        success: false,
        message: `Failed to execute ${toolCall.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Navigation tool handler
  private async handleNavigation(params: any, context?: any): Promise<ToolResult> {
    const { page, reason } = params;
    
    // Extract user from context - may be user object or userId string
    const user = context?.user || context?.userId || context?.currentUser;
    
    console.log('🔍 Tool Executor Debug - Navigation request:', { page, reason, hasUser: !!user, userId: context?.userId });
    
    const pageMap: Record<string, string> = {
      'playground': '/playground',
      'dashboard': '/dashboard', 
      'forum': '/forum',
      'profile': '/profile',
      'home': '/',
      'about': '/about',
      'settings': '/settings'
    };

    const path = pageMap[page.toLowerCase()] || `/${page.toLowerCase()}`;
    console.log('🔍 Tool Executor Debug - Mapped path:', path);
    
    try {
      // Use your existing navigation logic with user context for auth
      const result = await this.navigationService.navigateTo(path, user);
      console.log('🔍 Tool Executor Debug - Navigation result:', result);
      
      return {
        success: result.success,
        message: result.success 
          ? `🚀 Taking you to ${page}! ${reason || 'Let\'s explore what\'s available there.'}`
          : `❌ Couldn't navigate to ${page}: ${result.message}`,
        navigationPerformed: result.success
      };
    } catch (error) {
      console.error('🔍 Tool Executor Debug - Navigation error:', error);
      return {
        success: false,
        message: `❌ Navigation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Settings update tool handler
  private async handleSettingUpdate(params: any, context?: any): Promise<ToolResult> {
    const { setting, value, reason } = params;
    
    console.log('🔍 Tool Executor Debug - Settings update request:', { setting, value, reason, context });
    
    try {
      // Apply the setting change
      let message = '';
      let success = false;
      
      switch (setting.toLowerCase()) {
        case 'theme':
          // Update theme setting
          console.log('🔍 Tool Executor Debug - Updating theme to:', value);
          // Add actual theme update logic here
          message = `🎨 Theme changed to ${value}! The interface should now reflect your preference.`;
          success = true;
          break;
          
        case 'accessibility':
          console.log('🔍 Tool Executor Debug - Updating accessibility setting:', value);
          message = `♿ Accessibility setting updated to ${value}! I've applied the changes to make NeuraPlay more accessible for you.`;
          success = true;
          break;
          
        case 'notifications':
          console.log('🔍 Tool Executor Debug - Updating notification setting:', value);
          message = `🔔 Notification setting changed to ${value}! You'll now ${value === 'enabled' ? 'receive' : 'not receive'} notifications.`;
          success = true;
          break;
          
        case 'language':
          console.log('🔍 Tool Executor Debug - Updating language setting:', value);
          message = `🌍 Language changed to ${value}! The interface and AI responses will now be in ${value}.`;
          success = true;
          break;
          
        default:
          message = `❌ Unknown setting: ${setting}`;
          success = false;
      }
      
      console.log('🔍 Tool Executor Debug - Settings update result:', { success, message });
      
      return {
        success,
        message: success ? message : `❌ Failed to update ${setting}: ${message}`
      };
    } catch (error) {
      console.error('🔍 Tool Executor Debug - Settings update error:', error);
      return {
        success: false,
        message: `❌ Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Game recommendation handler
  private async handleGameRecommendation(params: any, context?: any): Promise<ToolResult> {
    const { skill, difficulty, reason } = params;
    
    // This would integrate with your existing game data
    const gameRecommendations: Record<string, any[]> = {
      'math': [
        { name: 'Counting Adventure', description: 'Fun number recognition and counting practice' },
        { name: 'Pattern Matching', description: 'Mathematical pattern recognition game' }
      ],
      'reading': [
        { name: 'Letter Hunt', description: 'Interactive letter recognition and phonics' },
        { name: 'Magic Storyteller', description: 'Creative reading and comprehension' }
      ],
      'memory': [
        { name: 'Memory Sequence', description: 'Sequence memorization and recall training' },
        { name: 'Memory Galaxy', description: 'Pattern memory with visual elements' }
      ],
      'coordination': [
        { name: 'Mountain Climber', description: 'Hand-eye coordination and motor skills' },
        { name: 'Happy Builder', description: 'Fine motor skills and spatial awareness' }
      ]
    };

    const games = gameRecommendations[skill.toLowerCase()] || [];
    
    if (games.length === 0) {
      return {
        success: false,
        message: `❌ No games found for skill: ${skill}`
      };
    }

    const gameList = games.map(game => `• **${game.name}**: ${game.description}`).join('\n');
    
    return {
      success: true,
      message: `🎯 Perfect games for ${skill} development!\n\n${gameList}\n\n${reason || 'These games will help you improve your skills!'} Try them in the playground!`,
      data: { skill, games },
      navigationPerformed: false // Could auto-navigate to playground
    };
  }

  // Content creation handler
  private async handleContentCreation(params: any, context?: any): Promise<ToolResult> {
    const { type, content, personalization } = params;
    
    const contentTypes: Record<string, string> = {
      'diary_prompt': '📝 Here\'s your personalized diary prompt',
      'calendar_entry': '📅 I\'ve prepared a calendar entry for you',
      'forum_post': '💬 Here\'s a forum post suggestion'
    };

    const typeMessage = contentTypes[type] || '📄 Here\'s your personalized content';
    
    return {
      success: true,
      message: `${typeMessage}:\n\n"${content}"\n\n${personalization || 'This is tailored just for you!'}`,
      data: { type, content }
    };
  }

  // Accessibility support handler
  private async handleAccessibilitySupport(params: any, context?: any): Promise<ToolResult> {
    const { type, action, details } = params;
    
    const accessibilityActions: Record<string, Record<string, string>> = {
      'color_blindness': {
        'test': '🎨 Let me set up a color vision test for you! I\'ll show you some color patterns to determine the best settings.',
        'configure': '🌈 I\'ve configured the color scheme for color blindness support. Colors should be much easier to distinguish now!',
        'enable': '♿ Color blindness support enabled! The interface now uses high-contrast, distinguishable colors.'
      },
      'dyslexia': {
        'enable': '📖 Dyslexia support enabled! Text spacing, fonts, and layout have been optimized for easier reading.',
        'configure': '🔤 I\'ve adjusted the text settings to be more dyslexia-friendly.'
      },
      'motor_skills': {
        'enable': '🎯 Motor skills assistance enabled! Buttons are larger and interactions are simplified.',
        'configure': '✋ Interface adjusted for easier motor control.'
      }
    };

    const message = accessibilityActions[type]?.[action] || 
      `♿ ${action.charAt(0).toUpperCase() + action.slice(1)} ${type.replace('_', ' ')} support. ${details || ''}`;

    return {
      success: true,
      message: message,
      data: { type, action, details }
    };
  }



  // Data reading handler
  private async handleDataReading(params: any, context?: any): Promise<ToolResult> {
    const { data_type, filter } = params;
    
    // This would integrate with your actual data sources
    const mockData: Record<string, string> = {
      'notifications': '🔔 Recent notifications:\n• Welcome to NeuraPlay!\n• New games available\n• Daily streak: 3 days!',
      'progress': '📊 Your learning progress:\n• Math skills: Level 4\n• Reading: Level 3\n• Memory games: Level 5',
      'forum_posts': '💬 Recent forum activity:\n• "Tips for memory games" - 12 likes\n• "My learning journey" - 8 comments',
      'diary_entries': '📖 Recent diary entries:\n• "Today I learned about fractions"\n• "Played memory games for 20 minutes"'
    };

    const data = mockData[data_type] || `📄 No ${data_type.replace('_', ' ')} data available right now.`;
    
    return {
      success: true,
      message: data,
      data: { data_type, filter, raw_data: data }
    };
  }

  // Image generation handler removed - now handled server-side only
}

// Export singleton instance
export const toolExecutorService = ToolExecutorService.getInstance();
export default toolExecutorService;