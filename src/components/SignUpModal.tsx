import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import ModalReveal from './ModalReveal';
import { UserPlus, User, Mail, Lock, Eye, EyeOff, Crown, Star, Zap, Brain, Trophy, Gift } from 'lucide-react';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
  onShowLogin?: () => void;
}

const SignUpModal: React.FC<SignUpModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectTo = '/dashboard',
  onShowLogin
}) => {
  const { setUser } = useUser();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: '',
    age: 5,
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

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
            avatar: '/assets/images/Mascot.png',
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
        onSuccess?.();
        navigate(redirectTo);
        onClose();
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const premiumFeatures = [
    {
      icon: <Brain className="w-6 h-6 text-purple-400" />,
      title: "AI-Powered Learning",
      description: "Personalized cognitive development plans"
    },
    {
      icon: <Trophy className="w-6 h-6 text-yellow-400" />,
      title: "Advanced Games",
      description: "Access to premium cognitive training games"
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-400" />,
      title: "Real-time Analytics",
      description: "Detailed progress tracking and insights"
    },
    {
      icon: <Star className="w-6 h-6 text-pink-400" />,
      title: "Expert Support",
      description: "Direct access to child development experts"
    }
  ];

  return (
    <ModalReveal
      isOpen={isOpen}
      onClose={onClose}
      title="Join NeuraPlay Premium"
      revealType="letter"
      typewriterEffect={true}
      cursorBlink={true}
      stagger={0.08}
      duration={1.2}
      delay={0.3}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Header with mascot */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-3">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <h2 className={`text-xl font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Unlock Your Child's Potential</h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>Join thousands of families already transforming learning</p>
        </div>

        {/* Premium Features Preview */}
        <div className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 rounded-xl p-3 border border-violet-400/30">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span className={`font-semibold text-sm ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>Premium Features Included</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {premiumFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {feature.icon}
                <div>
                  <div className={`font-medium text-xs ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>{feature.title}</div>
                  <div className={`text-xs leading-tight ${
                    isDarkMode ? 'text-white/60' : 'text-gray-600'
                  }`}>{feature.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={`block font-bold mb-2 text-base ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>I am a...</label>
            <div className="grid grid-cols-2 gap-2">
              {['learner', 'parent'].map(role => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`p-2 rounded-lg font-semibold text-sm transition-all border-2 ${
                    formData.role === role
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white border-violet-600 shadow-lg'
                      : isDarkMode 
                        ? 'bg-white/10 text-gray-300 border-white/20 hover:border-violet-400 hover:bg-white/20'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:border-violet-400 hover:bg-gray-200'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {formData.role === 'learner' && (
            <div>
              <label className={`block font-bold mb-1 text-base ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Learner's age</label>
              <select
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className={`w-full p-2 rounded-lg border focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm ${
                  isDarkMode 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'bg-gray-50 border-gray-300 text-gray-900'
                }`}
              >
                <option value={4} className={isDarkMode ? "bg-slate-800" : "bg-white"}>3-5 years</option>
                <option value={7} className={isDarkMode ? "bg-slate-800" : "bg-white"}>6-8 years</option>
                <option value={10} className={isDarkMode ? "bg-slate-800" : "bg-white"}>9-12 years</option>
              </select>
            </div>
          )}

          <div>
            <label className={`block font-bold mb-1 text-base flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <User className="w-4 h-4" />
              Username
            </label>
            <input
              type="text"
              placeholder="Create a unique username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`w-full p-2 rounded-lg border focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm ${
                isDarkMode 
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block font-bold mb-1 text-base flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full p-2 rounded-lg border focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm ${
                isDarkMode 
                  ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' 
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block font-bold mb-1 text-base flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Lock className="w-4 h-4" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full p-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-colors ${
                  isDarkMode 
                    ? 'text-white/60 hover:text-white' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className={`block font-bold mb-1 text-base flex items-center gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Lock className="w-4 h-4" />
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full p-2 pr-10 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-400/20 transition-all text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 transition-colors ${
                  isDarkMode 
                    ? 'text-white/60 hover:text-white' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-2">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formData.role || !formData.username || !formData.email || !formData.password || !formData.confirmPassword}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-6 py-3 rounded-lg hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-base flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Premium Account
              </>
            )}
          </button>
        </form>

        {/* Additional Info */}
        <div className="text-center space-y-2">
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-3 border border-yellow-400/30">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-yellow-400" />
              <span className={`font-semibold text-sm ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Free Trial Available</span>
            </div>
            <p className={`text-xs ${
              isDarkMode ? 'text-white/80' : 'text-gray-600'
            }`}>Start with a 7-day free trial. Cancel anytime.</p>
          </div>
          
          <p className={`text-xs ${
            isDarkMode ? 'text-white/60' : 'text-gray-600'
          }`}>
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

export default SignUpModal; 