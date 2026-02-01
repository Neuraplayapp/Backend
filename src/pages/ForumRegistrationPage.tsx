import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { Users, Crown, Star, Zap, Brain, Trophy, Gift, ArrowRight } from 'lucide-react';
import LetterReveal from '../components/LetterReveal';

const ForumRegistrationPage: React.FC = () => {
  const { setUser } = useUser();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    age: 5,
    username: '',
    email: '',
    password: '',
    avatar: '/assets/placeholder.png'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!formData.role || !formData.username.trim() || !formData.email.trim() || !formData.password) {
      setError('Please fill out all required fields.');
      return;
    }
    
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    setError('');

    setIsLoading(true);
    try {
      // Call backend registration API
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          age: formData.role === 'learner' ? formData.age : undefined,
          profile: {
            avatar: formData.avatar,
            rank: 'New Learner',
            xp: 0,
            xpToNextLevel: 100,
            stars: 0,
            about: '',
            gameProgress: {}
          }
        })
      });

      const result = await response.json();

      if (response.ok && result.user) {
        setUser(result.user);
        navigate('/forum');
      } else {
        console.error('Registration failed:', result.message);
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error during registration. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      setAvatarError('Please enter a description for your avatar.');
      return;
    }
    setGeneratingAvatar(true);
    setAvatarError('');
    
    try {
      console.log('Generating avatar with prompt:', avatarPrompt);
      
      // Use the AI service with tool calling to generate avatar
      const { aiService } = await import('../services/AIService');
      
      const response = await aiService.sendMessage(
        `Generate an avatar image: ${avatarPrompt}. Make it child-friendly, colorful, and suitable as a profile picture.`,
        {
          user: { id: 'forum-registration' },
          capabilities: { imageGeneration: true, toolCalling: true }
        },
        true // Enable tool calling
      );
      
      console.log('Avatar generation AI response:', response);
      
      // Extract image from tool results
      let imageData = null;
      if (response.tool_results && response.tool_results.length > 0) {
        const imageResult = response.tool_results.find(r => r.data?.image_url);
        if (imageResult) {
          imageData = imageResult.data.image_url;
        }
      }
      
      if (!imageData) {
        throw new Error('No image generated from AI response');
      }
      
      // Create result object matching expected format  
      const result = {
        data: imageData,
        contentType: 'image/png'
      };
      
      console.log('Avatar generation result:', result);
      
      if (result.data) {
        // The image data is already a data URL from the tool result
        console.log('Generated avatar URL length:', result.data.length);
        setGeneratedAvatars(prev => [...prev, result.data]);
        setFormData({ ...formData, avatar: result.data });
      } else {
        console.error('No image data in response:', result);
        setAvatarError('Failed to generate avatar. Please try again.');
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      setAvatarError(`Error generating avatar: ${error.message}. Please try again.`);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const avatars = [
    ...generatedAvatars
  ];

  return (
    <div className={`min-h-screen py-24 px-6 text-theme-primary ${
      isDarkMode 
        ? 'bg-gradient-to-br from-blue-900 via-blue-800 to-cyan-800'
        : 'bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100'
    }`}>
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-8">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className={`text-4xl md:text-5xl font-bold tracking-tight mb-4 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Sign up to the NeuraPlay Forum</h1>
          <LetterReveal 
            text="Create your free account and start your learning journey"
            className={`text-xl ${isDarkMode ? 'text-violet-300' : 'text-gray-900'}`}
            delay={0.5}
            stagger={0.03}
            duration={0.4}
            typewriterEffect={true}
            cursorBlink={false}
          />
        </div>

        <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="space-y-6">
            <div>
              <label className="block font-bold mb-4 text-lg text-theme-primary">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                {['learner', 'parent'].map(role => (
                  <button
                    key={role}
                    onClick={() => setFormData({ ...formData, role })}
                                         className={`p-6 rounded-xl font-semibold text-lg transition-all border-2 ${
                       formData.role === role
                         ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                         : 'bg-white/10 text-theme-primary border-white/20 hover:border-violet-400 hover:bg-white/20'
                     }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {formData.role === 'learner' && (
              <div>
                <label className="block font-bold mb-4 text-lg text-theme-primary">Learner's age</label>
                <select
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                  className={`w-full p-4 rounded-xl bg-white/10 border border-white/20 ${isDarkMode ? 'text-white' : 'text-gray-900'} focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
                >
                  <option value={4} className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>3-5 years</option>
                  <option value={7} className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>6-8 years</option>
                  <option value={10} className={isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-gray-900'}>9-12 years</option>
                </select>
              </div>
            )}

            <div>
              <label className="block font-bold mb-4 text-lg text-theme-primary">Username</label>
              <input
                type="text"
                placeholder="Create a unique username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                  className={`w-full p-4 rounded-xl bg-white/10 border border-white/20 ${isDarkMode ? 'text-white' : 'text-gray-900'} placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
              />
            </div>

            <div>
              <label className="block font-bold mb-4 text-theme-primary text-lg">Email</label>
              <input
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full p-4 rounded-xl bg-white/10 border border-white/20 ${isDarkMode ? 'text-white' : 'text-gray-900'} placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
              />
            </div>

            <div>
              <label className="block font-bold mb-4 text-theme-primary text-lg">Password</label>
              <input
                type="password"
                placeholder="Create a secure password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full p-4 rounded-xl bg-white/10 border border-white/20 ${isDarkMode ? 'text-white' : 'text-gray-900'} placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
              />
              <p className="mt-2 text-sm text-theme-secondary">Password must be at least 6 characters long</p>
            </div>

            <div>
              <h4 className="font-bold mb-4 text-theme-primary text-lg">Choose your hero avatar</h4>
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  value={avatarPrompt}
                  onChange={e => setAvatarPrompt(e.target.value)}
                  placeholder="Describe your avatar (e.g. brave robot, magical cat)"
                  className={`flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 ${isDarkMode ? 'text-white' : 'text-gray-900'} placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all`}
                  disabled={generatingAvatar}
                />
                <button
                  type="button"
                  onClick={handleGenerateAvatar}
                  disabled={generatingAvatar || !avatarPrompt.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                >
                  {generatingAvatar ? 'Generating...' : 'Generate'}
                </button>
              </div>
              {avatarError && <div className="text-red-400 text-sm mb-4">{avatarError}</div>}
                  
                  {/* Avatar Preview - Only show when generating or when avatar is selected */}
                  {generatingAvatar && (
                    <div className="flex justify-center mb-6">
                      <div className="relative w-32 h-32">
                        {/* Outer force field ring */}
                        <div className="absolute inset-0 rounded-full border-4 border-violet-400/30 animate-pulse"></div>
                        {/* Middle force field ring */}
                        <div className="absolute inset-2 rounded-full border-2 border-violet-400/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                        {/* Inner force field ring */}
                        <div className="absolute inset-4 rounded-full border border-violet-400/70 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                        {/* Central energy core */}
                        <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-400/20 animate-pulse">
                          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-400/40 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                        </div>
                        {/* Energy particles */}
                        <div className="absolute inset-0 rounded-full">
                          <div className="absolute top-2 left-1/2 w-1 h-1 bg-violet-400 rounded-full animate-ping"></div>
                          <div className="absolute bottom-2 left-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
                          <div className="absolute left-2 top-1/2 w-1 h-1 bg-violet-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
                          <div className="absolute right-2 top-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '1.5s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {!generatingAvatar && formData.avatar && (formData.avatar !== '/assets/placeholder.png' || formData.avatar.startsWith('data:')) && (
                    <div className="flex justify-center mb-6">
                      <img
                        src={formData.avatar}
                        alt="Avatar Preview"
                        className="w-32 h-32 rounded-full border-4 border-violet-400 shadow-lg"
                      />
                    </div>
                  )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading || !formData.role || !formData.username.trim() || !formData.email.trim() || !formData.password}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-lg flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </div>
        </div>

        {/* Premium Trial Section */}
        <div className="mt-12 bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-2xl p-8 border border-violet-400/30">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Crown className="w-8 h-8 text-yellow-400" />
                              <h3 className="text-2xl font-bold text-theme-primary">Unlock Premium Features</h3>
            </div>
            <p className="text-theme-secondary text-lg">Start your 7-day free trial and experience the full NeuraPlay potential</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 lg:gap-12 mb-8 max-w-4xl mx-auto">
            <div className="space-y-6 lg:space-y-8">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-purple-400" />
                <div>
                  <div className="text-theme-primary font-semibold">AI-Powered Learning</div>
                  <div className={`text-sm ${isDarkMode ? 'text-violet-300' : 'text-gray-700'}`}>Personalized cognitive development plans</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-400" />
                <div>
                  <div className="text-theme-primary font-semibold">Advanced Games</div>
                  <div className={`text-sm ${isDarkMode ? 'text-violet-300' : 'text-gray-700'}`}>Access to premium cognitive training games</div>
                </div>
              </div>
            </div>
            <div className="space-y-6 lg:space-y-8">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-blue-400" />
                <div>
                  <div className="text-theme-primary font-semibold">Real-time Analytics</div>
                  <div className={`text-sm ${isDarkMode ? 'text-violet-300' : 'text-gray-700'}`}>Detailed progress tracking and insights</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star className="w-6 h-6 text-pink-400" />
                <div>
                  <div className="text-theme-primary font-semibold">Expert Support</div>
                  <div className={`text-sm ${isDarkMode ? 'text-violet-300' : 'text-gray-700'}`}>Direct access to child development experts</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-400/30 mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-yellow-400" />
                              <span className="text-theme-primary font-semibold">7-Day Free Trial</span>
            </div>
                          <p className="text-theme-secondary text-center text-sm">Start free, cancel anytime. No commitment required.</p>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/registration')}
              className="bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-8 py-4 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg text-lg flex items-center justify-center gap-2 mx-auto"
            >
              Start Premium Trial
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-theme-secondary text-sm mt-3">Join thousands of families already transforming learning</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumRegistrationPage;