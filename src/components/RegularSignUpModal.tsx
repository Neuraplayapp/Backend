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
      const result = await api.image.generate(avatarPrompt);
      
      if (result.data) {
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
      title=""
      revealType="fade"
      duration={0.4}
      showCloseButton={true}
      modalClassName="!max-w-5xl !max-h-[96vh] !overflow-hidden"
    >
      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 h-full -m-3 sm:-m-4 md:-m-6">
        {/* Left Side - Sign Up Form */}
        <div className={`p-6 lg:p-8 flex flex-col overflow-y-auto max-h-[85vh] ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50/50'}`}>
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="mb-6">
              <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-violet-600' : 'text-violet-500'}`}>
                Create Account
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-white' : 'text-black'}`}>
                Join <span className="font-semibold">Neuraplay</span> and unlock your child's full potential.
              </p>
            </div>

            {/* Sign Up Form */}
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3">
              {/* Role Selection */}
              <div>
                <label className={`block font-bold mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['learner', 'parent'].map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, role })}
                      className={`p-2 rounded-full font-semibold text-sm transition-all border-2 ${
                        formData.role === role
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                          : isDarkMode 
                            ? 'bg-gray-700/50 border-gray-600 text-white hover:border-violet-400 hover:bg-gray-600/50'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-violet-400 hover:bg-gray-50'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Selector for Learners */}
              {formData.role === 'learner' && (
                <div>
                  <label className={`block font-bold mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Learner's age
                  </label>
                  <select
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                    }`}
                  >
                    <option value={4} className={isDarkMode ? "bg-slate-800" : "bg-white"}>3-5 years</option>
                    <option value={7} className={isDarkMode ? "bg-slate-800" : "bg-white"}>6-8 years</option>
                    <option value={10} className={isDarkMode ? "bg-slate-800" : "bg-white"}>9-12 years</option>
                  </select>
                </div>
              )}

              {/* Username Input */}
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                  }`}
                  required
                />
              </div>

              {/* Email Input */}
              <div>
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                  }`}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 pr-12 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Confirm Password Input */}
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 pr-12 ${
                    isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${
                    isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Password Hint */}
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Password must be at least 6 characters long
              </p>

              {/* Avatar Section */}
              <div>
                <label className={`block font-bold mb-2 text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <Sparkles className="w-4 h-4" />
                  Choose your hero avatar
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Describe your avatar (e.g. brave robot)"
                    value={avatarPrompt}
                    onChange={(e) => setAvatarPrompt(e.target.value)}
                    className={`flex-1 px-5 py-3 rounded-full border transition-all focus:outline-none focus:ring-2 ${
                      isDarkMode
                        ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:ring-violet-500/50'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-violet-500/30'
                    }`}
                    disabled={generatingAvatar}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAvatar}
                    disabled={generatingAvatar || !avatarPrompt.trim()}
                    className="px-4 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold rounded-full hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 whitespace-nowrap"
                  >
                    {generatingAvatar ? 'Generating...' : 'Generate'}
                  </button>
                </div>
                {avatarError && <div className="text-red-400 text-xs mb-2">{avatarError}</div>}

                {/* Avatar Preview */}
                {generatingAvatar && (
                  <div className="flex justify-center mb-3">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-4 border-violet-400/30 animate-pulse"></div>
                      <div className="absolute inset-2 rounded-full border-2 border-violet-400/50 animate-spin" style={{ animationDuration: '3s' }}></div>
                      <div className="absolute inset-4 rounded-full border border-purple-400/70 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
                      <div className="absolute inset-8 rounded-full bg-gradient-to-br from-violet-400/20 to-purple-400/20 animate-pulse">
                        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-violet-400/40 to-purple-400/40 animate-spin" style={{ animationDuration: '1.5s' }}></div>
                      </div>
                    </div>
                  </div>
                )}

                {!generatingAvatar && formData.avatar && (formData.avatar !== '/assets/placeholder.png' || formData.avatar.startsWith('data:')) && (
                  <div className="flex justify-center mb-3">
                    <img
                      src={formData.avatar}
                      alt="Avatar Preview"
                      className="w-20 h-20 rounded-full border-4 border-blue-400 shadow-lg"
                    />
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                  <p className="text-red-500 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
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
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-full hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {isLoading ? 'Creating Account...' : 'Create Premium Account'}
              </button>
            </form>

            {/* Sign In Link */}
            <p className={`text-center text-sm mt-4 ${isDarkMode ? 'text-gray-400' : 'text-black'}`}>
              Already have an account?{' '}
              <button
                onClick={() => {
                  onClose();
                  onShowLogin?.();
                }}
                className="text-violet-600 hover:text-violet-700 font-semibold transition-colors"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Right Side - Illustration */}
        <div className={`hidden lg:flex flex-col items-center justify-center p-8 relative ${
          isDarkMode ? 'bg-gradient-to-br from-green-900/20 to-teal-900/20' : 'bg-gradient-to-br from-green-50 to-teal-50'
        }`}>
          {/* Mascot Image */}
          <div className="relative w-full max-w-sm mb-6">
            <img
              src="/assets/images/Mascot.png"
              alt="Neuraplay Mascot"
              className="w-full h-auto object-contain drop-shadow-2xl"
            />

            {/* Decorative floating elements */}
            <div className="absolute top-10 left-10 w-12 h-12 rounded-full bg-green-400/20 animate-pulse"></div>
            <div className="absolute bottom-16 right-10 w-10 h-10 rounded-full bg-teal-400/20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute top-1/2 left-5 w-8 h-8 rounded-full bg-blue-400/20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          </div>

          {/* Bottom Text */}
          <div className="text-center">
            <p className={`text-base font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Unlock Your Child's Potential
            </p>
            <p className={`text-lg font-bold mt-1 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              Start Learning with Neuraplay
            </p>
          </div>
        </div>
      </div>
    </ModalReveal>
  );  
};

export default RegularSignUpModal;
