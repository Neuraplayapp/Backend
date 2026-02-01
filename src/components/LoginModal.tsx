import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { useTheme } from '../contexts/ThemeContext';
import ModalReveal from './ModalReveal';
import ForgotPasswordModal from './ForgotPasswordModal';
import { LogIn, User, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
  onShowRegistration?: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  redirectTo = '/dashboard',
  onShowRegistration
}) => {
  const { setUser } = useUser();
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Clear any existing user data before authentication attempt
      setUser(null);
      localStorage.removeItem('neuraplay_user');

      // Call authentication API
      const result = await api.auth.login(
        formData.email.toLowerCase(),
        formData.password
      );

      if (result.user) {
        // Check if user needs to verify their email
        if (!result.user.isVerified) {
          setError('Please verify your email address before logging in. Check your inbox for a verification link.');
          return;
        }

        setUser(result.user);
        onSuccess?.();
        onClose();
      } else {
        setError(result.message || 'Invalid email or password. Please check your credentials or create a new account.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
    <ModalReveal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome Back to NeuraPlay"
      revealType="letter"
      typewriterEffect={true}
      cursorBlink={true}
      stagger={0.08}
      duration={1.2}
      delay={0.3}
    >
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header with mascot */}
        <div className="text-center mb-3 sm:mb-4 md:mb-6">
          <div className="flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
            <img 
              src="/assets/images/Mascot.png" 
              alt="NeuraPlay Mascot" 
              className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain"
            />
          </div>
          <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>Sign In to Your Account</h2>
          <p className={`text-xs sm:text-sm md:text-base ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>Continue your learning journey with NeuraPlay</p>
        </div>

        {/* Important Notice */}
        <div className={`rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 border ${
          isDarkMode 
            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/30'
            : 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-300/50'
        }`}>
          <div className="text-center">
            <p className={`text-xs sm:text-sm font-medium ${
              isDarkMode ? 'text-amber-200' : 'text-amber-800'
            }`}>
              ✉️ Email verification is now required
            </p>
            <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 ${
              isDarkMode ? 'text-amber-300/80' : 'text-amber-700'
            }`}>
              Please verify your email address after signing up to access all features.
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6">
          <div>
            <label className={`font-bold mb-1.5 sm:mb-2 md:mb-3 text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
              Email Address
            </label>
                          <input
                type="email"
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full p-2.5 sm:p-3 md:p-4 text-sm sm:text-base rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-violet-400/20 transition-all ${
                  isDarkMode 
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
                autoComplete="email"
                required
            />
          </div>

          <div>
            <label className={`font-bold mb-1.5 sm:mb-2 md:mb-3 text-sm sm:text-base md:text-lg flex items-center gap-1.5 sm:gap-2 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full p-2.5 sm:p-3 md:p-4 pr-10 sm:pr-12 text-sm sm:text-base rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-violet-400/20 transition-all ${
                  isDarkMode 
                    ? 'bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-violet-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                  isDarkMode 
                    ? 'text-white/60 hover:text-white'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4">
              <p className="text-red-400 text-xs sm:text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !formData.email || !formData.password}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold px-4 sm:px-6 md:px-8 py-2.5 sm:py-3 md:py-4 rounded-lg sm:rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 shadow-lg text-sm sm:text-base md:text-lg flex items-center justify-center gap-1.5 sm:gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span className="hidden xs:inline">Signing In...</span>
                <span className="xs:hidden">Loading...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Additional Info */}
        <div className="text-center space-y-3 sm:space-y-4">
          {/* Forgot Password Link - Made more prominent */}
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className={`block w-full text-center text-sm sm:text-base font-semibold hover:underline transition-colors ${
              isDarkMode ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-700'
            }`}
          >
            Forgot your password?
          </button>
          
          <p className={`text-xs sm:text-sm ${
            isDarkMode ? 'text-white/60' : 'text-gray-600'
          }`}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => {
                onClose();
                onShowRegistration?.();
              }}
              className="text-violet-400 hover:text-violet-300 font-semibold transition-colors"
            >
              Create one here
            </button>
          </p>
        </div>
      </div>
    </ModalReveal>
    
    {/* Forgot Password Modal */}
    <ForgotPasswordModal 
      isOpen={showForgotPassword}
      onClose={() => setShowForgotPassword(false)}
    />
  </>
  );
};

export default LoginModal; 