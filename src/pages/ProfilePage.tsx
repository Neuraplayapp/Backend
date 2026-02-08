import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAIAgent } from '../contexts/AIAgentContext';
import { 
  Star, UserPlus, Edit2, Check, X, Users, ShieldAlert, 
  Trophy, Brain, Settings, 
  Activity, Clock, Zap, MessageCircle, Cog, Target,
  ChevronRight, Home, Gamepad2, Users2, FileText, 
  BarChart3, Sparkles, Crown, Lock, Wand2, Loader2
} from 'lucide-react';
import { isRegistrationEnabled } from '../config/features';
import { useNavigate } from 'react-router-dom';
import AIAssessmentReport from '../components/AIAssessmentReport';
import FriendsSystem from '../components/FriendsSystem';
import { unifiedAPIRouter } from '../services/UnifiedAPIRouter';
import { learnerPedagogicalProfileService, type LearnerPedagogicalProfile } from '../services/LearnerPedagogicalProfile';
import CompetencyHelpModal from '../components/CompetencyHelpModal';


const ProfilePage: React.FC = () => {
  const { user, setUser } = useUser();
  const { 
    isDarkMode
  } = useTheme();
  const { showAgent } = useAIAgent();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [bio, setBio] = useState(user?.profile.about || '');
  const [bioSaved, setBioSaved] = useState(false);
  const [newUsername, setNewUsername] = useState(user?.username || '');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Avatar generation state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [generatedAvatarUrl, setGeneratedAvatarUrl] = useState('');

  // 🎓 Pedagogical Profile State
  const [pedagogicalProfile, setPedagogicalProfile] = useState<LearnerPedagogicalProfile | null>(null);
  const [selectedCompetency, setSelectedCompetency] = useState<{ name: string; level: number } | null>(null);


  // Initialize demo friend data if user exists but has no friends
  useEffect(() => {
    if (user && (!user.friends || user.friends?.length === 0)) {
      // Add some demo friends
      const demoFriends = ['Alex', 'Sam', 'Jordan'];
      const demoRequests = ['Taylor', 'Casey'];
      
      setUser({
        ...user,
        friends: demoFriends,
        friendRequests: {
          sent: [],
          received: demoRequests
        }
      });
    }
  }, [user, setUser]);

  // Update bio and username state when user changes
  useEffect(() => {
    if (user) {
      setBio(user.profile.about || '');
      setNewUsername(user.username || '');
    }
  }, [user]);

  // 🎓 Load pedagogical profile
  useEffect(() => {
    if (user?.id) {
      loadPedagogicalProfile();
    }
  }, [user?.id, activeTab]);

  const loadPedagogicalProfile = async () => {
    if (!user?.id) return;
    try {
      const profile = await learnerPedagogicalProfileService.getProfile(user.id);
      setPedagogicalProfile(profile);
    } catch (error) {
      console.error('Failed to load pedagogical profile:', error);
    }
  };
  
  // Show login prompt if user is not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-purple-900 dark:text-white">Welcome to NeuraPlay!</h1>
          <p className="text-lg mb-8 text-purple-700 dark:text-gray-300">
            Please log in to view and manage your profile.
          </p>
          <div className="space-y-4">
            {isRegistrationEnabled() ? (
              <button 
                onClick={() => navigate('/forum-registration')}
                className="inline-block w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-full hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Create Account
              </button>
            ) : (
              <div className="w-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold px-8 py-4 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Registration Disabled
              </div>
            )}
            <button 
              onClick={() => navigate('/signin')}
              className="inline-block w-full bg-transparent border-2 font-bold px-8 py-4 rounded-full transition-all duration-300 border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Log In
            </button>
          </div>
          <p className="text-sm mt-6 text-purple-600 dark:text-gray-400">
            Join thousands of learners discovering the joy of cognitive development!
          </p>
        </div>
      </div>
    );
  }

  const handleBioSave = () => {
    if (!user) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUser({ ...user, profile: { ...user.profile, about: bio } });
      setBioSaved(true);
      setTimeout(() => setBioSaved(false), 1500);
      setEditing(false);
      setIsLoading(false);
    }, 500);
  };

  const handleUsernameSave = () => {
    if (!user || !newUsername.trim()) return;
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setUser({ ...user, username: newUsername.trim() });
      setEditingUsername(false);
      setIsLoading(false);
    }, 500);
  };

  const handleUsernameCancel = () => {
    setNewUsername(user?.username || '');
    setEditingUsername(false);
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim() || isGeneratingAvatar) return;
    
    setIsGeneratingAvatar(true);
    setError(null);
    try {
      console.log('🎨 Generating avatar with prompt:', avatarPrompt);
      
      // Use proper pathway through unifiedAPIRouter
      const result = await unifiedAPIRouter.generateImage(
        `professional avatar, profile picture, ${avatarPrompt}, high quality, centered face, clean background`
      );
      
      console.log('🔍 Avatar generation result:', result);
      
      // Handle different response structures (production vs local dev)
      let imageUrl = null;
      if (result) {
        // Production: result.image_url (top level)
        imageUrl = result.image_url || result.imageUrl;
        
        // Local dev mock: result.images[0].url
        if (!imageUrl && result.images && Array.isArray(result.images) && result.images[0]) {
          imageUrl = result.images[0].url;
        }
        
        // ToolRegistry wrapped: result.data.image_url
        if (!imageUrl && result.data) {
          imageUrl = result.data.image_url || result.data.imageUrl;
        }
      }
      
      if (imageUrl) {
        setGeneratedAvatarUrl(imageUrl);
        console.log('✅ Avatar generated successfully:', imageUrl.substring(0, 50) + '...');
      } else {
        console.error('❌ No image URL found in result:', result);
        throw new Error('No image URL returned from generation service. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Avatar generation failed:', error);
      setError(error instanceof Error ? error.message : 'Avatar generation failed');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleApplyAvatar = async () => {
    if (!user || !generatedAvatarUrl) return;
    
    const updatedUser = { ...user, profile: { ...user.profile, avatar: generatedAvatarUrl } };
    setUser(updatedUser);
    
    // 🔄 SYNC TO DATABASE: Persist avatar permanently
    try {
      console.log('🔄 Saving avatar to database...');
      const response = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: updatedUser.id,
          userData: {
            id: updatedUser.id,
            profile: updatedUser.profile
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Avatar saved to database successfully');
      } else {
        console.warn('⚠️ Avatar database sync failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to save avatar to database:', error);
    }
    
    setShowAvatarModal(false);
    setGeneratedAvatarUrl('');
    setAvatarPrompt('');
  };





  const triggerAIInsights = () => {
    showAgent({
      gameId: 'profile-analysis',
      agentPersonality: 'analyst',
      sessionData: {
        userLevel: user.profile.rank,
        totalXP: user.profile.xp,
        totalStars: user.profile.stars,
        gamesPlayed: Object.keys(user.profile.gameProgress || {}).length,
        totalPlayTime: Object.values(user.profile.gameProgress || {}).reduce((sum, game) => sum + (game.playTime || 0), 0)
      }
    });

  };

  const getProgressPercentage = () => {
    const currentXP = user.profile.xp;
    const nextLevelXP = user.profile.xpToNextLevel;
    return Math.min((currentXP / nextLevelXP) * 100, 100);
  };

  const getNextLevelXP = () => {
    const currentXP = user.profile.xp;
    const nextLevelXP = user.profile.xpToNextLevel;
    return nextLevelXP - currentXP;
  };

  const getCurrentLevel = () => {
    const currentXP = user.profile.xp;
    const nextLevelXP = user.profile.xpToNextLevel;
    return Math.floor(currentXP / 100) + 1;
  };

  const getTopGames = () => {
    return Object.entries(user.profile.gameProgress || {})
      .sort(([,a], [,b]) => (b.bestScore || 0) - (a.bestScore || 0))
      .slice(0, 3);
  };

  const getRecentActivity = () => {
    // Safely get recent activity to prevent crashes
    try {
      return user.journeyLog ? user.journeyLog.slice(-5).reverse() : [];
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'skills', label: 'Skills & Mastery', icon: Trophy },
    { id: 'friends', label: 'Friends', icon: Users2 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'ai-insights', label: 'AI Insights', icon: Brain }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-6xl mx-auto pt-32 pb-8 px-4">
        {/* Profile Header */}
        <div className={`backdrop-blur-xl rounded-2xl p-8 mb-8 transition-all duration-500 hover:transform hover:scale-[1.02] ${
          isDarkMode 
            ? 'bg-black/50 border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
            : 'bg-white/90 border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
        }`}>
          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center text-center lg:text-left">
              <div className="relative group">
                <img
                  src={user.profile.avatar}
            alt="Avatar"
                  className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-600 shadow-lg mb-4 transition-all hover:scale-105"
                />
                <div className="absolute -top-2 -left-4 bg-green-500 w-6 h-6 rounded-full border-2 border-white dark:border-gray-600"></div>
                {/* Regenerate Avatar Button */}
                <button
                  onClick={() => setShowAvatarModal(true)}
                  className="absolute bottom-2 right-2 p-2 rounded-full bg-gradient-to-r from-purple-300 to-pink-300 dark:from-purple-600 dark:to-pink-600 text-gray-800 dark:text-white hover:scale-110 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                  title="Regenerate Avatar with AI"
                >
                  <Wand2 className="w-4 h-4" />
                </button>
              </div>
                            <div className="flex items-center gap-2 mb-2">
                {editingUsername ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="text-4xl font-bold text-purple-900 dark:text-white bg-transparent border-b-2 border-purple-300 dark:border-purple-600 focus:outline-none focus:border-purple-500 dark:focus:border-purple-400"
                      autoFocus
                    />
                    <button
                      onClick={handleUsernameSave}
                      disabled={isLoading}
                      className={`p-1 transition-colors ${
                        isLoading 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-green-600 hover:text-green-700 hover:scale-110'
                      }`}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Check className="w-5 h-5" />
                      )}
                    </button>
                                        <button 
                      onClick={handleUsernameCancel}
                      disabled={isLoading}
                      className={`p-1 transition-colors ${
                        isLoading 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-red-600 hover:text-red-700 hover:scale-110'
                      }`}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-bold text-purple-900 dark:text-white">
                      {user.username}
                    </h1>
                    <button
                      onClick={() => setEditingUsername(true)}
                      className="p-1 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-4 items-center mb-4">
                <span className="text-lg font-semibold text-purple-700 dark:text-purple-300">{user.role}</span>
                {user.age && <span className="text-lg text-gray-600 dark:text-gray-400">Age: {user.age}</span>}
              </div>
            </div>

            {/* Stats and Progress */}
            <div className="flex-1 space-y-6">
              {/* Level Progress - Soft Pastel Gradient */}
              <div className="bg-gradient-to-r from-purple-300 to-indigo-300 dark:from-purple-800 dark:to-indigo-800 rounded-xl p-6 text-gray-800 dark:text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Crown className="w-8 h-8 text-amber-500" />
                    <div>
                      <h3 className="text-xl font-bold">{user.profile.rank}</h3>
                      <p className="text-gray-600 dark:text-purple-200">Level Progress</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{user.profile.xp} XP</div>
                    <div className="text-sm text-gray-600 dark:text-purple-200">Next: {getNextLevelXP()} XP</div>
                  </div>
                </div>
                <div className="w-full rounded-full h-4 mb-2 bg-purple-200 dark:bg-purple-900/50">
                  <div 
                    className="rounded-full h-4 transition-all duration-500 bg-gradient-to-r from-amber-300 to-yellow-300 dark:from-amber-400 dark:to-yellow-400"
                    style={{ width: `${getProgressPercentage()}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600 dark:text-purple-200">
                  Current Level: {getCurrentLevel()}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                    : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                }`}>
                  <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900 dark:text-white">{user.profile.stars}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Stars</div>
                </div>
                <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                    : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                }`}>
                  <Trophy className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900 dark:text-white">{Object.keys(user.profile.gameProgress || {}).length}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Games</div>
                </div>
                <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                    : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                }`}>
                  <Users className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900 dark:text-white">{user.friends?.length || 0}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Friends</div>
                </div>
                <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                    : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                }`}>
                  <Clock className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-purple-900 dark:text-white">
                    {Math.round(Object.values(user.profile.gameProgress || {}).reduce((sum, game) => sum + (game.playTime || 0), 0) / 60000)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Minutes</div>
                </div>
              </div>
          </div>
          </div>

          {/* Bio Section */}
          <div className="mt-8">
            {editing ? (
              <div className="space-y-4">
                  <textarea
                  className="w-full p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none"
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={3}
                  placeholder="Tell us about yourself..."
                  />
                  <div className="flex gap-2">
                  <button 
                    className={`px-6 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                      isLoading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-300 to-indigo-300 text-gray-800 hover:from-purple-400 hover:to-indigo-400 dark:from-purple-600 dark:to-indigo-600 dark:text-white hover:scale-105'
                    }`}
                    onClick={handleBioSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button 
                    className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-500 transition-all" 
                    onClick={() => setEditing(false)}
                  >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                </div>
                {bioSaved && <span className="font-semibold text-green-600">Saved!</span>}
                </div>
              ) : (
              <div className={`rounded-xl p-6 transition-all duration-500 hover:transform hover:scale-[1.01] ${
                isDarkMode 
                  ? 'bg-black/50 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                  : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-900 dark:text-white">About Me</h3>
                  <button 
                    className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
                      isLoading
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-300 to-indigo-300 text-gray-800 hover:from-purple-400 hover:to-indigo-400 dark:from-purple-600 dark:to-indigo-600 dark:text-white hover:scale-105'
                    }`}
                    onClick={() => setEditing(true)}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                    {isLoading ? 'Saving...' : 'Edit'}
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 text-lg">
                  {user.profile.about || "No bio yet. Click edit to add one!"}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className={`backdrop-blur-xl rounded-2xl p-4 mb-8 transition-all duration-500 ${
          isDarkMode 
            ? 'bg-black/50 border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)]' 
            : 'bg-white/90 border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)]'
        }`}>
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-300 to-indigo-300 text-gray-800 dark:from-purple-600 dark:to-indigo-600 dark:text-white shadow-lg'
                      : 'bg-white/60 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-white/80 dark:hover:bg-gray-600/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`backdrop-blur-xl rounded-2xl p-8 transition-all duration-500 ${
          isDarkMode 
            ? 'bg-black/50 border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)]' 
            : 'bg-white/90 border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)]'
        }`}>
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-purple-900 dark:text-white mb-6">Overview</h2>
              
              {/* Recent Activity */}
              <div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {getRecentActivity().map((activity, index) => (
                    <div key={index} className={`rounded-xl p-4 flex items-center justify-between transition-all duration-500 hover:transform hover:scale-[1.02] ${
                      isDarkMode 
                        ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                        : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                    }`}>
                      <div>
                        <h4 className="font-semibold text-purple-900 dark:text-white">{activity.title}</h4>
                        <p className="text-gray-600 dark:text-gray-400">{activity.content}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">{activity.date}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-600 font-bold">+{activity.xpEarned} XP</div>
                      </div>
                    </div>
                  ))}
                </div>
                  </div>

              {/* Quick Actions */}
              <div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <button 
                    onClick={() => navigate('/playground')}
                    className="bg-gradient-to-r from-purple-200 to-indigo-200 text-gray-800 dark:from-purple-700 dark:to-indigo-700 dark:text-white p-4 rounded-xl hover:from-purple-300 hover:to-indigo-300 dark:hover:from-purple-600 dark:hover:to-indigo-600 transition-all flex flex-col items-center gap-2"
                  >
                    <Gamepad2 className="w-6 h-6" />
                    <span className="font-semibold">Play Games</span>
                  </button>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-gradient-to-r from-emerald-200 to-teal-200 text-gray-800 dark:from-emerald-700 dark:to-teal-700 dark:text-white p-4 rounded-xl hover:from-emerald-300 hover:to-teal-300 dark:hover:from-emerald-600 dark:hover:to-teal-600 transition-all flex flex-col items-center gap-2"
                  >
                    <BarChart3 className="w-6 h-6" />
                    <span className="font-semibold">Learning Central</span>
                  </button>
                  <button 
                    onClick={() => navigate('/forum')}
                    className="bg-gradient-to-r from-orange-200 to-rose-200 text-gray-800 dark:from-orange-700 dark:to-rose-700 dark:text-white p-4 rounded-xl hover:from-orange-300 hover:to-rose-300 dark:hover:from-orange-600 dark:hover:to-rose-600 transition-all flex flex-col items-center gap-2"
                  >
                    <MessageCircle className="w-6 h-6" />
                    <span className="font-semibold">Forum</span>
                  </button>
                  <button 
                    onClick={() => navigate('/ai-insights')}
                    className="bg-gradient-to-r from-pink-200 to-purple-200 text-gray-800 dark:from-pink-700 dark:to-purple-700 dark:text-white p-4 rounded-xl hover:from-pink-300 hover:to-purple-300 dark:hover:from-pink-600 dark:hover:to-purple-600 transition-all flex flex-col items-center gap-2"
                  >
                    <Brain className="w-6 h-6" />
                    <span className="font-semibold">AI Insights</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'skills' && pedagogicalProfile && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-purple-900 dark:text-white mb-6">Skills & Mastery</h2>
              
              {/* Competency Overview - Using Pedagogical Profile */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Trophy className="w-8 h-8" />
                    <span className="text-3xl font-bold">{pedagogicalProfile.masteredCount}</span>
                  </div>
                  <p className="text-sm opacity-90">Skills Mastered</p>
                </div>

                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Brain className="w-8 h-8" />
                    <span className="text-3xl font-bold">{pedagogicalProfile.overallMastery}%</span>
                  </div>
                  <p className="text-sm opacity-90">Overall Mastery</p>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-8 h-8" />
                    <span className="text-3xl font-bold">{pedagogicalProfile.coursesInProgress.length}</span>
                  </div>
                  <p className="text-sm opacity-90">In Progress</p>
                </div>
              </div>

              {/* Knowledge Strengths */}
              {pedagogicalProfile.strengthAreas.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-green-500" />
                    Your Strengths
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pedagogicalProfile.competencies
                      .filter(c => c.currentLevel >= 70)
                      .sort((a, b) => b.currentLevel - a.currentLevel)
                      .slice(0, 6)
                      .map((comp) => (
                        <div key={comp.competencyId} className={`rounded-xl p-4 transition-all duration-500 hover:transform hover:scale-105 ${
                          isDarkMode 
                            ? 'bg-black/40 backdrop-blur-xl border-2 border-green-500/30' 
                            : 'bg-white/90 backdrop-blur-xl border-2 border-green-500/30'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-purple-900 dark:text-white capitalize">
                              {comp.competencyName}
                            </h4>
                            <span className={`text-lg font-bold ${
                              comp.currentLevel >= 90 ? 'text-green-500' :
                              comp.currentLevel >= 80 ? 'text-blue-500' :
                              'text-yellow-500'
                            }`}>
                              {comp.currentLevel}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                comp.currentLevel >= 90 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                comp.currentLevel >= 80 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                'bg-gradient-to-r from-yellow-500 to-amber-500'
                              }`}
                              style={{ width: `${comp.currentLevel}%` }}
                            />
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                            <span className={`font-medium ${
                              comp.trend === 'improving' ? 'text-green-500' :
                              comp.trend === 'declining' ? 'text-red-500' :
                              'text-gray-500'
                            }`}>
                              {comp.trend === 'improving' ? '↗️ Improving' :
                               comp.trend === 'declining' ? '↘️ Needs attention' :
                               '→ Stable'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {pedagogicalProfile.knowledgeGaps.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-500" />
                    Areas to Practice
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pedagogicalProfile.competencies
                      .filter(c => c.currentLevel < 70)
                      .sort((a, b) => a.currentLevel - b.currentLevel)
                      .slice(0, 6)
                      .map((comp) => (
                        <div key={comp.competencyId} className={`rounded-xl p-4 transition-all duration-500 hover:transform hover:scale-105 ${
                          isDarkMode 
                            ? 'bg-black/40 backdrop-blur-xl border-2 border-orange-500/30' 
                            : 'bg-white/90 backdrop-blur-xl border-2 border-orange-500/30'
                        }`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-purple-900 dark:text-white capitalize">
                              {comp.competencyName}
                            </h4>
                            <span className={`text-lg font-bold ${
                              comp.currentLevel >= 50 ? 'text-orange-500' : 'text-red-500'
                            }`}>
                              {comp.currentLevel}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                comp.currentLevel >= 50 
                                  ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
                                  : 'bg-gradient-to-r from-red-500 to-rose-500'
                              }`}
                              style={{ width: `${comp.currentLevel}%` }}
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              💡 {comp.recommendation === 'review' ? 'Needs review' : 'Keep practicing'}
                            </p>
                            {comp.trend === 'declining' && (
                              <button
                                onClick={() => setSelectedCompetency({ name: comp.competencyName, level: comp.currentLevel })}
                                className="text-xs px-3 py-1 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                              >
                                Get Help
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                  {pedagogicalProfile.knowledgeGaps.length === 0 && (
                    <div className={`rounded-xl p-6 text-center ${
                      isDarkMode 
                        ? 'bg-black/40 backdrop-blur-xl border-2 border-green-500/30' 
                        : 'bg-white/90 backdrop-blur-xl border-2 border-green-500/30'
                    }`}>
                      <Trophy className="w-12 h-12 text-green-500 mx-auto mb-3" />
                      <h4 className="font-bold text-purple-900 dark:text-white mb-2">Excellent Work!</h4>
                      <p className="text-gray-600 dark:text-gray-400">
                        You're doing great across all skills. Keep up the excellent work!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State */}
              {(!pedagogicalProfile || pedagogicalProfile.competencies.length === 0) && (
                <div className={`rounded-xl p-12 text-center ${
                  isDarkMode 
                    ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30' 
                    : 'bg-white/90 backdrop-blur-xl border-2 border-black/10'
                }`}>
                  <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-xl font-bold text-purple-900 dark:text-white mb-2">Start Your Learning Journey</h4>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Complete learning modules to track your skills and see your progress!
                  </p>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all"
                  >
                    Explore Courses
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'friends' && (
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-purple-900 dark:text-white mb-6">Friends & Chat</h2>
              
              {/* Enhanced Friends System */}
              <FriendsSystem />
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-purple-900 dark:text-white mb-6">Activity Log</h2>
              
              {/* Journey Log */}
              <div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Learning Journey
                </h3>
                <div className="space-y-4">
                  {user.journeyLog && user.journeyLog.length > 0 ? (
                    user.journeyLog.map((entry, index) => (
                      <div key={index} className={`rounded-xl p-6 transition-all duration-500 hover:transform hover:scale-105 ${
                        isDarkMode 
                          ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                          : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-bold text-purple-900 dark:text-white mb-2">{entry.title}</h4>
                            <p className="text-gray-700 dark:text-gray-300 mb-3">{entry.content}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">{entry.date}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-green-600 font-bold text-lg">+{entry.xpEarned} XP</div>
                            <div className="text-sm text-gray-500">Earned</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No activity yet. Start playing games to see your journey!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Statistics
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                      : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                  }`}>
                    <div className="text-3xl font-bold text-purple-600">{user.journeyLog ? user.journeyLog.length : 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Activities</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                      : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                  }`}>
                    <div className="text-3xl font-bold text-blue-600">
                      {user.journeyLog ? user.journeyLog.reduce((sum, entry) => sum + entry.xpEarned, 0) : 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total XP Earned</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                      : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                  }`}>
                    <div className="text-3xl font-bold text-green-600">
                      {Object.keys(user.profile.gameProgress || {}).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Games Played</div>
                  </div>
                  <div className={`rounded-xl p-4 text-center transition-all duration-500 hover:transform hover:scale-105 ${
                    isDarkMode 
                      ? 'bg-black/40 backdrop-blur-xl border-2 border-white/30 shadow-[0_8px_16px_-12px_rgba(255,255,255,0.08)] hover:shadow-[0_12px_24px_-12px_rgba(255,255,255,0.12)]' 
                      : 'bg-white/90 backdrop-blur-xl border-2 border-black/10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_60px_-12px_rgba(0,0,0,0.35)]'
                  }`}>
                    <div className="text-3xl font-bold text-yellow-600">
                      {Math.round(Object.values(user.profile.gameProgress || {}).reduce((sum, game) => sum + (game.playTime || 0), 0) / 60000)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Minutes Played</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-insights' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-purple-900 dark:text-white mb-6">AI Cognitive Assessment</h2>
              
              {/* Comprehensive AI Assessment Report */}
              <AIAssessmentReport />

              {/* AI Assistant - Note: Global AI Assistant is available via the floating button */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-purple-900 dark:text-white mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  AI Assistant
                </h3>
                <div className="p-4 bg-purple-50 dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-gray-700">
                  <p className="text-purple-700 dark:text-purple-300 text-sm">
                    Your AI assistant is available via the floating button in the bottom-right corner of the screen. 
                    Click the purple brain icon to start chatting about your cognitive assessment! 🧠✨
                  </p>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>

      {/* Avatar Generation Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`max-w-2xl w-full rounded-2xl p-8 ${
            isDarkMode 
              ? 'bg-gray-900 border-2 border-purple-500/30' 
              : 'bg-white border-2 border-purple-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-purple-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-6 h-6" />
                Generate AI Avatar
              </h3>
              <button
                onClick={() => {
                  setShowAvatarModal(false);
                  setGeneratedAvatarUrl('');
                  setAvatarPrompt('');
                  setError(null);
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Describe your avatar
                </label>
                <textarea
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  placeholder="e.g., cartoon style, friendly robot, blue and purple colors..."
                  className="w-full p-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-purple-400 dark:focus:border-purple-500 focus:outline-none resize-none"
                  rows={3}
                  disabled={isGeneratingAvatar}
                />
              </div>

              {generatedAvatarUrl && (
                <div className="flex justify-center">
                  <img
                    src={generatedAvatarUrl}
                    alt="Generated Avatar"
                    className="w-48 h-48 rounded-full border-4 border-purple-300 dark:border-purple-600 shadow-xl"
                  />
                </div>
              )}

              <div className="flex gap-3">
                {!generatedAvatarUrl ? (
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={isGeneratingAvatar || !avatarPrompt.trim()}
                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                      isGeneratingAvatar || !avatarPrompt.trim()
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-300 to-pink-300 dark:from-purple-600 dark:to-pink-600 text-gray-800 dark:text-white hover:scale-105 shadow-lg'
                    }`}
                  >
                    {isGeneratingAvatar ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Avatar
                      </>
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleApplyAvatar}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600 text-gray-800 dark:text-white hover:scale-105 transition-all shadow-lg"
                    >
                      <Check className="w-5 h-5" />
                      Apply Avatar
                    </button>
                    <button
                      onClick={() => {
                        setGeneratedAvatarUrl('');
                        setAvatarPrompt('');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                      <Wand2 className="w-5 h-5" />
                      Try Again
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Competency Help Modal */}
      {selectedCompetency && pedagogicalProfile && (
        <CompetencyHelpModal
          competencyName={selectedCompetency.name}
          currentLevel={selectedCompetency.level}
          courseContext={selectedCompetency.name}
          strengthAreas={pedagogicalProfile.strengthAreas}
          onClose={() => setSelectedCompetency(null)}
          onComplete={(improvement) => {
            console.log(`Improved by ${improvement}%!`);
            loadPedagogicalProfile();
            setSelectedCompetency(null);
          }}
        />
      )}

    </div>
  );
};

export default ProfilePage; 