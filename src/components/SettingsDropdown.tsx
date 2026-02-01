import React, { useState, useRef, useEffect } from 'react';
import { Settings, Sun, Moon, Monitor, Palette, Eye, Smartphone, Globe, User, Shield, HelpCircle, Zap, Cog, ShieldAlert, ChevronRight, Download, Trash2, Search, Database, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
// Import centralized language service
import { type LanguageCode } from '../services/LanguageService';

type TabType = 'theme' | 'accessibility' | 'voice' | 'quick-actions' | 'user' | 'privacy';


interface User {
  id: string;
  email: string;
  username?: string;
}
const SettingsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('theme');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const navigate = useNavigate();

  // Privacy & Memory Management State
  const [memories, setMemories] = useState<any[]>([]);
  const [memorySearchTerm, setMemorySearchTerm] = useState('');
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Voice Settings State
  const [sttSettings, setSttSettings] = useState<{
    isRecording: boolean;
    language: LanguageCode;
  }>(() => {
    // Load from localStorage on initialization
    try {
      const saved = localStorage.getItem('neuraplay_voice_language');
      return {
        isRecording: false,
        language: (saved as LanguageCode) || 'auto'
      };
    } catch {
      return {
        isRecording: false,
        language: 'auto'
      };
    }
  });

  // Save language setting to localStorage when changed
  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setSttSettings(prev => ({ ...prev, language: newLanguage }));
    try {
      localStorage.setItem('neuraplay_voice_language', newLanguage);
    } catch (error) {
      console.error('Failed to save voice language setting:', error);
    }
  };

  // Universal user ID detection using centralized service
  const getUserId = () => {
    // Browser fallback - use direct resolution since dynamic import doesn't work in this context
    if (user?.username) return user.username;
    if (user?.id) return user.id;
    // if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'admin_2025'; // Fallback to consistent development user
  };

  // Check if user is admin on component mount
  useEffect(() => {
    const checkAdminStatus = () => {
      const currentUserId = getUserId();
      // Check if user is admin (adjusted logic for development)
      const isUserAdmin = user?.role === 'admin' || 
                         user?.username === 'admin_2025' || 
                         user?.email?.includes('admin') ||
                         currentUserId === 'admin_2025' ||  // Direct admin_2025 access
                         !user;  // Allow access when no user is logged in (for development)
      setIsAdmin(isUserAdmin);
    };
    checkAdminStatus();
  }, [user]);

  // Load user memories
  const loadUserMemories = async () => {
    const currentUserId = getUserId();
    
    if (!isAdmin) {
      return;
    }
    
    setLoadingMemories(true);
    try {
      console.log('📤 Fetching memories from API...');
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          userId: currentUserId,
          query: '',
          limit: 100
        })
      });

      const result = await response.json();
      console.log('📥 Memory API response:', { 
        success: result.success, 
        memoryCount: result.memories?.length || 0 
      });
      
      if (result.success && result.memories) {
        setMemories(result.memories);
        console.log('✅ Memories loaded successfully:', result.memories.length);
      } else {
        console.log('❌ No memories in response:', result);
      }
    } catch (error) {
      console.error('❌ Failed to load memories:', error);
    }
    setLoadingMemories(false);
  };

  // Load memories when privacy tab is opened
  useEffect(() => {
    if (activeTab === 'privacy' && isAdmin && memories.length === 0) {
      loadUserMemories();
    }
  }, [activeTab, isAdmin]);

  // Fuzzy search filter for memories
  const filteredMemories = memories.filter(memory => {
    if (!memorySearchTerm) return true;
    const searchLower = memorySearchTerm.toLowerCase();
    const content = (memory.content || memory.value || '').toLowerCase();
    const key = (memory.memory_key || memory.key || '').toLowerCase();
    const category = (memory.category || '').toLowerCase();
    
    return content.includes(searchLower) || 
           key.includes(searchLower) || 
           category.includes(searchLower) ||
           content.split(' ').some((word: string) => word.startsWith(searchLower));
  });

  // Delete memory with proper API format
  const handleDeleteMemory = async (memory: any) => {
    if (!isAdmin) return;
    
    const memoryKey = memory.memory_key || memory.key;
    const memoryContent = memory.memory_value || memory.value || memory.content || '';
    
    const confirmed = window.confirm(
      `🗑️ Delete Memory?\n\nKey: "${memoryKey}"\nContent: "${memoryContent.substring(0, 100)}${memoryContent.length > 100 ? '...' : ''}"\n\nThis action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      const response = await fetch('/api/memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
          body: JSON.stringify({
            action: 'delete',
            userId: getUserId(),
            key: memoryKey
          })
      });

      const result = await response.json();
      if (result.success) {
        // Remove from local state
        setMemories(prev => prev.filter(m => (m.memory_key || m.key) !== memoryKey));
        alert('✅ Memory deleted successfully');
      } else {
        alert('❌ Failed to delete memory');
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
      alert('❌ Error deleting memory');
    }
  };

  // Bulk delete memories by domain/category
  const handleBulkDeleteByDomain = async (domain: string) => {
    if (!isAdmin) return;
    
    const matchingMemories = memories.filter(memory => 
      (memory.category || '').toLowerCase().includes(domain.toLowerCase()) ||
      (memory.memory_key || memory.key || '').toLowerCase().includes(domain.toLowerCase())
    );

    if (matchingMemories.length === 0) {
      alert('No memories found for this domain');
      return;
    }

    const confirmed = window.confirm(
      `🗑️ Bulk Delete - "${domain}" Domain\n\nThis will delete ${matchingMemories.length} memories related to "${domain}".\n\nThis action cannot be undone. Continue?`
    );
    
    if (!confirmed) return;

    try {
      let deletedCount = 0;
      for (const memory of matchingMemories) {
        const response = await fetch('/api/memory', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'delete',
            userId: getUserId(),
            key: memory.memory_key || memory.key
          })
        });

        const result = await response.json();
        if (result.success) {
          deletedCount++;
        }
      }

      // Refresh memories list
      await loadUserMemories();
      alert(`✅ Bulk delete completed: ${deletedCount}/${matchingMemories.length} memories deleted`);
    } catch (error) {
      console.error('Failed to bulk delete memories:', error);
      alert('❌ Error during bulk delete operation');
    }
  };

  // Navigation and Action Handlers
  const handleProfileRedirect = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handlePrivacySettings = () => {
    setIsOpen(false);
    // For now, redirect to profile where privacy settings would be
    navigate('/profile');
    // TODO: Implement dedicated privacy settings modal
  };

  const handleLanguageSettings = () => {
    setIsOpen(false);
    // TODO: Implement language selection modal
    alert('Language settings coming soon!');
  };

  const handleHelpSupport = () => {
    setIsOpen(false);
    // TODO: Implement help/support system
    window.open('https://github.com/Neuraplayapp/Neuraplayv8/issues', '_blank');
  };

  const handleBlockedUsers = () => {
    setIsOpen(false);
    // TODO: Implement blocked users management modal
    alert('Blocked users management coming soon!');
  };

  const handleDataExport = () => {
    setIsOpen(false);
    try {
      const userData = {
        profile: user?.profile,
        username: user?.username,
        exportDate: new Date().toISOString(),
        // Add more data as needed
      };
      const dataStr = JSON.stringify(userData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `neuraplay-data-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const handleEditProfile = () => {
    setIsOpen(false);
    navigate('/profile');
  };

  const handleDeleteAccount = () => {
    setIsOpen(false);
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data, progress, and achievements.'
    );
    if (confirmed) {
      const doubleConfirm = window.confirm(
        'This is your final warning. Deleting your account will:\n\n• Remove all your game progress\n• Delete your achievements and stats\n• Remove your friends and social connections\n• Permanently delete your profile\n\nType "DELETE" in the next prompt to confirm.'
      );
      if (doubleConfirm) {
        const finalConfirm = prompt('Type "DELETE" to permanently delete your account:');
        if (finalConfirm === 'DELETE') {
          // TODO: Implement actual account deletion API call
          alert('Account deletion functionality is not yet implemented. Your account is safe.');
        } else {
          alert('Account deletion cancelled.');
        }
      }
    }
  };

  const { 
    theme, 
    setTheme, 
    isDarkMode, 
    animationsEnabled, 
    setAnimationsEnabled,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    focusIndicators,
    setFocusIndicators,
    keyboardNavigation,
    setKeyboardNavigation,
    colorBlindMode,
    setColorBlindMode,
    textSpacing,
    setTextSpacing
  } = useTheme();

  // REMOVED: Local AI Personality state - now using context
  // const [aiPersonality, setAiPersonality] = useState('synapse-normal');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'Auto', icon: Monitor },
    { value: 'bright', label: 'Bright', icon: Zap },
    { value: 'dark-gradient', label: 'Dark Gradient', icon: Palette },
    { value: 'white-purple-gradient', label: 'Purple Gradient', icon: Palette }
  ];

  const fontSizeOptions = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'extra-large', label: 'Extra Large' }
  ];

  const colorBlindOptions = [
    { value: 'none', label: 'None' },
    { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
    { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
    { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' }
  ];

  const textSpacingOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'increased', label: 'Increased' },
    { value: 'extra', label: 'Extra Spacing' }
  ];

  // Voice language options (for TTS)
  const voiceLanguageOptions = [
    { value: 'auto', label: 'Auto Detect', flag: '🌐' },
    { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
    { value: 'en-GB', label: 'English (UK)', flag: '🇬🇧' },
    { value: 'ar', label: 'Arabic', flag: '🇸🇦' },
    { value: 'es', label: 'Spanish', flag: '🇪🇸' },
    { value: 'fr', label: 'French', flag: '🇫🇷' },
    { value: 'de', label: 'German', flag: '🇩🇪' },
    { value: 'ru', label: 'Russian', flag: '🇷🇺' },
    { value: 'kk', label: 'Kazakh', flag: '🇰🇿' },
    { value: 'sv', label: 'Swedish', flag: '🇸🇪' },
    { value: 'zh', label: 'Chinese', flag: '🇨🇳' },
    { value: 'ja', label: 'Japanese', flag: '🇯🇵' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
  type="button"
  onClick={() => setIsOpen(!isOpen)}
  className={`p-3 rounded-full transition-all ${
    isDarkMode
      ? 'text-purple-200 hover:text-purple-100 hover:bg-purple-700/40'
      : 'text-purple-900 hover:text-purple-700 hover:bg-purple-50'
  }`}
  title="Settings"
>
  <Settings className="w-5 h-5 text-current" />
</button>
      {isOpen && (
        <div className={`absolute left-1/2 transform -translate-x-1/2 top-[calc(100%+30px)] w-96 rounded-xl shadow-2xl z-50 overflow-hidden ${
          isDarkMode 
            ? 'bg-gray-800 border-2 border-gray-700' 
            : 'bg-white border-2 border-gray-300'
        }`}>
          <div className="flex">
            {/* Side Tabs */}
            <div className={`w-20 border-r-2 ${
              isDarkMode 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-gray-50 border-gray-300'
            }`}>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => setActiveTab('theme')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'theme'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Theme"
                >
                  <Palette className="w-5 h-5 mx-auto" />
                </button>
                <button
  onClick={() => setActiveTab('accessibility')}
  className={`w-full p-3 rounded-lg transition-all ${
    activeTab === 'accessibility'
      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-white'
      : 'text-gray-600 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
  }`}
  title="Accessibility"
>

                  <Eye className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'voice'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Voice & Language"
                >
                  <Globe className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('quick-actions')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'quick-actions'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Quick Actions"
                >
                  <Zap className="w-5 h-5 mx-auto" />
                </button>
                <button
                  onClick={() => setActiveTab('user')}
                  className={`w-full p-3 rounded-lg transition-all ${
                    activeTab === 'user'
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="User Settings"
                >
                  <Cog className="w-5 h-5 mx-auto" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`w-full p-3 rounded-lg transition-all ${
                      activeTab === 'privacy'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    title="Privacy & Memory Management (Admin Only)"
                  >
                    <Database className="w-5 h-5 mx-auto" />
                  </button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 max-h-[600px] overflow-y-auto">
              {/* Header */}
              <div className={`flex items-center justify-between border-b-2 pb-4 mb-6 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-300'
              }`}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {activeTab === 'theme' && 'Theme Settings'}
                  {activeTab === 'accessibility' && 'Accessibility'}
                  {activeTab === 'voice' && 'Voice & Language'}
                  {activeTab === 'quick-actions' && 'Quick Actions'}
                  {activeTab === 'user' && 'User Settings'}
                  {activeTab === 'privacy' && 'Privacy & Memory Management'}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {/* Tab Content */}
              {activeTab === 'theme' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {themeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as any)}
                          className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            theme === option.value
                              ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                              : isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'voice' && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Configure voice and language settings for text-to-speech and speech recognition.
                  </p>
                  
                  {/* Voice Language */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Voice Language
                    </label>
                    <select
                      value={sttSettings.language}
                      onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                      className={`w-full p-2 border-2 rounded-lg ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-gray-300' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      {voiceLanguageOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.flag} {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      This affects both speech recognition and text-to-speech output
                    </p>
                  </div>
                  
                  {/* Voice Tip */}
                  <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-purple-900/30 border border-purple-700' : 'bg-purple-50 border border-purple-200'}`}>
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      💡 <strong>Tip:</strong> You can also say "speak to me in Arabic" or "switch voice to Spanish" to change the language using voice commands.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'accessibility' && (
                <div className="space-y-4">
                  {/* Font Size */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</label>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(e.target.value)}
                      className={`w-full p-2 border-2 rounded-lg ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      {fontSizeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* High Contrast */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">High Contrast</span>
                    </div>
                    <button
                      onClick={() => setHighContrast(!highContrast)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        highContrast ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Reduced Motion</span>
                    </div>
                    <button
                      onClick={() => setReducedMotion(!reducedMotion)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        reducedMotion ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Focus Indicators */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Focus Indicators</span>
                    </div>
                    <button
                      onClick={() => setFocusIndicators(!focusIndicators)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        focusIndicators ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          focusIndicators ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Navigation */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard Navigation</span>
                    </div>
                    <button
                      onClick={() => setKeyboardNavigation(!keyboardNavigation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        keyboardNavigation ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Color Blind Mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Blind Mode</label>
                    <select
                      value={colorBlindMode}
                      onChange={(e) => setColorBlindMode(e.target.value)}
                      className={`w-full p-2 border-2 rounded-lg ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      {colorBlindOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Text Spacing */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Text Spacing</label>
                    <select
                      value={textSpacing}
                      onChange={(e) => setTextSpacing(e.target.value)}
                      className={`w-full p-2 border-2 rounded-lg ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      {textSpacingOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Animations */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Animations</span>
                    </div>
                    <button
                      onClick={() => setAnimationsEnabled(!animationsEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        animationsEnabled ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Voice Language Selection */}
                  <div className="space-y-2 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Voice Input Language</label>
                    <select
                      value={sttSettings.language}
                      onChange={(e) => handleLanguageChange(e.target.value as LanguageCode)}
                      disabled={sttSettings.isRecording}
                      className={`w-full p-2 border-2 rounded-lg ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      } disabled:opacity-50`}
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="en">English</option>
                      <option value="ar">Arabic (العربية)</option>
                      <option value="sv">Swedish (Svenska)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="fr">French (Français)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="it">Italian (Italiano)</option>
                      <option value="pt">Portuguese (Português)</option>
                      <option value="ru">Russian (Русский)</option>
                      <option value="zh">Chinese (中文)</option>
                      <option value="ja">Japanese (日本語)</option>
                      <option value="ko">Korean (한국어)</option>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select the language for voice input recognition. Auto-detect will automatically identify the spoken language.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'quick-actions' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={handleProfileRedirect}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Profile</span>
                    </button>
                    <button 
                      onClick={handlePrivacySettings}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Shield className="w-4 h-4" />
                      <span className="text-sm font-medium">Privacy</span>
                    </button>
                    <button 
                      onClick={handleLanguageSettings}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-sm font-medium">Language</span>
                    </button>
                    <button 
                      onClick={handleHelpSupport}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-[1.02] ${
                        isDarkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                          : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Help</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'user' && (
                <div className="space-y-4">
                  {/* Account Information */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Information</h4>
                    <div className={`rounded-lg p-3 border ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      {user ? (
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Username:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Email:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{user.email}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Role:</span>
                            <span className="font-medium text-gray-900 dark:text-white capitalize">{user.role}</span>
                          </div>
                          {user.age && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Age:</span>
                              <span className="font-medium text-gray-900 dark:text-white">{user.age}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-1 border-t border-gray-300 dark:border-gray-600">
                            <span className="text-gray-500 dark:text-gray-400">XP:</span>
                            <span className="font-medium text-purple-600 dark:text-purple-400">{user.profile.xp}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Stars:</span>
                            <span className="font-medium text-yellow-600 dark:text-yellow-400">{user.profile.stars}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">Please sign in to view account details</p>
                      )}
                    </div>
                  </div>

                  {/* Privacy & Safety */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Privacy & Safety</h4>
                    <div className="space-y-2">
                      <button 
                        onClick={handlePrivacySettings}
                        className={`w-full rounded-lg p-3 text-left border transition-all hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-purple-600" />
                            <div>
                              <h5 className="text-xs font-medium text-gray-900 dark:text-white">Privacy Settings</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Manage data & privacy</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                      </button>
                      
                      <button 
                        onClick={handleBlockedUsers}
                        className={`w-full rounded-lg p-3 text-left border transition-all hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            <div>
                              <h5 className="text-xs font-medium text-gray-900 dark:text-white">Blocked Users</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Manage blocked users</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                      </button>

                      <button 
                        onClick={handleDataExport}
                        className={`w-full rounded-lg p-3 text-left border transition-all hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-blue-600" />
                            <div>
                              <h5 className="text-xs font-medium text-gray-900 dark:text-white">Data Export</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Download your data</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Account Actions */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account Actions</h4>
                    <div className="space-y-2">
                      <button 
                        onClick={handleEditProfile}
                        className={`w-full rounded-lg p-3 text-left border transition-all hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' 
                            : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-green-600" />
                            <div>
                              <h5 className="text-xs font-medium text-gray-900 dark:text-white">Edit Profile</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400">Update your information</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                      </button>

                      <button 
                        onClick={handleDeleteAccount}
                        className={`w-full rounded-lg p-3 text-left border transition-all hover:scale-[1.02] ${
                          isDarkMode 
                            ? 'bg-red-900/20 border-red-800 hover:bg-red-900/30' 
                            : 'bg-red-50 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4 text-red-600" />
                            <div>
                              <h5 className="text-xs font-medium text-red-700 dark:text-red-400">Delete Account</h5>
                              <p className="text-xs text-red-600 dark:text-red-500">Permanently delete account</p>
                            </div>
                          </div>
                          <ChevronRight className="w-3 h-3 text-red-400" />
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && isAdmin && (
                <div className="space-y-6">
                  {/* Admin Notice */}
                  <div className={`rounded-lg p-4 border-l-4 ${
                    isDarkMode 
                      ? 'bg-orange-900/20 border-orange-600' 
                      : 'bg-orange-50 border-orange-400'
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400">Admin Only Feature</h4>
                    </div>
                    <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                      Advanced memory management with fuzzy search and bulk deletion capabilities.
                    </p>
                  </div>

                  {/* Memory Search */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Stored Memories & Domains</h4>
                      <button
                        onClick={loadUserMemories}
                        disabled={loadingMemories}
                        className={`px-3 py-1 text-xs rounded-lg border transition-all ${
                          isDarkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                            : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                        } ${loadingMemories ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {loadingMemories ? '🔄' : '🔄 Refresh'}
                      </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search memories (fuzzy matching)..."
                        value={memorySearchTerm}
                        onChange={(e) => setMemorySearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border-2 rounded-lg text-sm ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                      />
                    </div>

                    {/* Memory Count */}
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>Total: {memories.length} memories</span>
                      {memorySearchTerm && (
                        <span>Filtered: {filteredMemories.length} matches</span>
                      )}
                    </div>
                  </div>

                  {/* Domain Quick Actions */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Domain Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['location', 'preference', 'name', 'event', 'cognitive', 'learning'].map((domain) => {
                        const domainCount = memories.filter(m => 
                          (m.category || '').toLowerCase().includes(domain) ||
                          (m.memory_key || m.key || '').toLowerCase().includes(domain)
                        ).length;
                        
                        return (
                          <button
                            key={domain}
                            onClick={() => handleBulkDeleteByDomain(domain)}
                            disabled={domainCount === 0}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                              domainCount > 0
                                ? isDarkMode
                                  ? 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30'
                                  : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                : isDarkMode
                                  ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <span className="capitalize">{domain}</span>
                            <span className="font-medium">{domainCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Memory List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Individual Memories {memorySearchTerm && '(Fuzzy Search Results)'}
                    </h4>
                    
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {loadingMemories ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                          Loading memories...
                        </div>
                      ) : filteredMemories.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          {memorySearchTerm ? 'No memories match your search' : 'No memories found'}
                        </div>
                      ) : (
                        filteredMemories.map((memory, index) => {
                          const content = memory.content || memory.value || 'No content';
                          const key = memory.memory_key || memory.key || 'Unknown';
                          const category = memory.category || 'general';
                          
                          return (
                            <div
                              key={memory.id || index}
                              className={`rounded-lg p-3 border transition-all ${
                                isDarkMode
                                  ? 'bg-gray-700 border-gray-600'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      isDarkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {category}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                      {key}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">
                                    {content.length > 100 ? `${content.substring(0, 100)}...` : content}
                                  </p>
                                  {memory.created_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                      {new Date(memory.created_at).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteMemory(memory)}
                                  className={`p-1.5 rounded-lg transition-all ${
                                    isDarkMode
                                      ? 'text-red-400 hover:bg-red-900/30'
                                      : 'text-red-600 hover:bg-red-100'
                                  }`}
                                  title="Delete this memory"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Emergency Actions */}
                  <div className="space-y-3 pt-4 border-t border-gray-300 dark:border-gray-600">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400">⚠️ Danger Zone</h4>
                    
                    {/* Clear memories only - uses delete_all API */}
                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(
                          '🚨 DANGER: Clear All Memories\n\nThis will permanently delete ALL stored memories from ALL database tables.\n\nThis action cannot be undone.'
                        );
                        if (!confirmed) return;
                        
                        const finalConfirm = prompt('Type "DELETE ALL" to confirm:');
                        if (finalConfirm !== 'DELETE ALL') {
                          alert('Cancelled.');
                          return;
                        }
                        
                        setLoadingMemories(true);
                        try {
                          console.log('🔥 Calling delete_all API for user:', getUserId());
                          
                          const response = await fetch('/api/memory', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'delete_all',
                              userId: getUserId()
                            })
                          });
                          
                          const result = await response.json();
                          console.log('🔥 delete_all result:', result);
                          
                          if (result.success) {
                            const deletedCount = result.deleted || 0;
                            setMemories([]); // Clear local state
                            alert(`✅ Deleted ${deletedCount} memories from all tables!\n\nDetails:\n${JSON.stringify(result.details || {}, null, 2)}`);
                          } else {
                            alert(`❌ Failed to delete: ${result.error || 'Unknown error'}`);
                          }
                        } catch (error) {
                          console.error('❌ delete_all failed:', error);
                          alert('❌ Error deleting memories. Check console.');
                        } finally {
                          setLoadingMemories(false);
                        }
                      }}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        isDarkMode
                          ? 'bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/30'
                          : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-medium">Clear All Memories (Database)</span>
                      </div>
                    </button>

                    {/* Clear ALL local data (courses, canvas, cache) */}
                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(
                          '🔥 NUCLEAR OPTION: Clear ALL Local Data\n\n' +
                          'This will clear:\n' +
                          '• All cached courses from your browser\n' +
                          '• All canvas documents from your browser\n' +
                          '• All conversation history\n' +
                          '• All local preferences\n\n' +
                          'Note: Courses saved on the server will remain and sync back on reload.\n\n' +
                          'Are you sure?'
                        );
                        if (confirmed) {
                          try {
                            // List of NeuraPlay localStorage keys to clear
                            const keysToRemove = [
                              'neuraplay_custom_courses',
                              'neuraplay-canvas-storage',
                              'neuraplay_canvas_access_tracker',
                              'neuraplay_canvas_documents',
                              'neuraplay-conversations',
                              'neuraplay_floating_assistant_session',
                              'neuraplay_voice_language',
                              'neuraplay_user',
                              'currentUser'
                            ];
                            
                            // Also clear all course progress keys
                            const allKeys = Object.keys(localStorage);
                            for (const key of allKeys) {
                              if (key.startsWith('course_progress_') || 
                                  key.startsWith('neuraplay_') ||
                                  key.startsWith('learning_')) {
                                keysToRemove.push(key);
                              }
                            }
                            
                            // Remove all identified keys
                            let clearedCount = 0;
                            for (const key of [...new Set(keysToRemove)]) {
                              if (localStorage.getItem(key) !== null) {
                                localStorage.removeItem(key);
                                clearedCount++;
                              }
                            }
                            
                            alert(`✅ Cleared ${clearedCount} local storage items.\n\nRefresh the page to see changes.`);
                            
                            // Offer to refresh
                            if (window.confirm('Would you like to refresh the page now?')) {
                              window.location.reload();
                            }
                          } catch (error) {
                            console.error('Failed to clear local data:', error);
                            alert('❌ Error clearing local data: ' + (error as Error).message);
                          }
                        }
                      }}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        isDarkMode
                          ? 'bg-orange-900/20 border-orange-800 text-orange-400 hover:bg-orange-900/30'
                          : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Clear All Browser Data (Courses/Canvas/Cache)</span>
                      </div>
                    </button>

                    {/* Full data wipe - server + local */}
                    <button
                      onClick={async () => {
                        const confirmed = window.confirm(
                          '💀 COMPLETE DATA WIPE\n\n' +
                          'This will permanently delete:\n' +
                          '• ALL memories from the server\n' +
                          '• ALL courses from the server\n' +
                          '• ALL local browser data\n' +
                          '• ALL canvas documents\n' +
                          '• Everything!\n\n' +
                          'This is the most destructive action possible.\n\n' +
                          'Type "NUKE EVERYTHING" to confirm:'
                        );
                        if (!confirmed) return;
                        
                        const finalConfirm = prompt('Type "NUKE EVERYTHING" to proceed:');
                        if (finalConfirm !== 'NUKE EVERYTHING') {
                          alert('Cancelled - nothing was deleted.');
                          return;
                        }
                        
                        try {
                          const currentUserId = getUserId();
                          let serverResults = { memories: 0, courses: 0 };
                          
                          // 1. Clear server memories
                          try {
                            const memResponse = await fetch('/api/memory', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'delete_all',
                                userId: currentUserId
                              })
                            });
                            const memResult = await memResponse.json();
                            serverResults.memories = memResult.deleted || 0;
                          } catch (e) {
                            console.warn('Memory delete failed:', e);
                          }
                          
                          // 2. Clear server courses
                          try {
                            const courseResponse = await fetch(`/api/courses/${currentUserId}`, {
                              method: 'GET'
                            });
                            const courseData = await courseResponse.json();
                            if (courseData.success && courseData.courses) {
                              for (const course of courseData.courses) {
                                await fetch(`/api/courses/${course.id}?userId=${currentUserId}`, {
                                  method: 'DELETE'
                                });
                                serverResults.courses++;
                              }
                            }
                          } catch (e) {
                            console.warn('Course delete failed:', e);
                          }
                          
                          // 3. Clear ALL localStorage
                          const clearedKeys = Object.keys(localStorage).length;
                          localStorage.clear();
                          
                          // 4. Clear sessionStorage too
                          sessionStorage.clear();
                          
                          alert(
                            `🔥 COMPLETE WIPE FINISHED\n\n` +
                            `Server:\n` +
                            `• Memories deleted: ${serverResults.memories}\n` +
                            `• Courses deleted: ${serverResults.courses}\n\n` +
                            `Browser:\n` +
                            `• LocalStorage cleared: ${clearedKeys} items\n` +
                            `• SessionStorage cleared\n\n` +
                            `Page will now reload.`
                          );
                          
                          window.location.reload();
                        } catch (error) {
                          console.error('Complete wipe failed:', error);
                          alert('❌ Error during wipe: ' + (error as Error).message);
                        }
                      }}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        isDarkMode
                          ? 'bg-red-950 border-red-700 text-red-300 hover:bg-red-900'
                          : 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm font-bold">💀 COMPLETE DATA WIPE (Server + Browser)</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && !isAdmin && (
                <div className="text-center py-8">
                  <ShieldAlert className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Access Restricted</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Privacy & Memory Management is only available to administrators.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsDropdown;