import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNavigate } from 'react-router-dom';
import ModalReveal from './ModalReveal';
import { User, Mail, Users, Sparkles, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

interface RegularSignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onShowLogin?: () => void;
}

const RegularSignUpModal: React.FC<RegularSignUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onShowLogin
}) => {
  const { setUser } = useUser();
  // const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    age: 5,
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    avatar: '/assets/placeholder.png'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarPrompt, setAvatarPrompt] = useState('');
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [generatedAvatars, setGeneratedAvatars] = useState<string[]>([]);
  const { isDarkMode } = useTheme();

  const handleSubmit = async () => {
    if (!formData.role || !formData.username.trim() || !formData.email.trim() || !formData.password || !formData.confirmPassword) {
      setError('Please fill out all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Call stubbed registration API
      const result = await api.auth.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: formData.role as 'learner' | 'parent' | 'admin',
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
      });

      if (result.user) {
        setUser(result.user);
        onSuccess?.();
        // navigate('/forum');
        onClose();
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
      
      // Call stubbed image generation API
      const result = await api.image.generate(avatarPrompt);
      
      if (result.data) {
        // Handle both base64 string and data URL formats
        const imageBlob = result.data.startsWith('data:') 
          ? result.data 
          : `data:${result.contentType || 'image/png'};base64,${result.data}`;
        
        console.log('Generated avatar blob length:', imageBlob.length);
        setGeneratedAvatars(prev => [...prev, imageBlob]);
        setFormData({ ...formData, avatar: imageBlob });
      } else {
        console.error('No image data in response:', result);
        setAvatarError(result.error || 'Failed to generate avatar. Please try again.');
      }
    } catch (error) {
      console.error('Avatar generation error:', error);
      setAvatarError(`Error generating avatar: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    } finally {
      setGeneratingAvatar(false);
    }
  };

  return (
    <ModalReveal
      isOpen={isOpen}
      onClose={onClose}
      title="Join NeuraPlay Community"
      revealType="letter"
      typewriterEffect={true}
      cursorBlink={true}
      stagger={0.08}
      duration={1.2}
      delay={0.3}
    >
      <div className="space-y-2 sm:space-y-3 md:space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Header with mascot */}
        <div className="text-center mb-2 sm:mb-3 md:mb-4">
          <div className="flex items-center justify-center mb-2 sm:mb-2.5 md:mb-3">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain"
            />
          </div>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-theme-primary mb-0.5 sm:mb-1">Join Our Community</h2>
          <p className="text-theme-secondary text-xs sm:text-sm">Create your free account and start your learning journey</p>
        </div>
  
        {/* Sign Up Form */}
        <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
          <div>
            <label className="block font-bold mb-1 sm:mb-1.5 md:mb-2 text-theme-primary text-xs sm:text-sm md:text-base">I am a...</label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {['learner', 'parent'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`p-1.5 sm:p-2 rounded-lg font-semibold text-xs sm:text-sm transition-all border-2 ${
                    formData.role === role
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                     : 'bg-white/30 text-gray-700 border-gray-300 hover:border-violet-500 hover:bg-white/40'                  
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>
  
          {formData.role === 'learner' && (
            <div>
              <label className="block font-bold mb-0.5 sm:mb-1 text-theme-primary text-xs sm:text-sm md:text-base">Learner's age</label>
              <select
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className={`w-full p-1.5 sm:p-2 rounded-lg border focus:ring-2 focus:ring-violet-400/20 text-xs sm:text-sm transition-all ${
                  isDarkMode
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
              >
                <option value={4}>3-5 years</option>
                <option value={7}>6-8 years</option>
                <option value={10}>9-12 years</option>
              </select>
            </div>
          )}
  
          <div>
            <label className="font-bold mb-0.5 sm:mb-1 text-theme-primary text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <User className="w-3 h-3 sm:w-4 sm:h-4" />
              Username
            </label>
            <input
              type="text"
              placeholder="Create a unique username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`w-full p-1.5 sm:p-2 rounded-lg border focus:ring-2 focus:ring-violet-400/20 transition-all text-xs sm:text-sm ${
                isDarkMode
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
              }`}
              required
            />
          </div>
  
          <div>
            <label className="font-bold mb-0.5 sm:mb-1 text-theme-primary text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Mail className="w-3 h-3 sm:w-4 sm:h-4" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full p-1.5 sm:p-2 rounded-lg border focus:ring-2 focus:ring-violet-400/20 transition-all text-xs sm:text-sm ${
                isDarkMode
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
              }`}
              required
            />
          </div>
  
          <div>
            <label className="font-bold mb-0.5 sm:mb-1 text-theme-primary text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full p-1.5 sm:p-2 pr-8 sm:pr-10 rounded-lg border focus:ring-2 focus:ring-violet-400/20 transition-all text-xs sm:text-sm ${
                  isDarkMode
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
              </button>
            </div>
            <p className="mt-0.5 sm:mt-1 text-theme-secondary text-[10px] sm:text-xs">Password must be at least 6 characters long</p>
          </div>
  
          <div>
            <label className="font-bold mb-0.5 sm:mb-1 text-theme-primary text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className={`w-full p-1.5 sm:p-2 pr-8 sm:pr-10 rounded-lg border focus:ring-2 focus:ring-violet-400/20 transition-all text-xs sm:text-sm ${
                  isDarkMode
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1.5 sm:right-2 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" /> : <Eye className="w-3 h-3 sm:w-4 sm:h-4" />}
              </button>
            </div>
          </div>
  
          {/* Avatar Section */}
          <div>
            <h4 className="font-bold mb-1.5 sm:mb-2 md:mb-3 text-theme-primary text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 md:gap-2">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              Choose your hero avatar
            </h4>
            <div className="flex gap-1.5 sm:gap-2 mb-2 sm:mb-2.5 md:mb-3">
              <input
                type="text"
                placeholder="Describe your avatar (e.g. brave robot, magical cat)"
                value={avatarPrompt}
                onChange={(e) => setAvatarPrompt(e.target.value)}
                className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border focus:ring-2 focus:ring-violet-400/20 transition-all text-xs sm:text-sm ${
                  isDarkMode
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
                disabled={generatingAvatar}
              />
              <button
                type="button"
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar || !avatarPrompt.trim()}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 text-xs sm:text-sm whitespace-nowrap"
              >
                {generatingAvatar ? 'Generating...' : 'Generate'}
              </button>
            </div>
            {avatarError && <div className="text-red-400 text-[10px] sm:text-xs mb-2 sm:mb-2.5 md:mb-3">{avatarError}</div>}
  
            {/* Avatar Preview */}
            {generatingAvatar && (
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
                  <div className="absolute inset-0 rounded-full border-4 border-violet-400/30 animate-pulse"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-violet-400/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                  <div className="absolute inset-4 rounded-full border border-purple-400/70 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                  <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-400/20 animate-pulse">
                    <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-400/40 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                  </div>
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
              <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
                <img
                  src={formData.avatar}
                  alt="Avatar Preview"
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full border-2 sm:border-3 md:border-4 border-blue-400 shadow-lg"
                />
              </div>
            )}
          </div>
  
          {error && (
            <div className="p-2 sm:p-3 md:p-4 bg-red-500/10 border border-red-500/20 rounded-lg sm:rounded-xl text-red-500 text-xs sm:text-sm">
              {error}
            </div>
          )}
  
  <button
  type="submit"
  disabled={
    isLoading ||
    !formData.role ||
    !formData.username.trim() ||
    !formData.email.trim() ||
    !formData.password ||
    !formData.confirmPassword
  }
  className={`w-full text-white font-semibold px-4 py-2 rounded-lg sm:rounded-xl
    bg-gradient-to-r from-violet-600 to-purple-600
    hover:from-violet-700 hover:to-purple-700
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-transform duration-200 transform hover:scale-105
    flex items-center justify-center gap-2 text-sm sm:text-base shadow-md`}
>
  {isLoading ? (
    <div className="flex items-center gap-2">
      <div className="w-3.2 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      <span>Creating Account...</span>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <Users className="w-3.2 h-3.2" />
      Join Community
    </div>
  )}
</button>
        </div>
  
        {/* Additional Info */}
        <div className="text-center pt-1 sm:pt-2">
          <p className="text-theme-secondary text-[10px] sm:text-xs">
            Already have an account?{' '}
            <button
              onClick={() => {
                onClose();
                onShowLogin?.();
              }}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </ModalReveal>
  );  
};

export default RegularSignUpModal; 